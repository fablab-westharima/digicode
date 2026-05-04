/**
 * stage2-validate-fragments.ts — 55.md Phase 4-tooling Stage 2.
 *
 * Independent TS-side fragment validity check. Reads a Phase 1 cases
 * directory (manifest.json + case_NNNN.xml), runs the headless Blockly→C++
 * generator (`xmlToCpp`) per case, and applies four lightweight checks
 * before the heavy compile-server roundtrip in Stage 3 / 4:
 *
 *   1. brace balance — `{` count == `}` count in setupCode + loopCode
 *   2. include format — every non-empty line of `includes` matches
 *      `^#include\s+[<"].*[>"]\s*$`
 *   3. placeholder noise — fullCode does not contain `undefined` / `null` /
 *      `[object Object]` / `NaN` / `function ()` literals (generator-bug
 *      signatures of unresolved JS-side state leaking into the C++ output)
 *   4. empty wrapping exception — an individual empty setupCode / loopCode
 *      is PASS (valid C++: `void setup() {}` is fine). The all-four-empty
 *      generator-silent-fail case is already caught by Stage 1's
 *      `--stage code-gen` mode (see orchestrator.ts).
 *
 * Output: a single `validation.json` with metadata + summary (per-check
 * counts) + failures (per-case detail). Wall is ~30 s for 1000 cases at
 * `--parallel 4`; no network / ML30 contention.
 *
 * Spec deviation note (Phase 6 must amend 55.md §2.6):
 *   55.md §2.6 example shows `--in <Stage-1 results.jsonl path>`, implying
 *   Stage 2 reads fragments straight out of Stage 1's jsonl. The current
 *   Stage 1 (`feat(probabilistic-debug): Stage 1 ...`, commit 45c4827) does
 *   not store fragments in `CaseResult` (would bloat jsonl by ~5 MB). To
 *   keep Stage 1 / 2 decoupled and individually re-runnable, Stage 2 reads
 *   the cases directory directly and re-runs `xmlToCpp` (cheap, ~50 ms per
 *   case headless). User-approved deviation (BUG-077-followup design review
 *   D-1, 2026-05-05). Phase 6 will amend 55.md §2.6 to reflect this.
 *
 * Usage:
 *   npx tsx scripts/probabilistic-debug/stage2-validate-fragments.ts \
 *     --in scripts/probabilistic-debug-cases/<run-id> \
 *     --out scripts/probabilistic-debug-results/<run-id>/validation.json \
 *     [--parallel N]
 */

import './lib/blocks-bootstrap';

import fs from 'fs';
import path from 'path';

import { xmlToCpp, type CompileFragments } from './lib/cpp-generator';
import { processWithConcurrency } from './lib/concurrency';
import type { Manifest, ManifestEntry } from './lib/case-types';

const DEFAULT_PARALLEL = 4;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CheckName =
  | 'braceBalance'
  | 'includeFormat'
  | 'placeholderNoise';

export interface CheckCounts {
  pass: number;
  fail: number;
}

export interface ValidationFailure {
  caseId: string;
  boardId: string;
  strategy: string;
  blocksUsed: string[];
  failedChecks: CheckName[];
  details: Record<string, unknown>;
}

export interface ValidationSummary {
  total: number;
  pass: number;
  fail: number;
  checks: Record<CheckName, CheckCounts>;
}

export interface ValidationMetadata {
  casesDir: string;
  validatedAt: string;
  parallelism: number;
  totalCases: number;
}

export interface ValidationReport {
  metadata: ValidationMetadata;
  summary: ValidationSummary;
  failures: ValidationFailure[];
}

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

const INCLUDE_LINE_RE = /^#include\s+[<"].*[>"]\s*$/;

// Word-boundary patterns so legitimate identifiers like `nullptr` or `Nullable`
// don't trigger false positives. `[object Object]` uses literal brackets.
const NOISE_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'undefined', re: /\bundefined\b/ },
  { name: 'null',      re: /\bnull\b/ },
  { name: 'objectObj', re: /\[object Object\]/ },
  { name: 'NaN',       re: /\bNaN\b/ },
  { name: 'function()', re: /\bfunction\s*\(\s*\)/ },
];

