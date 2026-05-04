/**
 * orchestrator.ts — Phase 2 ML30 compile orchestrator (CLI entry).
 *
 * Reads a Phase 1 manifest.json, walks every case_NNNN.xml, runs the
 * frontend's Blockly→C++ generator headlessly, POSTs to the
 * arduino-compile-server `/api/compile`, and accumulates per-case results
 * into a `ResultStore` (results.jsonl + results.json + metadata.json).
 *
 * Concurrency is a fixed worker pool — `--parallel N` defaults to 4. A
 * `--noise-test` mode runs the first 10 cases at parallelism 1→2→3→4 with
 * loud stdout banners so the user can compare ML30 fan noise audibly.
 *
 * Usage:
 *   npx tsx scripts/probabilistic-debug/orchestrator.ts \
 *     --in scripts/probabilistic-debug-cases/<run-id> \
 *     --out scripts/probabilistic-debug-results/<run-id> \
 *     --parallel 3
 *
 *   npx tsx scripts/probabilistic-debug/orchestrator.ts \
 *     --in scripts/probabilistic-debug-cases/<run-id> --noise-test
 */

import './lib/blocks-bootstrap';

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { loadCatalog, catalogHash } from './lib/catalog';
import { xmlToCpp } from './lib/cpp-generator';
import { compileCpp } from './lib/compile-client';
import {
  ResultStore,
  generateRunId,
  type RunMetadata,
  type CaseResult,
  type CaseStage,
} from './lib/result-store';
import { fqbnFor } from './lib/board-fqbn';
import { processWithConcurrency } from './lib/concurrency';
import { selectSpotCases } from './lib/sampling';
import type { Manifest, ManifestEntry } from './lib/case-types';

// Re-export so existing imports from `./orchestrator` keep working
// (notably `orchestrator.test.ts` and any external scripts).
export { processWithConcurrency };

const DEFAULT_SERVER_URL = 'https://compile.digital-fab.jp';
const DEFAULT_PARALLEL = 4;
const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_CONNECTION_TYPE: 'ota' | 'usb' | 'ble' = 'ota';
const DEFAULT_STAGE: CaseStage = 'full';
const VALID_STAGES: ReadonlyArray<CaseStage> = ['full', 'code-gen', 'spot'];
const DEFAULT_SPOT_SAMPLE_SIZE = 80; // 16 ESP32 boards × 5 (post-56.md)
const VALID_BOARD_COVERAGE: ReadonlyArray<BoardCoverage> = ['all'];
const NOISE_TEST_PARALLELISMS = [1, 2, 3, 4];
const NOISE_TEST_CASES_PER_LEVEL = 10;
// Update cadence in non-verbose mode. 10 = ~100 updates over a 1000-case run,
// landing roughly one progress line every 90-120 s at 40s/case ÷ parallel 4.
const PROGRESS_TICK = 10;

/**
 * Stage 3 board-coverage selector. Currently only `'all'` is supported,
 * but the flag is reserved as an extensibility point (e.g., a future
 * `'m5stack-only'` would let a focused FS-course smoke skip the XIAO and
 * generic boards).
 */
export type BoardCoverage = 'all';

interface CliArgs {
  in: string;
  out?: string;
  parallel: number;
  verbose: boolean;
  noiseTest: boolean;
  serverUrl: string;
  connectionType: 'ota' | 'usb' | 'ble';
  timeoutMs: number;
  limit?: number;
  offset: number;
  stage: CaseStage;
  sampleSize?: number;
  boardCoverage: BoardCoverage;
}

