/**
 * render-report.ts — Phase 3 CLI: results.json (+ optional failures.json) → Markdown report.
 *
 * Produces the §5.3.3 report: summary, trend (vs auto-picked baseline), per
 * mode/board/block breakdowns, failure clusters, and catalog version metadata.
 *
 * Usage:
 *   npx vite-node scripts/probabilistic-debug/render-report.ts -- \
 *     --run scripts/probabilistic-debug-results/<run-id>
 *
 *   --baseline <run-dir>   Override auto-detected baseline (must match catalog hash).
 *   --out <path>           Override default report path.
 */

import fs from 'fs';
import path from 'path';
import {
  clusterFailures,
  findBaselineRun,
  renderReport,
  type FailureCluster,
} from './lib/report-builder';
import type { CombinedResults, RunMetadata, RunSummary } from './lib/result-store';

const DEFAULT_REPORTS_ROOT = path.join('scripts', 'probabilistic-debug-reports');

interface CliArgs {
  run: string;
  out?: string;
  baseline?: string;
}

export interface RenderReportOptions {
  runDir: string;
  /** When omitted, the report goes to scripts/probabilistic-debug-reports/<runId>.md. */
  outPath?: string;
  /** When omitted, the most recent prior run with the same catalog hash is auto-selected. */
  baselineDir?: string;
  /** Where to look for prior runs when auto-selecting a baseline. Defaults to the parent of runDir. */
  resultsRoot?: string;
}

export interface RenderReportOutput {
  reportPath: string;
  baselineRunId: string | null;
  clusterCount: number;
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
  if (!args.run) {
    process.stderr.write('--run <run-dir> is required\n');
    printHelp();
    process.exit(1);
  }
  return { run: args.run, out: args.out, baseline: args.baseline };
}

function printHelp(): void {
  process.stdout.write(
    `render-report.ts — Phase 3 Markdown report renderer (43.md §5.3.3)

  --run <dir>        Run directory (must contain results.json; reads failures.json if present)
  --baseline <dir>   Optional: explicit baseline run directory (catalog hash must match)
  --out <path>       Optional: report output path (default scripts/probabilistic-debug-reports/<runId>.md)
  --help             Show this message
`,
  );
}

function loadFailures(runDir: string, results: CombinedResults['results']): FailureCluster[] {
  const failuresPath = path.join(runDir, 'failures.json');
  if (fs.existsSync(failuresPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(failuresPath, 'utf-8')) as {
        clusters?: FailureCluster[];
      };
      if (Array.isArray(parsed.clusters)) return parsed.clusters;
    } catch {
      // fall through to recompute
    }
  }
  return clusterFailures(results);
}

function loadBaseline(
  baselineDir: string,
  expectedCatalogHash: string,
): { runId: string; summary: RunSummary } | null {
  const file = path.join(baselineDir, 'results.json');
  if (!fs.existsSync(file)) return null;
  const combined = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
    metadata: RunMetadata;
    summary: RunSummary;
  };
  if (combined.metadata.catalogHash !== expectedCatalogHash) {
    process.stderr.write(
      `⚠️ baseline ${combined.metadata.runId} catalog hash mismatch (expected ${expectedCatalogHash}, got ${combined.metadata.catalogHash}). Skipping trend.\n`,
    );
    return null;
  }
  return { runId: combined.metadata.runId, summary: combined.summary };
}

export function buildReport(opts: RenderReportOptions): RenderReportOutput {
  const resultsPath = path.join(opts.runDir, 'results.json');
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`results.json not found at ${resultsPath}`);
  }
  const combined = JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) as CombinedResults;
  const clusters = loadFailures(opts.runDir, combined.results);

  const resultsRoot = opts.resultsRoot ?? path.dirname(path.resolve(opts.runDir));
  let baseline: { runId: string; summary: RunSummary } | null = null;
  if (opts.baselineDir) {
    baseline = loadBaseline(opts.baselineDir, combined.metadata.catalogHash);
  } else {
    const auto = findBaselineRun(resultsRoot, combined.metadata.runId, combined.metadata.catalogHash);
    if (auto) baseline = { runId: auto.metadata.runId, summary: auto.summary };
  }

  const md = renderReport({
    metadata: combined.metadata,
    summary: combined.summary,
    results: combined.results,
    clusters,
    baseline,
  });

  const outPath = opts.outPath ?? path.join(DEFAULT_REPORTS_ROOT, `${combined.metadata.runId}.md`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md);

  return {
    reportPath: outPath,
    baselineRunId: baseline?.runId ?? null,
    clusterCount: clusters.length,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const out = buildReport({
    runDir: args.run,
    outPath: args.out,
    baselineDir: args.baseline,
  });
  const baselineLine = out.baselineRunId
    ? `   Baseline: ${out.baselineRunId}\n`
    : `   Baseline: (none — first run for this catalog hash)\n`;
  process.stdout.write(
    `✅ Wrote ${out.reportPath}\n` + baselineLine + `   Clusters: ${out.clusterCount}\n`,
  );
}

const looksLikeCli =
  process.argv.includes('--run') ||
  process.argv.includes('--help') ||
  process.argv.includes('-h');
if (looksLikeCli) {
  main().catch((err) => {
    process.stderr.write(`${(err as Error).stack ?? err}\n`);
    process.exit(1);
  });
}
