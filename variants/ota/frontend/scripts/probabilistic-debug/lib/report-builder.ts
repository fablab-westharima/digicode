/**
 * report-builder.ts — Phase 3 helpers (43.md §5.3).
 *
 * Pure functions for clustering compile failures and rendering the Phase 3
 * Markdown report. Kept free of CLI / fs concerns so the unit tests can
 * exercise them without temp directories.
 *
 * Cluster key strategy (judgement B in the design review):
 *   prefer the first `error:` line of `stderr` over `error`, since PIO compile
 *   errors carry detail in stderr while `error` is a short label.
 */

import fs from 'fs';
import path from 'path';
import type { CaseResult, RunMetadata, RunSummary } from './result-store';

export type FailureCategory = 'compile' | 'server-error' | 'timeout' | 'pre-compile';

export interface FailureCluster {
  pattern: string;
  category: FailureCategory;
  count: number;
  examples: string[];
  affectedBlocks: string[];
  affectedModes: string[];
  affectedBoards: string[];
}

export interface FailureAnalysis {
  totalFail: number;
  clusterCount: number;
  clusters: FailureCluster[];
}

export interface RateBreakdown {
  total: number;
  pass: number;
}

const EXAMPLE_LIMIT = 5;
const BY_BLOCK_LOWEST_LIMIT = 10;
const BY_BLOCK_MIN_TOTAL = 5;

// --- Categorization + cluster key extraction -------------------------------

export function categorize(r: CaseResult): FailureCategory {
  const err = r.error ?? '';
  if (err.startsWith('pre-compile error')) return 'pre-compile';
  if (err.startsWith('timeout after')) return 'timeout';
  if (r.status === undefined) return 'server-error';
  if (r.status >= 500) return 'server-error';
  return 'compile';
}

/**
 * Pull the first `error:` line out of a g++/PIO log. Returns the message
 * after the `error:` keyword, or null if no such line exists.
 */
export function extractFirstErrorLine(text: string): string | null {
  const lines = text.split('\n');
  for (const line of lines) {
    const m = /error:\s*(.+?)\s*$/.exec(line);
    if (m && m[1]) return m[1];
  }
  return null;
}