export function validateBraceBalance(
  setupCode: string,
  loopCode: string,
): { ok: boolean; setupOpen: number; setupClose: number; loopOpen: number; loopClose: number } {
  const setupOpen = (setupCode.match(/\{/g) ?? []).length;
  const setupClose = (setupCode.match(/\}/g) ?? []).length;
  const loopOpen = (loopCode.match(/\{/g) ?? []).length;
  const loopClose = (loopCode.match(/\}/g) ?? []).length;
  return {
    ok: setupOpen === setupClose && loopOpen === loopClose,
    setupOpen,
    setupClose,
    loopOpen,
    loopClose,
  };
}

export function validateIncludeFormat(includes: string): {
  ok: boolean;
  badLines: string[];
} {
  const lines = includes
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  const badLines = lines.filter((l) => !INCLUDE_LINE_RE.test(l));
  return { ok: badLines.length === 0, badLines };
}

export function validatePlaceholderNoise(fullCode: string): {
  ok: boolean;
  matches: string[];
} {
  const matches: string[] = [];
  for (const { name, re } of NOISE_PATTERNS) {
    if (re.test(fullCode)) matches.push(name);
  }
  return { ok: matches.length === 0, matches };
}

interface CaseValidation {
  failedChecks: CheckName[];
  details: Record<string, unknown>;
}

export function validateFragments(fragments: CompileFragments): CaseValidation {
  const failedChecks: CheckName[] = [];
  const details: Record<string, unknown> = {};

  const brace = validateBraceBalance(fragments.setupCode, fragments.loopCode);
  if (!brace.ok) {
    failedChecks.push('braceBalance');
    details.braceBalance = {
      setupOpen: brace.setupOpen,
      setupClose: brace.setupClose,
      loopOpen: brace.loopOpen,
      loopClose: brace.loopClose,
    };
  }

  const inc = validateIncludeFormat(fragments.includes);
  if (!inc.ok) {
    failedChecks.push('includeFormat');
    details.includeFormat = { badLines: inc.badLines };
  }

  const noise = validatePlaceholderNoise(fragments.fullCode);
  if (!noise.ok) {
    failedChecks.push('placeholderNoise');
    details.placeholderNoise = { patterns: noise.matches };
  }

  return { failedChecks, details };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface Stage2Options {
  inDir: string;
  outPath: string;
  parallel: number;
}

interface CaseProcessOutcome {
  failure: ValidationFailure | null;
  checkOks: Record<CheckName, boolean>;
  generatorThrew: boolean;
}

async function processOne(
  entry: ManifestEntry,
  inDir: string,
): Promise<CaseProcessOutcome> {
  const xmlPath = path.join(inDir, entry.fileName);
  try {
    const xml = fs.readFileSync(xmlPath, 'utf-8');
    const fragments = xmlToCpp(xml);
    const { failedChecks, details } = validateFragments(fragments);
    const checkOks: Record<CheckName, boolean> = {
      braceBalance: !failedChecks.includes('braceBalance'),
      includeFormat: !failedChecks.includes('includeFormat'),
      placeholderNoise: !failedChecks.includes('placeholderNoise'),
    };
    if (failedChecks.length === 0) {
      return { failure: null, checkOks, generatorThrew: false };
    }
    return {
      failure: {
        caseId: entry.id,
        boardId: entry.boardId,
        strategy: entry.strategy,
        blocksUsed: entry.blocksUsed,
        failedChecks,
        details,
      },
      checkOks,
      generatorThrew: false,
    };
  } catch (e) {
    // A generator throw is a Stage 1 concern; record it here as a fail of all
    // three checks (we couldn't run any of them) so the downstream count
    // reflects "this case had a problem in this stage too".
    return {
      failure: {
        caseId: entry.id,
        boardId: entry.boardId,
        strategy: entry.strategy,
        blocksUsed: entry.blocksUsed,
        failedChecks: ['braceBalance', 'includeFormat', 'placeholderNoise'],
        details: {
          generatorError: (e as Error).message,
        },
      },
      checkOks: {
        braceBalance: false,
        includeFormat: false,
        placeholderNoise: false,
      },
      generatorThrew: true,
    };
  }
}

export async function runStage2(opts: Stage2Options): Promise<ValidationReport> {
  const manifestPath = path.join(opts.inDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  ) as Manifest;

  const failures: ValidationFailure[] = [];
  const checks: Record<CheckName, CheckCounts> = {
    braceBalance: { pass: 0, fail: 0 },
    includeFormat: { pass: 0, fail: 0 },
    placeholderNoise: { pass: 0, fail: 0 },
  };
  let pass = 0;
  let fail = 0;

  await processWithConcurrency(manifest.cases, opts.parallel, async (entry) => {
    const outcome = await processOne(entry, opts.inDir);
    for (const name of ['braceBalance', 'includeFormat', 'placeholderNoise'] as const) {
      if (outcome.checkOks[name]) {
        checks[name].pass++;
      } else {
        checks[name].fail++;
      }
    }
    if (outcome.failure) {
      failures.push(outcome.failure);
      fail++;
    } else {
      pass++;
    }
  });

  // Sort failures by caseId for stable output.
  failures.sort((a, b) => a.caseId.localeCompare(b.caseId));

  const report: ValidationReport = {
    metadata: {
      casesDir: opts.inDir,
      validatedAt: new Date().toISOString(),
      parallelism: opts.parallel,
      totalCases: manifest.cases.length,
    },
    summary: {
      total: manifest.cases.length,
      pass,
      fail,
      checks,
    },
    failures,
  };

  fs.mkdirSync(path.dirname(opts.outPath), { recursive: true });
  fs.writeFileSync(opts.outPath, JSON.stringify(report, null, 2) + '\n');

  return report;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliArgs {
  in: string;
  out: string;
  parallel: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'help' || key === 'h') {
      printHelp();
      process.exit(0);
    }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[key] = next;
      i++;
    } else {
      args[key] = 'true';
    }
  }
  if (!args.in) {
    process.stderr.write('--in <cases-dir> is required\n');
    printHelp();
    process.exit(1);
  }
  if (!args.out) {
    process.stderr.write('--out <validation.json path> is required\n');
    printHelp();
    process.exit(1);
  }
  return {
    in: args.in,
    out: args.out,
    parallel: args.parallel ? Number.parseInt(args.parallel, 10) : DEFAULT_PARALLEL,
  };
}

