/**
 * generate-cases.ts — Phase 1 use-case generator (CLI entry).
 *
 * Walks the catalog and emits 1000 deterministic Blockly XML cases across
 * six strategies (Singleton 421 + Edge 86 + Matrix 100 + Pair 178 + Template 200 + Combo 15).
 * singleton bucket is sized as catalog.size + small buffer to keep the
 * "every catalog block is hit by singleton" invariant as the catalog grows.
 * Output is a directory of `case_NNNN.xml` files plus `manifest.json`.
 *
 * Usage:
 *   npx tsx scripts/probabilistic-debug/generate-cases.ts \
 *     --out scripts/probabilistic-debug-cases/<run-id> \
 *     --count 1000 --seed 42
 *
 * Smoke run:
 *   npx tsx scripts/probabilistic-debug/generate-cases.ts --count 100
 *
 * The `seed` is reserved for future randomized strategies; current strategies
 * are deterministic (catalog order + recipe order).
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { loadCatalog, catalogHash } from './lib/catalog';
import type { GeneratedCase, Manifest, ManifestEntry } from './lib/case-types';
import { generateSingletonCases } from './lib/strategies/singleton';
import { generateEdgeCases } from './lib/strategies/edge';
import { generateMatrixCases } from './lib/strategies/matrix';
import { generatePairCases } from './lib/strategies/pair';
import { generateTemplateCases } from './lib/strategies/template';
import { generateComboCases } from './lib/strategies/combo';

interface CliArgs {
  out: string;
  count: number;
  seed: number;
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

  const count = args.count !== undefined ? Number.parseInt(args.count, 10) : 1000;
  const seed = args.seed !== undefined ? Number.parseInt(args.seed, 10) : 42;
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`Invalid --count: "${args.count}"`);
  }
  if (!Number.isFinite(seed)) {
    throw new Error(`Invalid --seed: "${args.seed}"`);
  }
  const out = args.out ?? defaultOutDir();
  return { out, count, seed };
}

function defaultOutDir(): string {
  const now = new Date();
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
  const stamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return path.join('scripts', 'probabilistic-debug-cases', stamp);
}

function printHelp(): void {
  process.stdout.write(
    `generate-cases.ts — Phase 1 use-case generator (43.md)

  --out <dir>     Output directory (default: scripts/probabilistic-debug-cases/<timestamp>)
  --count <N>     Total cases to emit (default: 1000)
  --seed <N>      Reserved for future randomized strategies (default: 42)
  --help          Show this message

Strategy allocation (count=1000): singleton=421 edge=86 matrix=100 pair=178 template=200 combo=15.
For non-1000 counts the allocation is scaled proportionally.
`,
  );
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

interface StrategyAllocation {
  singleton: number;
  edge: number;
  matrix: number;
  pair: number;
  template: number;
  combo: number;
}

// 47.md Phase 2 commit #0 (2026-05-XX): catalog grew 412 → 419 with 7 new
// websocket_server_* blocks. singleton bucket bumped from 414 → 421 (catalog
// size + 2 buffer) so the "singleton hits every catalog block" test invariant
// stays satisfied. Compensated by reducing pair (185 → 178), keeping the total
// at 1000 cases. Pair is the next-largest bucket and the marginal contribution
// of the dropped 7 cases is negligible (Round 2 passRate 90.4% baseline).
//
// 51.md Phase A+B commit #4-A〜#6-A (2026-05-04 第78-79回): catalog 419 → 437 で
// azure_iot 9 + iot_cloud 6 + sht30 3 = 18 ブロック追加。
// singleton 421 → 439 (catalog +2 buffer)、pair 178 → 160 で総数 1000 維持。
// 51.md 残コミット (sessions 2 = #6-B〜#12-D / session 3) でも同 pattern で bump。
//
// 52.md commit #3-#11 (2026-05-04 第80回): catalog 492 → 531 で
// Phase C+D 33 + 強推奨 LoRa 6 = 39 ブロック追加。
// singleton 494 → 533 (+39)、pair 105 → 66 (-39) で総数 1000 維持。
const FULL_ALLOCATION: StrategyAllocation = {
  singleton: 533,
  edge: 86,
  matrix: 100,
  pair: 66,
  template: 200,
  combo: 15,
};

export function allocate(count: number): StrategyAllocation {
  if (count === 1000) return { ...FULL_ALLOCATION };
  const total = 1000;
  const alloc: StrategyAllocation = {
    singleton: Math.floor((count * FULL_ALLOCATION.singleton) / total),
    edge: Math.floor((count * FULL_ALLOCATION.edge) / total),
    matrix: Math.floor((count * FULL_ALLOCATION.matrix) / total),
    pair: Math.floor((count * FULL_ALLOCATION.pair) / total),
    template: Math.floor((count * FULL_ALLOCATION.template) / total),
    combo: Math.floor((count * FULL_ALLOCATION.combo) / total),
  };
  // Floor leaves a remainder; bump singleton (largest bucket) to absorb it.
  const used =
    alloc.singleton +
    alloc.edge +
    alloc.matrix +
    alloc.pair +
    alloc.template +
    alloc.combo;
  alloc.singleton += count - used;
  return alloc;
}

export interface RunResult {
  cases: GeneratedCase[];
  alloc: StrategyAllocation;
}

export function buildAllCases(count: number): RunResult {
  const catalog = loadCatalog();
  const alloc = allocate(count);
  const cases: GeneratedCase[] = [];
  let seq = 1;

  if (alloc.singleton > 0) {
    const out = generateSingletonCases(catalog, { startIndex: seq });
    const sliced = out.slice(0, alloc.singleton);
    cases.push(...sliced);
    seq += sliced.length;
  }
  if (alloc.edge > 0) {
    const out = generateEdgeCases(catalog, { startIndex: seq });
    const sliced = out.slice(0, alloc.edge);
    cases.push(...sliced);
    seq += sliced.length;
  }
  if (alloc.matrix > 0) {
    const out = generateMatrixCases(catalog, {
      startIndex: seq,
      maxCount: alloc.matrix,
    });
    cases.push(...out);
    seq += out.length;
  }
  if (alloc.pair > 0) {
    const out = generatePairCases(catalog, {
      startIndex: seq,
      maxCount: alloc.pair,
    });
    cases.push(...out);
    seq += out.length;
  }
  if (alloc.combo > 0) {
    const out = generateComboCases(catalog, {
      startIndex: seq,
      maxCount: alloc.combo,
    });
    cases.push(...out);
    seq += out.length;
  }
  // Template absorbs any shortfall from earlier strategies (pair/matrix/combo may
  // emit fewer than their nominal allocation when recipes hit the boundary).
  const elastic = Math.max(alloc.template, count - cases.length);
  if (elastic > 0) {
    const out = generateTemplateCases(catalog, {
      startIndex: seq,
      maxCount: elastic,
    });
    cases.push(...out);
    seq += out.length;
  }
  // Hard-cap at the requested count (template max may overshoot if elastic
  // grew past the realistic template ceiling).
  if (cases.length > count) cases.length = count;

  // Renumber to keep ids contiguous when a strategy emits fewer than allocated.
  cases.forEach((c, i) => {
    c.id = `case_${String(i + 1).padStart(4, '0')}`;
  });

  return { cases, alloc };
}

function writeOutput(args: CliArgs, result: RunResult): void {
  fs.mkdirSync(args.out, { recursive: true });
  const entries: ManifestEntry[] = [];
  for (const c of result.cases) {
    const fileName = `${c.id}.xml`;
    fs.writeFileSync(path.join(args.out, fileName), c.xml + '\n');
    entries.push({
      id: c.id,
      strategy: c.strategy,
      mode: c.mode,
      boardId: c.boardId,
      blocksUsed: c.blocksUsed,
      fileName,
    });
  }
  const catalog = loadCatalog();
  const manifest: Manifest = {
    generatorVersion: getGitSha(),
    catalogHash: catalogHash(catalog),
    catalogBlockCount: catalog.blocks.length,
    generatedAt: new Date().toISOString(),
    seed: args.seed,
    count: result.cases.length,
    cases: entries,
  };
  fs.writeFileSync(
    path.join(args.out, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  process.stdout.write(`Generating ${args.count} probabilistic-debug cases…\n`);
  process.stdout.write(`  Output: ${args.out}\n`);
  process.stdout.write(`  Seed:   ${args.seed}\n`);
  const result = buildAllCases(args.count);
  process.stdout.write(
    `  Strategy allocation: singleton=${result.alloc.singleton} edge=${result.alloc.edge} matrix=${result.alloc.matrix} pair=${result.alloc.pair} template=${result.alloc.template} combo=${result.alloc.combo}\n`,
  );
  process.stdout.write(`  Generated: ${result.cases.length} cases\n`);
  writeOutput(args, result);
  process.stdout.write(
    `✅ Wrote ${result.cases.length} cases + manifest.json to ${args.out}\n`,
  );
}

// Run when invoked directly. tsx assigns `process.argv[1]` to the resolved file.
const invokedDirectly =
  typeof process.argv[1] === 'string' && process.argv[1].endsWith('generate-cases.ts');
if (invokedDirectly) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`${(err as Error).stack ?? err}\n`);
    process.exit(1);
  }
}
