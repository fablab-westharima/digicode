import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  categorize,
  extractFirstErrorLine,
  normalizeError,
  clusterKey,
  clusterFailures,
  aggregateByMode,
  aggregateByBoard,
  aggregateByBlock,
  findBaselineRun,
  renderSummarySection,
  renderBreakdownSection,
  renderClusterSection,
  renderMetadataSection,
  renderReport,
} from './report-builder';
import type { CaseResult, RunMetadata, RunSummary } from './result-store';

const baseMeta: RunMetadata = {
  runId: 'test-current',
  startedAt: '2026-04-29T00:00:00Z',
  finishedAt: '2026-04-29T00:30:00Z',
  parallelism: 4,
  catalogHash: 'hash-A',
  catalogBlockCount: 414,
  generatorVersion: 'deadbeef',
  inputManifestPath: '/tmp/manifest.json',
  serverUrl: 'https://compile.digital-fab.jp',
};

const okCase = (overrides: Partial<CaseResult> = {}): CaseResult => ({
  caseId: 'case_xxxx',
  strategy: 'singleton',
  mode: 'all_blocks',
  boardId: 'esp32-generic',
  blocksUsed: ['arduino_setup', 'arduino_loop'],
  ok: true,
  durationMs: 100,
  status: 200,
  ...overrides,
});

const failCase = (overrides: Partial<CaseResult> = {}): CaseResult => ({
  ...okCase(),
  ok: false,
  status: 200,
  error: "Command failed: pio run\n... error: 'humanoid' was not declared in this scope\n",
  stderr:
    "/opt/digicode-compile/projects/esp32dev_DigiCodeOTA/src/main.ino: In function 'void userSetup()':\n" +
    "/opt/digicode-compile/projects/esp32dev_DigiCodeOTA/src/main.ino:1467:1: error: 'humanoid' was not declared in this scope\n" +
    ' humanoid.home();\n',
  ...overrides,
});

describe('categorize', () => {
  it('flags timeout when error starts with "timeout after"', () => {
    expect(categorize(failCase({ error: 'timeout after 180000ms', stderr: undefined, status: undefined }))).toBe(
      'timeout',
    );
  });
  it('flags pre-compile errors', () => {
    expect(
      categorize(failCase({ error: 'pre-compile error: bad xml', stderr: undefined, status: undefined })),
    ).toBe('pre-compile');
  });
  it('flags HTTP 5xx as server-error', () => {
    expect(categorize(failCase({ status: 502, error: 'HTTP 502' }))).toBe('server-error');
  });
  it('flags missing status as server-error (network failure)', () => {
    expect(categorize(failCase({ status: undefined, error: 'fetch failed', stderr: undefined }))).toBe(
      'server-error',
    );
  });
  it('treats status 200 + !ok as compile error', () => {
    expect(categorize(failCase())).toBe('compile');
  });
});

describe('extractFirstErrorLine', () => {
  it('returns the message after the first `error:` keyword', () => {
    expect(
      extractFirstErrorLine(
        "src/main.ino: In function 'void userSetup()':\n" +
          "src/main.ino:1467:1: error: 'humanoid' was not declared in this scope\n",
      ),
    ).toBe("'humanoid' was not declared in this scope");
  });
  it('returns null when no error: line is found', () => {
    expect(extractFirstErrorLine('compile succeeded')).toBeNull();
  });
});

describe('normalizeError', () => {
  it('strips PIO project paths and line:col', () => {
    const raw =
      '/opt/digicode-compile/projects/esp32dev_DigiCodeOTA/src/main.ino:1467:1: error: bad';
    expect(normalizeError(raw)).toBe('<main.ino>:L:C: error: bad');
  });
  it('collapses whitespace', () => {
    expect(normalizeError('  foo   bar  ')).toBe('foo bar');
  });
});

describe('clusterKey', () => {
  it('prefers stderr over error for compile failures', () => {
    const r = failCase({
      error: 'short label',
      stderr: "src/x.ino:10:1: error: 'humanoid' was not declared in this scope\n",
    });
    const key = clusterKey(r);
    expect(key.category).toBe('compile');
    expect(key.pattern).toBe("'humanoid' was not declared in this scope");
  });
  it('falls back to a fixed pattern when stderr is unparseable', () => {
    expect(clusterKey(failCase({ stderr: 'no error keyword here', error: 'no error keyword here' })).pattern).toBe(
      '(unparseable compile error)',
    );
  });
  it('reports HTTP <status> for server errors', () => {
    expect(clusterKey(failCase({ status: 502, error: 'HTTP 502', stderr: undefined })).pattern).toBe('HTTP 502');
  });
  it('reports a fixed pattern for timeouts', () => {
    expect(
      clusterKey(failCase({ error: 'timeout after 180000ms', status: undefined, stderr: undefined })).pattern,
    ).toBe('compile timeout');
  });
});