/** Normalize a cluster pattern: collapse whitespace, strip absolute temp paths. */
export function normalizeError(text: string): string {
  return text
    .replace(/\/opt\/digicode-compile\/projects\/[^/]+\/src\/[^:\s]+/g, '<main.ino>')
    .replace(/\/tmp\/[^\s:]+/g, '<tmp>')
    .replace(/:\d+:\d+:/g, ':L:C:')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clusterKey(r: CaseResult): { pattern: string; category: FailureCategory } {
  const category = categorize(r);
  let pattern: string;
  switch (category) {
    case 'compile': {
      const text = r.stderr ?? r.error ?? '';
      const line = extractFirstErrorLine(text);
      pattern = line ? normalizeError(line) : '(unparseable compile error)';
      break;
    }
    case 'server-error':
      pattern = r.status === undefined ? 'network/transport failure' : `HTTP ${r.status}`;
      break;
    case 'timeout':
      pattern = 'compile timeout';
      break;
    case 'pre-compile':
      pattern = (r.error ?? '').replace(/^pre-compile error:\s*/, '').slice(0, 120) || 'pre-compile error';
      break;
  }
  return { pattern, category };
}

// --- Clustering ------------------------------------------------------------

export function clusterFailures(results: CaseResult[]): FailureCluster[] {
  const failures = results.filter((r) => !r.ok);
  const buckets = new Map<
    string,
    {
      pattern: string;
      category: FailureCategory;
      caseIds: string[];
      blocks: Set<string>;
      modes: Set<string>;
      boards: Set<string>;
    }
  >();

  for (const r of failures) {
    const { pattern, category } = clusterKey(r);
    const key = `${category}::${pattern}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        pattern,
        category,
        caseIds: [],
        blocks: new Set(),
        modes: new Set(),
        boards: new Set(),
      };
      buckets.set(key, bucket);
    }
    bucket.caseIds.push(r.caseId);
    for (const b of r.blocksUsed) bucket.blocks.add(b);
    bucket.modes.add(r.mode);
    bucket.boards.add(r.boardId);
  }

  const clusters: FailureCluster[] = [...buckets.values()].map((b) => ({
    pattern: b.pattern,
    category: b.category,
    count: b.caseIds.length,
    examples: b.caseIds.slice(0, EXAMPLE_LIMIT),
    affectedBlocks: [...b.blocks].sort(),
    affectedModes: [...b.modes].sort(),
    affectedBoards: [...b.boards].sort(),
  }));

  clusters.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.pattern.localeCompare(b.pattern);
  });
  return clusters;
}

// --- Aggregation -----------------------------------------------------------

function aggregateBy<K>(
  results: CaseResult[],
  keyFn: (r: CaseResult) => K | K[],
): Map<K, RateBreakdown> {
  const out = new Map<K, RateBreakdown>();
  for (const r of results) {
    const keys = keyFn(r);
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      const cur = out.get(k) ?? { total: 0, pass: 0 };
      cur.total += 1;
      if (r.ok) cur.pass += 1;
      out.set(k, cur);
    }
  }
  return out;
}

export function aggregateByMode(results: CaseResult[]): Map<string, RateBreakdown> {
  return aggregateBy(results, (r) => r.mode);
}

export function aggregateByBoard(results: CaseResult[]): Map<string, RateBreakdown> {
  return aggregateBy(results, (r) => r.boardId);
}

export function aggregateByBlock(results: CaseResult[]): Map<string, RateBreakdown> {
  return aggregateBy(results, (r) => r.blocksUsed);
}

// --- Baseline lookup -------------------------------------------------------

/**
 * Find the most recent prior run (lex-sorted directory name == chronological)
 * with the same catalog hash, ignoring the current run. Returns the absolute
 * path or null when no match exists.
 */
export function findBaselineRun(
  resultsRoot: string,
  currentRunId: string,
  currentCatalogHash: string,
): { runDir: string; metadata: RunMetadata; summary: RunSummary } | null {
  if (!fs.existsSync(resultsRoot)) return null;
  const entries = fs
    .readdirSync(resultsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== currentRunId)
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const name of entries) {
    const dir = path.join(resultsRoot, name);
    const combinedPath = path.join(dir, 'results.json');
    if (!fs.existsSync(combinedPath)) continue;
    try {
      const combined = JSON.parse(fs.readFileSync(combinedPath, 'utf-8')) as {
        metadata: RunMetadata;
        summary: RunSummary;
      };
      if (combined.metadata?.catalogHash === currentCatalogHash) {
        return { runDir: dir, metadata: combined.metadata, summary: combined.summary };
      }
    } catch {
      // malformed file, skip
    }
  }
  return null;
}

// --- Markdown rendering ----------------------------------------------------

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtRate(b: RateBreakdown): string {
  if (b.total === 0) return '–';
  return `${fmtPct(b.pass / b.total)}`;
}

function fmtMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '–';
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function renderSummarySection(args: {
  summary: RunSummary;
  baselineSummary?: RunSummary;
  baselineRunId?: string;
}): string {
  const { summary, baselineSummary, baselineRunId } = args;
  const lines = [
    '## Summary',
    `- Total cases: ${summary.total}`,
    `- Passed: ${summary.pass} (${fmtPct(summary.passRate)})`,
    `- Failed: ${summary.fail}`,
    `- Mean compile duration: ${fmtMs(summary.meanDurationMs)}`,
  ];
  lines.push('');
  if (baselineSummary && baselineRunId) {
    const deltaPp = (summary.passRate - baselineSummary.passRate) * 100;
    const flag = deltaPp >= 0 ? '✅ improvement' : '⚠️ regression';
    const sign = deltaPp >= 0 ? '+' : '';
    lines.push(
      '## Trend',
      `- Baseline run: \`${baselineRunId}\` (pass rate ${fmtPct(baselineSummary.passRate)})`,
      `- Delta: ${sign}${deltaPp.toFixed(1)}pp ${flag}`,
      '',
    );
  } else {
    lines.push(
      '## Trend',
      '- No prior run with the same catalog hash — trend comparison skipped.',
      '',
    );
  }
  return lines.join('\n');
}

function renderTable(headers: string[], rows: string[][]): string {
  const sep = headers.map(() => '---');
  const out = [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ];
  return out.join('\n');
}

