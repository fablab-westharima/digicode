import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { analyzeFailures } from './analyze-failures';
import type { CaseResult, CombinedResults, RunMetadata } from './lib/result-store';

const baseMeta: RunMetadata = {
  runId: 'test-analyze',
  startedAt: '2026-04-29T00:00:00Z',
  finishedAt: '2026-04-29T00:30:00Z',
  parallelism: 4,
  catalogHash: 'h',
  catalogBlockCount: 414,
  generatorVersion: 'v',
  inputManifestPath: '/tmp/manifest.json',
  serverUrl: 'https://compile.digital-fab.jp',
};

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'analyze-failures-test-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function writeRun(results: CaseResult[]): string {
  const dir = path.join(tmp, 'run-1');
  fs.mkdirSync(dir, { recursive: true });
  const combined: CombinedResults = {
    metadata: baseMeta,
    results,
    summary: {
      total: results.length,
      pass: results.filter((r) => r.ok).length,
      fail: results.filter((r) => !r.ok).length,
      passRate: results.length === 0 ? 0 : results.filter((r) => r.ok).length / results.length,
      meanDurationMs: 0,
    },
  };
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(combined));
  return dir;
}

describe('analyzeFailures', () => {
  it('writes failures.json at the run directory and reports cluster counts', () => {
    const dir = writeRun([
      {
        caseId: 'case_0001',
        strategy: 'singleton',
        mode: 'all_blocks',
        boardId: 'esp32-generic',
        blocksUsed: ['arduino_setup', 'arduino_loop'],
        ok: true,
        durationMs: 100,
        status: 200,
      },
      {
        caseId: 'case_0002',
        strategy: 'singleton',
        mode: 'all_blocks',
        boardId: 'esp32-generic',
        blocksUsed: ['arduino_setup', 'humanoid_home'],
        ok: false,
        durationMs: 5000,
        status: 200,
        stderr: "x:1:1: error: 'humanoid' was not declared in this scope\n",
      },
      {
        caseId: 'case_0003',
        strategy: 'singleton',
        mode: 'all_blocks',
        boardId: 'esp32-generic',
        blocksUsed: ['arduino_setup', 'humanoid_walk'],
        ok: false,
        durationMs: 5000,
        status: 200,
        stderr: "x:1:1: error: 'humanoid' was not declared in this scope\n",
      },
    ]);
    const out = analyzeFailures({ runDir: dir });
    expect(out.failuresPath).toBe(path.join(dir, 'failures.json'));
    const json = JSON.parse(fs.readFileSync(out.failuresPath, 'utf-8'));
    expect(json.summary.totalFail).toBe(2);
    expect(json.summary.clusterCount).toBe(1);
    expect(json.clusters[0].pattern).toBe("'humanoid' was not declared in this scope");
    expect(json.clusters[0].count).toBe(2);
    expect(json.metadata.catalogHash).toBe('h');
  });

  it('emits empty clusters when there are no failures', () => {
    const dir = writeRun([
      {
        caseId: 'case_0001',
        strategy: 'singleton',
        mode: 'all_blocks',
        boardId: 'esp32-generic',
        blocksUsed: ['arduino_setup', 'arduino_loop'],
        ok: true,
        durationMs: 100,
        status: 200,
      },
    ]);
    const out = analyzeFailures({ runDir: dir });
    const json = JSON.parse(fs.readFileSync(out.failuresPath, 'utf-8'));
    expect(json.summary.totalFail).toBe(0);
    expect(json.summary.clusterCount).toBe(0);
    expect(json.clusters).toEqual([]);
  });

  it('throws when results.json is missing', () => {
    const empty = path.join(tmp, 'no-such');
    fs.mkdirSync(empty, { recursive: true });
    expect(() => analyzeFailures({ runDir: empty })).toThrow(/results\.json not found/);
  });
});