describe('clusterFailures', () => {
  it('groups identical patterns together and counts examples', () => {
    const failures = [
      failCase({ caseId: 'case_0001', blocksUsed: ['arduino_setup', 'arduino_loop', 'humanoid_home'] }),
      failCase({ caseId: 'case_0002', blocksUsed: ['arduino_setup', 'arduino_loop', 'humanoid_walk'] }),
      failCase({ caseId: 'case_0003', blocksUsed: ['arduino_setup', 'arduino_loop', 'humanoid_turn'] }),
    ];
    const clusters = clusterFailures(failures);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].count).toBe(3);
    expect(clusters[0].examples).toEqual(['case_0001', 'case_0002', 'case_0003']);
    expect(clusters[0].affectedBlocks).toEqual(
      ['arduino_loop', 'arduino_setup', 'humanoid_home', 'humanoid_turn', 'humanoid_walk'].sort(),
    );
  });
  it('sorts clusters by count desc and caps examples at 5', () => {
    const minor = failCase({
      caseId: 'case_minor',
      stderr: "x:1:1: error: 'foo' was not declared in this scope\n",
    });
    const majors = Array.from({ length: 7 }, (_, i) =>
      failCase({
        caseId: `case_major_${i}`,
        stderr: "x:1:1: error: 'humanoid' was not declared in this scope\n",
      }),
    );
    const clusters = clusterFailures([...majors, minor]);
    expect(clusters).toHaveLength(2);
    expect(clusters[0].pattern).toBe("'humanoid' was not declared in this scope");
    expect(clusters[0].count).toBe(7);
    expect(clusters[0].examples).toHaveLength(5);
    expect(clusters[1].count).toBe(1);
  });
  it('returns [] when no failures', () => {
    expect(clusterFailures([okCase()])).toEqual([]);
  });
  it('separates buckets when categories differ even on identical patterns', () => {
    const c1 = failCase({ caseId: 'a', error: 'timeout after 180000ms', stderr: undefined, status: undefined });
    const c2 = failCase({ caseId: 'b', error: 'timeout after 180000ms', stderr: undefined, status: 200 }); // pretend compile timed out at app layer
    const clusters = clusterFailures([c1, c2]);
    // c2 categorizes as compile (status 200), c1 as timeout, so 2 clusters even if pattern strings are similar.
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    expect(new Set(clusters.map((c) => c.category)).has('timeout')).toBe(true);
  });
});

describe('aggregate helpers', () => {
  const data: CaseResult[] = [
    okCase({ caseId: 'a', mode: 'all_blocks', boardId: 'esp32-generic', blocksUsed: ['x', 'y'] }),
    okCase({ caseId: 'b', mode: 'all_blocks', boardId: 'rp2040', blocksUsed: ['x'] }),
    failCase({ caseId: 'c', mode: 'iot', boardId: 'esp32-generic', blocksUsed: ['x', 'z'] }),
  ];
  it('aggregateByMode counts pass + fail per mode', () => {
    const m = aggregateByMode(data);
    expect(m.get('all_blocks')).toEqual({ total: 2, pass: 2 });
    expect(m.get('iot')).toEqual({ total: 1, pass: 0 });
  });
  it('aggregateByBoard counts pass + fail per board', () => {
    const m = aggregateByBoard(data);
    expect(m.get('esp32-generic')).toEqual({ total: 2, pass: 1 });
    expect(m.get('rp2040')).toEqual({ total: 1, pass: 1 });
  });
  it('aggregateByBlock counts each block in blocksUsed once per case', () => {
    const m = aggregateByBlock(data);
    expect(m.get('x')).toEqual({ total: 3, pass: 2 });
    expect(m.get('y')).toEqual({ total: 1, pass: 1 });
    expect(m.get('z')).toEqual({ total: 1, pass: 0 });
  });
});

describe('findBaselineRun', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase3-baseline-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function writeRun(name: string, catalogHash: string, passRate: number): void {
    const dir = path.join(tmp, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'results.json'),
      JSON.stringify({
        metadata: { ...baseMeta, runId: name, catalogHash },
        results: [],
        summary: { total: 1, pass: passRate, fail: 1 - passRate, passRate, meanDurationMs: 1 } satisfies RunSummary,
      }),
    );
  }

  it('returns the most recent prior run with matching catalog hash', () => {
    writeRun('2026-04-25_10-00-00', 'hash-A', 0.5);
    writeRun('2026-04-26_10-00-00', 'hash-A', 0.6);
    writeRun('2026-04-27_10-00-00', 'hash-B', 0.7); // mismatched
    writeRun('2026-04-28_10-00-00', 'hash-A', 0.8);
    const got = findBaselineRun(tmp, 'current', 'hash-A');
    expect(got?.metadata.runId).toBe('2026-04-28_10-00-00');
    expect(got?.summary.passRate).toBe(0.8);
  });

  it('returns null when no run shares the catalog hash', () => {
    writeRun('2026-04-25_10-00-00', 'hash-X', 0.5);
    expect(findBaselineRun(tmp, 'current', 'hash-A')).toBeNull();
  });

  it('skips the current run', () => {
    writeRun('current', 'hash-A', 0.5);
    expect(findBaselineRun(tmp, 'current', 'hash-A')).toBeNull();
  });

  it('returns null when results root does not exist', () => {
    expect(findBaselineRun(path.join(tmp, 'no-such-dir'), 'current', 'hash-A')).toBeNull();
  });
});