function sortedBreakdown(map: Map<string, RateBreakdown>): { name: string; b: RateBreakdown }[] {
  return [...map.entries()]
    .map(([name, b]) => ({ name, b }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function renderBreakdownSection(
  byMode: Map<string, RateBreakdown>,
  byBoard: Map<string, RateBreakdown>,
  byBlock: Map<string, RateBreakdown>,
): string {
  const lines: string[] = ['## Pass rate breakdown', ''];

  lines.push('### By mode', '');
  if (byMode.size === 0) {
    lines.push('_(empty)_', '');
  } else {
    const rows = sortedBreakdown(byMode).map(({ name, b }) => [
      name,
      String(b.total),
      String(b.pass),
      fmtRate(b),
    ]);
    lines.push(renderTable(['mode', 'total', 'passed', 'rate'], rows), '');
  }

  lines.push('### By board', '');
  if (byBoard.size === 0) {
    lines.push('_(empty)_', '');
  } else {
    const rows = sortedBreakdown(byBoard).map(({ name, b }) => [
      name,
      String(b.total),
      String(b.pass),
      fmtRate(b),
    ]);
    lines.push(renderTable(['board', 'total', 'passed', 'rate'], rows), '');
  }

  lines.push(
    `### By block (lowest ${BY_BLOCK_LOWEST_LIMIT}, total ≥ ${BY_BLOCK_MIN_TOTAL})`,
    '',
    `Each block listed counts cases that include it among \`blocksUsed\`. ` +
      `A low rate flags blocks that compile poorly when combined with whatever else they appear with.`,
    '',
  );
  const filtered = [...byBlock.entries()]
    .filter(([, b]) => b.total >= BY_BLOCK_MIN_TOTAL)
    .map(([name, b]) => ({ name, b, rate: b.pass / b.total }))
    .sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name))
    .slice(0, BY_BLOCK_LOWEST_LIMIT);
  if (filtered.length === 0) {
    lines.push('_(no block has ≥ ' + BY_BLOCK_MIN_TOTAL + ' samples)_', '');
  } else {
    const rows = filtered.map(({ name, b }) => [
      `\`${name}\``,
      String(b.total),
      String(b.pass),
      fmtRate(b),
    ]);
    lines.push(renderTable(['block', 'total', 'passed', 'rate'], rows), '');
  }

  return lines.join('\n');
}

function summarizeList(items: string[], max = 10): string {
  if (items.length <= max) return items.map((s) => `\`${s}\``).join(', ');
  const head = items.slice(0, max).map((s) => `\`${s}\``).join(', ');
  return `${head} (+${items.length - max} more)`;
}

export function renderClusterSection(clusters: FailureCluster[]): string {
  const lines: string[] = ['## Failure clusters', ''];
  const totalFail = clusters.reduce((acc, c) => acc + c.count, 0);
  if (clusters.length === 0) {
    lines.push('_No failures recorded._', '');
    return lines.join('\n');
  }
  lines.push(
    `${totalFail} failure${totalFail === 1 ? '' : 's'} across ${clusters.length} cluster${
      clusters.length === 1 ? '' : 's'
    } (sorted by count desc).`,
    '',
  );
  clusters.forEach((c, i) => {
    lines.push(
      `### Cluster #${i + 1} — ${c.category} — \`${c.pattern}\` (count: ${c.count})`,
      `- Affected blocks (${c.affectedBlocks.length}): ${summarizeList(c.affectedBlocks)}`,
      `- Affected modes (${c.affectedModes.length}): ${summarizeList(c.affectedModes)}`,
      `- Affected boards (${c.affectedBoards.length}): ${summarizeList(c.affectedBoards)}`,
      `- Examples: ${c.examples.map((s) => `\`${s}\``).join(', ')}`,
      `- <!-- RCA: TBD (Claude session で記入) -->`,
      `- <!-- Fix proposal: TBD -->`,
      '',
    );
  });
  return lines.join('\n');
}

export function renderMetadataSection(metadata: RunMetadata): string {
  return [
    '## Catalog version',
    `- runId: \`${metadata.runId}\``,
    `- startedAt: ${metadata.startedAt}`,
    `- finishedAt: ${metadata.finishedAt ?? '(unfinished)'}`,
    `- parallelism: ${metadata.parallelism}`,
    `- catalogHash: \`${metadata.catalogHash}\``,
    `- catalogBlockCount: ${metadata.catalogBlockCount}`,
    `- generatorVersion: \`${metadata.generatorVersion ?? '(unknown)'}\``,
    `- inputManifest: \`${metadata.inputManifestPath}\``,
    `- compileServer: ${metadata.serverUrl}`,
    '',
  ].join('\n');
}

export function renderReport(args: {
  metadata: RunMetadata;
  summary: RunSummary;
  results: CaseResult[];
  clusters: FailureCluster[];
  baseline?: { runId: string; summary: RunSummary } | null;
}): string {
  const { metadata, summary, results, clusters, baseline } = args;
  const byMode = aggregateByMode(results);
  const byBoard = aggregateByBoard(results);
  const byBlock = aggregateByBlock(results);

  const sections = [
    `# Probabilistic Debug Report — \`${metadata.runId}\``,
    '',
    `Generated at ${new Date().toISOString()}.`,
    '',
    renderSummarySection({
      summary,
      baselineSummary: baseline?.summary,
      baselineRunId: baseline?.runId,
    }),
    renderBreakdownSection(byMode, byBoard, byBlock),
    renderClusterSection(clusters),
    renderMetadataSection(metadata),
  ];
  return sections.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
