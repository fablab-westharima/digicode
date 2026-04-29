import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildReport } from './render-report';
import type { CaseResult, CombinedResults, RunMetadata, RunSummary } from './lib/result-store';

const baseMeta: RunMetadata = {
  runId: 'run-current',
  startedAt: '2026-04-29T00:00:00Z',
  finishedAt: '2026-04-29T00:30:00Z',
  parallelism: 4,
  catalogHash: 'hash-A',
  catalogBlockCount: 414,
  generatorVersion: 'sha',
  inputManifestPath: '/tmp/manifest.json',
  serverUrl: 'https://compile.digital-fab.jp',
};

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-report-test-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function writeRun(name: string, metaOverrides: Partial<RunMetadata>, results: CaseResult[]): string {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  const total = results.length;
  const pass = results.filter((r) => r.ok).length;
  const summary: RunSummary = {
    total,
    pass,
    fail: total - pass,
    passRate: total === 0 ? 0 : pass / total,
    meanDurationMs: 0,
  };
  const combined: CombinedResults = {
    metadata: { ...baseMeta, ...metaOverrides, runId: name },
    results,
    summary,
  };
  fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify(combined));
  return dir;
}

const okCase = (id: string): CaseResult => ({
  caseId: id,
  strategy: 'singleton',
  mode: 'all_blocks',
  boardId: 'esp32-generic',
  blocksUsed: ['arduino_setup', 'arduino_loop'],
  ok: true,
  durationMs: 100,
  status: 200,
});

const failCase = (id: string, blocks: string[] = ['humanoid_home']): CaseResult => ({
  caseId: id,
  strategy: 'singleton',
  mode: 'all_blocks',
  boardId: 'esp32-generic',
  blocksUsed: ['arduino_setup', 'arduino_loop', ...blocks],
  ok: false,
  durationMs: 5000,
  status: 200,
  error: 'compile failed',
  stderr: "x:1:1: error: 'humanoid' was not declared in this scope\n",
});

describe('buildReport', () => {
  it('writes a report to scripts/probabilistic-debug-reports/<runId>.md by default', () => {
    const dir = writeRun('run-current', {}, [okCase('case_0001'), failCase('case_0002')]);
    const out = buildReport({
      runDir: dir,
      outPath: path.join(tmp, 'reports', 'run-current.md'),
    });
    expect(fs.existsSync(out.reportPath)).toBe(true);
    const md = fs.readFileSync(out.reportPath, 'utf-8');
    expect(md).toContain('# Probabilistic Debug Report — `run-current`');
    expect(md).toContain('Total cases: 2');
    expect(md).toContain('Passed: 1 (50.0%)');
    expect(md).toContain('Cluster #1');
  });

  it('auto-picks the most recent prior run with matching catalog hash as baseline', () => {
    writeRun('2026-04-25_10-00-00', {}, [okCase('case_old_a'), okCase('case_old_b')]); // pass=2/2 = 100%
    writeRun('2026-04-26_10-00-00', { catalogHash: 'other' }, [okCase('case_other')]); // mismatched, ignored
    writeRun('2026-04-27_10-00-00', {}, [okCase('case_old_c'), failCase('case_old_d')]); // pass=1/2 = 50%, this should be picked
    const cur = writeRun('2026-04-28_10-00-00', {}, [okCase('case_a'), okCase('case_b')]); // pass=2/2 = 100%
    const out = buildReport({
      runDir: cur,
      outPath: path.join(tmp, 'reports', 'run-current.md'),
    });
    expect(out.baselineRunId).toBe('2026-04-27_10-00-00');
    const md = fs.readFileSync(out.reportPath, 'utf-8');
    expect(md).toContain('Baseline run: `2026-04-27_10-00-00`');
    expect(md).toContain('+50.0pp ✅ improvement');
  });

  it('emits "No prior run" when no baseline matches the catalog hash', () => {
    const dir = writeRun('run-current', { catalogHash: 'unique-hash' }, [okCase('case_a')]);
    const out = buildReport({
      runDir: dir,
      outPath: path.join(tmp, 'reports', 'run-current.md'),
    });
    expect(out.baselineRunId).toBeNull();
    const md = fs.readFileSync(out.reportPath, 'utf-8');
    expect(md).toContain('No prior run');
  });

  it('honors an explicit --baseline pointer', () => {
    const baseline = writeRun('manual-baseline', {}, [okCase('case_old')]); // pass=1/1 = 100%
    const cur = writeRun('run-current', {}, [okCase('case_new'), failCase('case_fail')]); // pass=1/2 = 50%
    const out = buildReport({
      runDir: cur,
      outPath: path.join(tmp, 'reports', 'run-current.md'),
      baselineDir: baseline,
    });
    expect(out.baselineRunId).toBe('manual-baseline');
    const md = fs.readFileSync(out.reportPath, 'utf-8');
    expect(md).toContain('-50.0pp ⚠️ regression');
  });

  it('rejects an explicit baseline whose catalog hash does not match', () => {
    const baseline = writeRun('mismatch', { catalogHash: 'other' }, [okCase('case_x')]);
    const cur = writeRun('run-current', {}, [okCase('case_a')]);
    const out = buildReport({
      runDir: cur,
      outPath: path.join(tmp, 'reports', 'run-current.md'),
      baselineDir: baseline,
    });
    // Mismatched hash → trend skipped, treated as no baseline.
    expect(out.baselineRunId).toBeNull();
  });

  it('reuses failures.json when present rather than re-clustering', () => {
    const dir = writeRun('run-current', {}, [okCase('case_a'), failCase('case_b')]);
    fs.writeFileSync(
      path.join(dir, 'failures.json'),
      JSON.stringify({
        metadata: baseMeta,
        summary: { totalFail: 1, clusterCount: 1 },
        clusters: [
          {
            pattern: 'cached cluster pattern',
            category: 'compile',
            count: 99,
            examples: ['case_b'],
            affectedBlocks: ['arduino_setup'],
            affectedModes: ['all_blocks'],
            affectedBoards: ['esp32-generic'],
          },
        ],
      }),
    );
    const out = buildReport({
      runDir: dir,
      outPath: path.join(tmp, 'reports', 'run-current.md'),
    });
    const md = fs.readFileSync(out.reportPath, 'utf-8');
    expect(md).toContain('cached cluster pattern');
    expect(md).toContain('count: 99');
    expect(out.clusterCount).toBe(1);
  });
});
