import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ResultStore, generateRunId, type RunMetadata, type CaseResult } from './result-store';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'result-store-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const baseMeta: RunMetadata = {
  runId: 'test-run',
  startedAt: '2026-04-28T00:00:00Z',
  parallelism: 4,
  catalogHash: 'abc123',
  catalogBlockCount: 414,
  generatorVersion: 'deadbeef',
  inputManifestPath: '/some/manifest.json',
  serverUrl: 'https://compile.digital-fab.jp',
};

const okResult: CaseResult = {
  caseId: 'case_0001',
  strategy: 'singleton',
  mode: 'all_blocks',
  boardId: 'esp32-generic',
  blocksUsed: ['arduino_loop', 'arduino_setup'],
  ok: true,
  durationMs: 1234,
  status: 200,
};

const failResult: CaseResult = {
  caseId: 'case_0002',
  strategy: 'singleton',
  mode: 'all_blocks',
  boardId: 'esp32-generic',
  blocksUsed: ['arduino_loop', 'arduino_setup', 'esp32_pin_mode'],
  ok: false,
  durationMs: 30000,
  status: 200,
  error: "'pinMode' was not declared in this scope",
  stderr: 'long stderr',
};

describe('ResultStore', () => {
  it('writes metadata.json on construction with provided fields', () => {
    new ResultStore(tmpDir, baseMeta);
    const meta = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'metadata.json'), 'utf-8'),
    );
    expect(meta.runId).toBe('test-run');
    expect(meta.parallelism).toBe(4);
    expect(meta.catalogHash).toBe('abc123');
    expect(meta.finishedAt).toBeUndefined();
  });

  it('appends each result to results.jsonl as one line per case', () => {
    const store = new ResultStore(tmpDir, baseMeta);
    store.append(okResult);
    store.append(failResult);
    store.finalize();

    const jsonl = fs
      .readFileSync(path.join(tmpDir, 'results.jsonl'), 'utf-8')
      .trim();
    const lines = jsonl.split('\n');
    expect(lines.length).toBe(2);
    expect(JSON.parse(lines[0]).caseId).toBe('case_0001');
    expect(JSON.parse(lines[1]).ok).toBe(false);
  });

  it('writes combined results.json on finalize with metadata + results + summary', () => {
    const store = new ResultStore(tmpDir, baseMeta);
    store.append(okResult);
    store.append(failResult);
    store.finalize();
    const combined = JSON.parse(
      fs.readFileSync(path.join(tmpDir, 'results.json'), 'utf-8'),
    );
    expect(combined.metadata.runId).toBe('test-run');
    expect(combined.metadata.finishedAt).toBeDefined();
    expect(combined.results.length).toBe(2);
    expect(combined.summary.total).toBe(2);
    expect(combined.summary.pass).toBe(1);
    expect(combined.summary.fail).toBe(1);
    expect(combined.summary.passRate).toBe(0.5);
    expect(combined.summary.meanDurationMs).toBe((1234 + 30000) / 2);
  });

  it('exposes count / passCount / failCount accessors', () => {
    const store = new ResultStore(tmpDir, baseMeta);
    store.append(okResult);
    store.append(failResult);
    store.append({ ...okResult, caseId: 'case_0003' });
    expect(store.count).toBe(3);
    expect(store.passCount).toBe(2);
    expect(store.failCount).toBe(1);
    store.finalize();
  });

  it('handles an empty run (zero cases) without dividing by zero', () => {
    const store = new ResultStore(tmpDir, baseMeta);
    const combined = store.finalize();
    expect(combined.summary.total).toBe(0);
    expect(combined.summary.passRate).toBe(0);
    expect(combined.summary.meanDurationMs).toBe(0);
  });
});

describe('generateRunId', () => {
  it('returns a timestamp like YYYY-MM-DD_HH-MM-SS', () => {
    expect(generateRunId()).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
  });
});
