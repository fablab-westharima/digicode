/**
 * analyze-failures.ts — Phase 3 CLI: results.json → failures.json.
 *
 * Reads the orchestrator's combined results.json, clusters every failure by
 * normalized error pattern + category, and writes failures.json next to it.
 *
 * Usage:
 *   npx vite-node scripts/probabilistic-debug/analyze-failures.ts -- \
 *     --run scripts/probabilistic-debug-results/<run-id>
 */

import fs from 'fs';
import path from 'path';
import { clusterFailures, type FailureAnalysis } from './lib/report-builder';
import type { CombinedResults } from './lib/result-store';

interface CliArgs {
  run: string;
}

export interface AnalyzeFailuresOptions {
  /** Absolute or relative path to a run directory containing results.json. */
  runDir: string;
}

export interface AnalyzeFailuresOutput {
  failuresPath: string;
  analysis: FailureAnalysis;
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
  return { run: args.run };
}

function printHelp(): void {
  process.stdout.write(
    `analyze-failures.ts — Phase 3 failure clusterer (43.md §5.3.1)

  --run <dir>   Run directory (must contain results.json)
  --help        Show this message

Output: <run-dir>/failures.json with categorized + clustered failures.
`,
  );
}

export function analyzeFailures(opts: AnalyzeFailuresOptions): AnalyzeFailuresOutput {
  const resultsPath = path.join(opts.runDir, 'results.json');
  if (!fs.existsSync(resultsPath)) {
    throw new Error(`results.json not found at ${resultsPath}`);
  }
  const combined = JSON.parse(fs.readFileSync(resultsPath, 'utf-8')) as CombinedResults;
  const clusters = clusterFailures(combined.results);
  const totalFail = combined.results.filter((r) => !r.ok).length;
  const analysis: FailureAnalysis = {
    totalFail,
    clusterCount: clusters.length,
    clusters,
  };
  const failuresPath = path.join(opts.runDir, 'failures.json');
  const payload = {
    metadata: combined.metadata,
    summary: { totalFail, clusterCount: clusters.length },
    clusters,
  };
  fs.writeFileSync(failuresPath, JSON.stringify(payload, null, 2) + '\n');
  return { failuresPath, analysis };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const out = analyzeFailures({ runDir: args.run });
  process.stdout.write(
    `✅ Wrote ${out.failuresPath}\n` +
      `   ${out.analysis.totalFail} failures across ${out.analysis.clusterCount} clusters.\n`,
  );
  if (out.analysis.clusters.length > 0) {
    process.stdout.write(`   Top cluster: "${out.analysis.clusters[0].pattern}" (count: ${out.analysis.clusters[0].count})\n`);
  }
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