export interface OrchestratorOptions {
  inDir: string;
  outDir: string;
  parallel: number;
  verbose: boolean;
  serverUrl: string;
  connectionType: 'ota' | 'usb' | 'ble';
  timeoutMs: number;
  /** Process only `limit` cases starting at `offset` (defaults to full manifest). */
  limit?: number;
  /** Skip the first `offset` cases of the manifest (default 0). */
  offset?: number;
  /**
   * 'full' (default) = roundtrip to compile-server.
   * 'code-gen' = 55.md Phase 4-1 generator-only mode; xmlToCpp() runs but
   * compileCpp() is skipped, so the entire 1000-case run can be evaluated
   * for generator throws / silent-empty fragments in ~5-10 min without ML30.
   * 'spot' = 55.md Phase 4-3 board-coverage sampled compile (default 80
   * cases = 16 boards × 5). Each case carries a unique tag injected into
   * `setupCode` to force compile-server cache miss, so every case is a
   * cold compile and the run actually exercises the lib_deps universe.
   */
  stage?: CaseStage;
  /** Stage 3 only: how many cases to sample (default 80). */
  sampleSize?: number;
  /** Stage 3 only: which boards to include (default 'all'). */
  boardCoverage?: BoardCoverage;
}

// --- CLI parsing -------------------------------------------------------

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

  // Defensive: reject `--stage` typos so a misspelled value never silently
  // falls back to 'full' (which would defeat the purpose of code-gen runs).
  const stageRaw = args.stage as CaseStage | undefined;
  const stage: CaseStage = stageRaw ?? DEFAULT_STAGE;
  if (!VALID_STAGES.includes(stage)) {
    process.stderr.write(
      `--stage "${stageRaw}" is not valid. Allowed: ${VALID_STAGES.join(' | ')}\n`,
    );
    printHelp();
    process.exit(1);
  }

  // Same defensive treatment for --board-coverage (Stage 3 only).
  const coverageRaw = args['board-coverage'] as BoardCoverage | undefined;
  const boardCoverage: BoardCoverage = coverageRaw ?? 'all';
  if (!VALID_BOARD_COVERAGE.includes(boardCoverage)) {
    process.stderr.write(
      `--board-coverage "${coverageRaw}" is not valid. Allowed: ${VALID_BOARD_COVERAGE.join(' | ')}\n`,
    );
    printHelp();
    process.exit(1);
  }

  return {
    in: args.in,
    out: args.out,
    parallel: args.parallel ? Number.parseInt(args.parallel, 10) : DEFAULT_PARALLEL,
    verbose: args.verbose === 'true',
    noiseTest: args['noise-test'] === 'true',
    serverUrl: args['server-url'] ?? DEFAULT_SERVER_URL,
    connectionType:
      (args['connection-type'] as 'ota' | 'usb' | 'ble') ?? DEFAULT_CONNECTION_TYPE,
    timeoutMs: args['timeout-ms']
      ? Number.parseInt(args['timeout-ms'], 10)
      : DEFAULT_TIMEOUT_MS,
    limit: args.limit ? Number.parseInt(args.limit, 10) : undefined,
    offset: args.offset ? Number.parseInt(args.offset, 10) : 0,
    stage,
    sampleSize: args['sample-size']
      ? Number.parseInt(args['sample-size'], 10)
      : undefined,
    boardCoverage,
  };
}

function printHelp(): void {
  process.stdout.write(
    `orchestrator.ts — Phase 2 ML30 compile orchestrator (43.md §5.2)

  --in <dir>             Cases directory (must contain manifest.json + case_NNNN.xml)
  --out <dir>            Results directory (default: scripts/probabilistic-debug-results/<runId>)
  --parallel N           Worker pool size (default ${DEFAULT_PARALLEL})
  --verbose              Log every case (default: progress every ${PROGRESS_TICK})
  --noise-test           Run ${NOISE_TEST_CASES_PER_LEVEL} cases at parallel ${NOISE_TEST_PARALLELISMS.join('/')} sequentially for ML30 fan-noise audition
  --server-url URL       arduino-compile-server URL (default ${DEFAULT_SERVER_URL})
  --connection-type T    'ota' | 'usb' | 'ble' (default ${DEFAULT_CONNECTION_TYPE})
  --timeout-ms N         Per-case compile timeout (default ${DEFAULT_TIMEOUT_MS})
  --limit N              Process only N cases (combine with --offset to slice a window)
  --offset N             Skip the first N cases of the manifest (default 0)
  --stage MODE           '${VALID_STAGES.join(' | ')}' (default '${DEFAULT_STAGE}').
                         'code-gen' skips the compile-server roundtrip and judges
                         each case on whether xmlToCpp() returns non-empty
                         fragments (55.md Phase 4-1 — fast bootstrap-import audit).
                         'spot' samples a board × strategy spread (default
                         ${DEFAULT_SPOT_SAMPLE_SIZE} cases, 16 boards × 5) and forces a cold compile
                         per case via a unique-tag setupCode comment (55.md
                         Phase 4-3 — board-coverage real-compile sweep).
  --sample-size N        Stage 3 only: total cases to sample (default ${DEFAULT_SPOT_SAMPLE_SIZE}).
  --board-coverage MODE  Stage 3 only: '${VALID_BOARD_COVERAGE.join(' | ')}' (default 'all').
  --help                 Show this message
`,
  );
}

