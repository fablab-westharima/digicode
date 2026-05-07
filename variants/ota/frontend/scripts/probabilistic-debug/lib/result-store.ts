/**
 * result-store.ts
 *
 * Persists per-case orchestrator results. Three artifacts per run:
 *
 *   metadata.json   — run metadata (catalog hash, generator SHA, parallelism,
 *                     server URL, start/finish timestamps). Written at start
 *                     and updated at finalize.
 *   results.jsonl   — one JSON object per line, appended as each case finishes.
 *                     Resilient to crashes — partial runs leave usable data.
 *   results.json    — combined object (metadata + results + summary), written
 *                     once at finalize. Convenient for human reading and
 *                     Phase 3 analyzer ingestion.
 *
 * The catalog version tagging requirement of 43.md §4.4 is satisfied by the
 * metadata's `catalogHash` + `generatorVersion` fields.
 */

import fs from 'fs';
import path from 'path';
import type { Strategy } from './case-types';

/**
 * 'full' = the historical compile-server-roundtrip mode.
 * 'code-gen' = 55.md Phase 4-1 generator-only mode (no compile-server call):
 *   xmlToCpp() runs but compileCpp() is skipped, so the case is judged purely
 *   on whether the headless Blockly→C++ generator returns non-empty fragments.
 *   Optional for backward-compat with pre-Stage-1 jsonl files.
 */
export type CaseStage = 'full' | 'code-gen';

export interface CaseResult {
  caseId: string;
  strategy: Strategy;
  mode: string;
  boardId: string;
  blocksUsed: string[];
  ok: boolean;
  durationMs: number;
  status?: number;
  error?: string;
  stderr?: string;
  retryUsed?: boolean;
  stage?: CaseStage;
  /**
   * amendment 9 (2026-05-07): the server's result-blob cache HIT/MISS signal,
   * propagated from CompileResult.cached. `true` = HIT (~50ms latency, no
   * fresh compile), `false` = MISS (real PIO run), `undefined` = unknown
   * (older server, error path, or stage='code-gen' which has no compile).
   * Aggregated by ResultStore.summary() into cacheHit / cacheMiss /
   * cacheUnknown counts so the orchestrator's per-run report can call out
   * whether the cache was effective or whether the run actually exercised
   * cold-compile paths.
   */
  cached?: boolean;
}

export interface RunMetadata {
  runId: string;
  startedAt: string;
  finishedAt?: string;
  parallelism: number;
  catalogHash: string;
  catalogBlockCount: number;
  generatorVersion: string | null;
  inputManifestPath: string;
  serverUrl: string;
  /** Total cases that will be processed (set when known). */
  expectedCount?: number;
}

export interface RunSummary {
  total: number;
  pass: number;
  fail: number;
  passRate: number;
  /** Mean ML30 round-trip duration over successful + failed compiles. */
  meanDurationMs: number;
  /** amendment 9 cache HIT/MISS aggregation. `cacheUnknown` = stage='code-gen'
   *  (no compile happened) + older-server responses + error paths that did
   *  not surface a `complete` event. */
  cacheHit: number;
  cacheMiss: number;
  cacheUnknown: number;
}

export interface CombinedResults {
  metadata: RunMetadata;
  results: CaseResult[];
  summary: RunSummary;
}

export class ResultStore {
  private readonly outDir: string;
  private readonly metadataPath: string;
  private readonly jsonlPath: string;
  private readonly combinedPath: string;
  private readonly results: CaseResult[] = [];

  constructor(outDir: string, public readonly metadata: RunMetadata) {
    this.outDir = outDir;
    fs.mkdirSync(outDir, { recursive: true });
    this.metadataPath = path.join(outDir, 'metadata.json');
    this.jsonlPath = path.join(outDir, 'results.jsonl');
    this.combinedPath = path.join(outDir, 'results.json');

    fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2) + '\n');
    // Pre-create empty JSONL so append-only writers can rely on the file
    // existing (and tests can read it even when no cases were appended).
    fs.writeFileSync(this.jsonlPath, '');
  }

  append(result: CaseResult): void {
    this.results.push(result);
    fs.appendFileSync(this.jsonlPath, JSON.stringify(result) + '\n');
  }

  get count(): number {
    return this.results.length;
  }

  get passCount(): number {
    return this.results.filter((r) => r.ok).length;
  }

  get failCount(): number {
    return this.results.filter((r) => !r.ok).length;
  }

  summary(): RunSummary {
    const total = this.results.length;
    const pass = this.passCount;
    const meanDurationMs = total === 0
      ? 0
      : this.results.reduce((acc, r) => acc + r.durationMs, 0) / total;
    let cacheHit = 0;
    let cacheMiss = 0;
    let cacheUnknown = 0;
    for (const r of this.results) {
      if (r.cached === true) cacheHit++;
      else if (r.cached === false) cacheMiss++;
      else cacheUnknown++;
    }
    return {
      total,
      pass,
      fail: total - pass,
      passRate: total === 0 ? 0 : pass / total,
      meanDurationMs,
      cacheHit,
      cacheMiss,
      cacheUnknown,
    };
  }

  finalize(): CombinedResults {
    this.metadata.finishedAt = new Date().toISOString();
    fs.writeFileSync(
      this.metadataPath,
      JSON.stringify(this.metadata, null, 2) + '\n',
    );
    const combined: CombinedResults = {
      metadata: this.metadata,
      results: this.results,
      summary: this.summary(),
    };
    fs.writeFileSync(this.combinedPath, JSON.stringify(combined, null, 2) + '\n');
    return combined;
  }

  /** Used by tests/inspectors to peek at on-disk state. */
  paths(): { metadata: string; jsonl: string; combined: string } {
    return {
      metadata: this.metadataPath,
      jsonl: this.jsonlPath,
      combined: this.combinedPath,
    };
  }
}

export function generateRunId(): string {
  const now = new Date();
  const pad = (n: number, w = 2): string => String(n).padStart(w, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}