function printHelp(): void {
  process.stdout.write(
    `stage2-validate-fragments.ts — 55.md Phase 4-tooling Stage 2

  --in <dir>     Cases directory (must contain manifest.json + case_NNNN.xml)
  --out <path>   Output validation.json path
  --parallel N   Worker pool size (default ${DEFAULT_PARALLEL})
  --help         Show this message
`,
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const startMs = Date.now();
  process.stdout.write(
    `▶︎ Stage 2 (validate-fragments): ${args.in} → ${args.out} × parallel=${args.parallel}\n`,
  );
  const report = await runStage2({
    inDir: args.in,
    outPath: args.out,
    parallel: args.parallel,
  });
  const wallSec = (Date.now() - startMs) / 1000;
  const { summary } = report;
  process.stdout.write(
    `\n✅ Done: ${summary.total} cases in ${wallSec.toFixed(1)}s ` +
      `(parallel=${args.parallel})\n` +
      `   Pass: ${summary.pass} (${summary.total === 0 ? 0 : ((summary.pass / summary.total) * 100).toFixed(1)}%)\n` +
      `   Fail: ${summary.fail}\n` +
      `   braceBalance:     pass=${summary.checks.braceBalance.pass}     fail=${summary.checks.braceBalance.fail}\n` +
      `   includeFormat:    pass=${summary.checks.includeFormat.pass}     fail=${summary.checks.includeFormat.fail}\n` +
      `   placeholderNoise: pass=${summary.checks.placeholderNoise.pass} fail=${summary.checks.placeholderNoise.fail}\n` +
      `   Output: ${args.out}\n`,
  );
}

const looksLikeStage2Cli =
  process.argv.includes('--in') ||
  process.argv.includes('--help') ||
  process.argv.includes('-h');
if (looksLikeStage2Cli) {
  main().catch((err) => {
    process.stderr.write(`${(err as Error).stack ?? err}\n`);
    process.exit(1);
  });
}