// --- Core orchestration ------------------------------------------------

async function processCase(
  entry: ManifestEntry,
  inDir: string,
  serverUrl: string,
  connectionType: 'ota' | 'usb' | 'ble',
  timeoutMs: number,
  stage: CaseStage,
  uniqueTag?: string,
): Promise<CaseResult> {
  const xmlPath = path.join(inDir, entry.fileName);
  const start = Date.now();
  try {
    const xml = fs.readFileSync(xmlPath, 'utf-8');
    let fragments = xmlToCpp(xml);

    // Stage 3 (spot): inject a per-case comment into setupCode so the
    // compile-server cache key (cache.ts:27 hashes the injectedSource)
    // changes for every case in this run, forcing a real cold compile.
    // The comment is stripped at preprocess time, so firmware behaviour
    // is unchanged. setupCode is always present in `xmlToCpp` output, so
    // this is the safest fragment to mutate.
    if (stage === 'spot' && uniqueTag) {
      fragments = {
        ...fragments,
        setupCode: `  // stage3-${uniqueTag}\n${fragments.setupCode}`,
      };
    }

    if (stage === 'code-gen') {
      // 55.md Phase 4-1: validate that xmlToCpp produced something. A
      // generator with all four fragments empty is a silent failure — usually
      // a missing block import in `lib/blocks-bootstrap.ts` that prevents
      // Blockly from building the workspace at all. Treat it as FAIL so the
      // bootstrap-audit purpose of the code-gen stage isn't bypassed.
      const allEmpty =
        !fragments.includes &&
        !fragments.globals &&
        !fragments.setupCode &&
        !fragments.loopCode;
      return {
        caseId: entry.id,
        strategy: entry.strategy,
        mode: entry.mode,
        boardId: entry.boardId,
        blocksUsed: entry.blocksUsed,
        ok: !allEmpty,
        durationMs: Date.now() - start,
        error: allEmpty
          ? 'code-gen: all 4 fragments empty (generator silent fail)'
          : undefined,
        stage,
      };
    }

    const fqbn = fqbnFor(entry.boardId);
    const compileResult = await compileCpp(fragments, {
      serverUrl,
      board: fqbn,
      connectionType,
      timeoutMs,
    });
    return {
      caseId: entry.id,
      strategy: entry.strategy,
      mode: entry.mode,
      boardId: entry.boardId,
      blocksUsed: entry.blocksUsed,
      ok: compileResult.ok,
      durationMs: compileResult.durationMs,
      status: compileResult.status,
      error: compileResult.error,
      stderr: compileResult.stderr,
      retryUsed: compileResult.retryUsed,
      stage,
    };
  } catch (e) {
    return {
      caseId: entry.id,
      strategy: entry.strategy,
      mode: entry.mode,
      boardId: entry.boardId,
      blocksUsed: entry.blocksUsed,
      ok: false,
      durationMs: Date.now() - start,
      error: `pre-compile error: ${(e as Error).message}`,
      stage,
    };
  }
}