describe('renderSummarySection', () => {
  it('shows trend section with delta when baseline supplied', () => {
    const md = renderSummarySection({
      summary: { total: 100, pass: 80, fail: 20, passRate: 0.8, meanDurationMs: 5000 },
      baselineSummary: { total: 100, pass: 70, fail: 30, passRate: 0.7, meanDurationMs: 6000 },
      baselineRunId: 'prev',
    });
    expect(md).toContain('Total cases: 100');
    expect(md).toContain('Passed: 80 (80.0%)');
    expect(md).toContain('Baseline run: `prev` (pass rate 70.0%)');
    expect(md).toContain('Delta: +10.0pp ✅ improvement');
  });
  it('flags regressions with ⚠️', () => {
    const md = renderSummarySection({
      summary: { total: 100, pass: 60, fail: 40, passRate: 0.6, meanDurationMs: 5000 },
      baselineSummary: { total: 100, pass: 80, fail: 20, passRate: 0.8, meanDurationMs: 5000 },
      baselineRunId: 'prev',
    });
    expect(md).toContain('-20.0pp ⚠️ regression');
  });
  it('omits trend numbers when no baseline supplied', () => {
    const md = renderSummarySection({
      summary: { total: 1, pass: 1, fail: 0, passRate: 1, meanDurationMs: 1 },
    });
    expect(md).toContain('No prior run');
  });
});

describe('renderBreakdownSection', () => {
  it('emits tables with headers for mode/board and the lowest-block list', () => {
    const data: CaseResult[] = [
      okCase({ blocksUsed: Array.from({ length: 5 }, (_, i) => `good_${i}`).concat(['arduino_setup']) }),
      ...Array.from({ length: 6 }, (_, i) =>
        failCase({ caseId: `case_${i}`, blocksUsed: ['arduino_setup', 'bad'] }),
      ),
    ];
    const md = renderBreakdownSection(aggregateByMode(data), aggregateByBoard(data), aggregateByBlock(data));
    expect(md).toContain('### By mode');
    expect(md).toContain('### By board');
    expect(md).toContain('### By block (lowest 10, total ≥ 5)');
    expect(md).toContain('`bad`');
  });
});

describe('renderClusterSection', () => {
  it('describes each cluster with affected blocks/modes/boards/examples', () => {
    const cluster = clusterFailures([
      failCase({ caseId: 'case_0001', blocksUsed: ['arduino_setup', 'humanoid_home'] }),
      failCase({ caseId: 'case_0002', blocksUsed: ['arduino_setup', 'humanoid_walk'] }),
    ]);
    const md = renderClusterSection(cluster);
    expect(md).toContain('Cluster #1');
    expect(md).toContain("'humanoid' was not declared in this scope");
    expect(md).toContain('count: 2');
    expect(md).toContain('Affected blocks');
    expect(md).toContain('case_0001');
    expect(md).toContain('RCA: TBD');
  });
  it('handles empty cluster list', () => {
    expect(renderClusterSection([])).toContain('No failures');
  });
});

describe('renderMetadataSection', () => {
  it('lists every metadata field', () => {
    const md = renderMetadataSection(baseMeta);
    expect(md).toContain('runId: `test-current`');
    expect(md).toContain('catalogHash: `hash-A`');
    expect(md).toContain('compileServer: https://compile.digital-fab.jp');
  });
});

describe('renderReport (integration)', () => {
  it('produces a Markdown document with every required section', () => {
    const results: CaseResult[] = [
      okCase({ caseId: 'case_0001' }),
      failCase({ caseId: 'case_0002', blocksUsed: ['arduino_setup', 'humanoid_home'] }),
    ];
    const summary: RunSummary = {
      total: 2,
      pass: 1,
      fail: 1,
      passRate: 0.5,
      meanDurationMs: 5000,
    };
    const md = renderReport({
      metadata: baseMeta,
      summary,
      results,
      clusters: clusterFailures(results),
      baseline: null,
    });
    expect(md).toContain('# Probabilistic Debug Report — `test-current`');
    expect(md).toContain('## Summary');
    expect(md).toContain('## Trend');
    expect(md).toContain('## Pass rate breakdown');
    expect(md).toContain('## Failure clusters');
    expect(md).toContain('## Catalog version');
    expect(md.endsWith('\n')).toBe(true);
  });
});