export async function runOrchestrator(opts: OrchestratorOptions): Promise<void> {
  const manifestPath = path.join(opts.inDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }
  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, 'utf-8'),
  ) as Manifest;

  const stage: CaseStage = opts.stage ?? DEFAULT_STAGE;

  // Stage 3 sampling pre-empts offset/limit slicing — the spec says to
  // pick a board × strategy spread out of the whole manifest, not the
  // first N entries. offset/limit only applies to 'full' / 'code-gen'.
  let cases: ManifestEntry[];
  if (stage === 'spot') {
    const sampleSize = opts.sampleSize ?? DEFAULT_SPOT_SAMPLE_SIZE;
    cases = selectSpotCases(manifest, { sampleSize });
  } else {
    const offset = opts.offset ?? 0;
    const end =
      opts.limit !== undefined ? offset + opts.limit : manifest.cases.length;
    cases = manifest.cases.slice(offset, end);
  }

  const catalog = loadCatalog();
  const metadata: RunMetadata = {
    runId: generateRunId(),
    startedAt: new Date().toISOString(),
    parallelism: opts.parallel,
    catalogHash: catalogHash(catalog),
    catalogBlockCount: catalog.blocks.length,
    generatorVersion: getGitSha(),
    inputManifestPath: manifestPath,
    serverUrl: opts.serverUrl,
    expectedCount: cases.length,
  };

  const store = new ResultStore(opts.outDir, metadata);

  const startTime = Date.now();
  const stageBanner =
    stage === 'code-gen'
      ? ' (generator-only, no compile)'
      : stage === 'spot'
        ? ` (spot sample, sample-size=${opts.sampleSize ?? DEFAULT_SPOT_SAMPLE_SIZE}, unique-tag cold compile)`
        : '';
  process.stdout.write(
    `▶︎ Run ${metadata.runId}: ${cases.length} cases × parallel=${opts.parallel}${stageBanner}\n` +
      (stage !== 'code-gen' ? `  Server: ${opts.serverUrl}\n` : '') +
      `  Results: ${opts.outDir}\n`,
  );

  await processWithConcurrency(cases, opts.parallel, async (entry) => {
    const uniqueTag =
      stage === 'spot' ? `${metadata.runId}-${entry.id}` : undefined;
    const result = await processCase(
      entry,
      opts.inDir,
      opts.serverUrl,
      opts.connectionType,
      opts.timeoutMs,
      stage,
      uniqueTag,
    );
    store.append(result);

    const completed = store.count;
    const shouldLog =
      opts.verbose ||
      completed % PROGRESS_TICK === 0 ||
      completed === cases.length;
    if (shouldLog) {
      const elapsed = (Date.now() - startTime) / 1000;
      const secPerCase = elapsed / completed;
      const remaining = cases.length - completed;
      const etaSec = secPerCase * remaining;
      const passRate = ((store.passCount / completed) * 100).toFixed(1);
      const flag = result.ok ? '✓' : '✗';
      const counter = `${String(completed).padStart(String(cases.length).length, ' ')}/${cases.length}`;
      process.stdout.write(
        `[${counter}] ${flag} ${result.caseId} [${result.strategy}] ` +
          `${result.boardId} | ` +
          `pass=${store.passCount}/${completed} (${passRate}%) | ` +
          `sec/case=${secPerCase.toFixed(1)}s | ` +
          `ETA ${formatDuration(etaSec)}\n`,
      );
    }
  });

  const combined = store.finalize();
  const summary = combined.summary;
  const totalSec = (Date.now() - startTime) / 1000;
  process.stdout.write(
    `\n✅ Done: ${summary.total} cases in ${totalSec.toFixed(1)}s ` +
      `(parallel=${opts.parallel}, sec/case=${(totalSec / Math.max(1, summary.total)).toFixed(1)})\n` +
      `   Pass: ${summary.pass} (${(summary.passRate * 100).toFixed(1)}%)\n` +
      `   Fail: ${summary.fail}\n` +
      `   Output: ${opts.outDir}\n`,
  );
}

// --- Noise test mode ---------------------------------------------------

async function runNoiseTest(args: CliArgs): Promise<void> {
  const manifestPath = path.join(args.in, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
  const subset = manifest.cases.slice(0, NOISE_TEST_CASES_PER_LEVEL);

  process.stdout.write(
    `\n🔊 Noise test mode — ${subset.length} cases × parallel ${NOISE_TEST_PARALLELISMS.join('/')} sequential\n` +
      `   Listen to ML30 fan noise. The script announces each parallelism level loudly before starting.\n`,
  );

  const baseOut =
    args.out ?? `scripts/probabilistic-debug-results/${generateRunId()}-noise`;
  const measurements: { parallel: number; totalMs: number; secPerCase: number; passRate: number }[] =
    [];

  for (const parallel of NOISE_TEST_PARALLELISMS) {
    const phaseLabel = `parallel=${parallel}`;
    process.stdout.write(
      `\n${'='.repeat(60)}\n` +
        `🔊 NOW RUNNING: ${phaseLabel} (${subset.length} cases)\n` +
        `   Listen now. Press Ctrl-C to abort if too loud.\n` +
        `${'='.repeat(60)}\n`,
    );
    const start = Date.now();
    const phaseOut = path.join(baseOut, `parallel-${parallel}`);
    await runOrchestrator({
      inDir: args.in,
      outDir: phaseOut,
      parallel,
      verbose: false,
      serverUrl: args.serverUrl,
      connectionType: args.connectionType,
      timeoutMs: args.timeoutMs,
      limit: subset.length,
    });
    const totalMs = Date.now() - start;
    const passRate = readPassRate(phaseOut);
    measurements.push({
      parallel,
      totalMs,
      secPerCase: totalMs / 1000 / subset.length,
      passRate,
    });
  }

  process.stdout.write(`\n📊 Noise test summary:\n`);
  for (const m of measurements) {
    process.stdout.write(
      `  parallel=${m.parallel}: ${(m.totalMs / 1000).toFixed(1)}s total, ` +
        `${m.secPerCase.toFixed(1)}s/case, pass ${(m.passRate * 100).toFixed(0)}%\n`,
    );
  }
  process.stdout.write(
    `\nNow tell the user the noise judgement and pick a parallelism for the full run.\n`,
  );
}

function readPassRate(outDir: string): number {
  try {
    const combined = JSON.parse(
      fs.readFileSync(path.join(outDir, 'results.json'), 'utf-8'),
    );
    return combined.summary.passRate ?? 0;
  } catch {
    return 0;
  }
}

// --- Helpers -----------------------------------------------------------

/** Human-readable duration for ETA: "3h 14m", "42m 18s", "47s". */
function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '–';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function getGitSha(): string | null {
  try {
    return (
      execSync('git rev-parse --short HEAD', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim() || null
    );
  } catch {
    return null;
  }
}

function defaultOutDir(args: CliArgs): string {
  if (args.out) return args.out;
  return path.join('scripts', 'probabilistic-debug-results', generateRunId());
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.noiseTest) {
    await runNoiseTest(args);
    return;
  }
  await runOrchestrator({
    inDir: args.in,
    outDir: defaultOutDir(args),
    parallel: args.parallel,
    verbose: args.verbose,
    serverUrl: args.serverUrl,
    connectionType: args.connectionType,
    timeoutMs: args.timeoutMs,
    limit: args.limit,
    offset: args.offset,
    stage: args.stage,
    sampleSize: args.sampleSize,
    boardCoverage: args.boardCoverage,
  });
}

// Detect CLI invocation. `process.argv[1]` differs between tsx (script path)
// and vite-node (vite-node binary), so we look for orchestrator-specific
// flags as the reliable signal. Tests never pass these flags to the runner.
const looksLikeOrchestratorCli =
  process.argv.includes('--in') ||
  process.argv.includes('--help') ||
  process.argv.includes('-h') ||
  process.argv.includes('--noise-test');
if (looksLikeOrchestratorCli) {
  main().catch((err) => {
    process.stderr.write(`${(err as Error).stack ?? err}\n`);
    process.exit(1);
  });
}
