import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { processWithConcurrency, runOrchestrator } from './orchestrator';
import type { Manifest } from './lib/case-types';

describe('processWithConcurrency', () => {
  it('processes every item once', async () => {
    const seen = new Set<number>();
    await processWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      seen.add(item);
    });
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('respects the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);
    await processWithConcurrency(items, 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThanOrEqual(2);
  });

  it('handles empty input array', async () => {
    let count = 0;
    await processWithConcurrency<number>([], 4, async () => {
      count++;
    });
    expect(count).toBe(0);
  });

  it('handles concurrency=1 (serial execution)', async () => {
    const order: number[] = [];
    await processWithConcurrency([1, 2, 3], 1, async (item) => {
      order.push(item);
      await new Promise((r) => setTimeout(r, 1));
    });
    expect(order).toEqual([1, 2, 3]);
  });

  it('floors concurrency to at least 1', async () => {
    const seen: number[] = [];
    await processWithConcurrency([1, 2], 0, async (item) => {
      seen.push(item);
    });
    expect(seen.sort()).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------
// Stage 1 (55.md Phase 4-1): `--stage code-gen` mode skips the compile-server
// roundtrip and judges each case purely on whether xmlToCpp() returns
// non-empty fragments. End-to-end integration tests below; no mocks — the
// real Blockly registry from `lib/blocks-bootstrap` is used so a future
// bootstrap-import regression silently breaking the generator is detectable.
// ---------------------------------------------------------------------------

const MINIMAL_VALID_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="50"/>
  <block type="arduino_loop" x="50" y="350">
    <statement name="LOOP">
      <block type="esp32_serial_println">
        <value name="VALUE">
          <block type="text">
            <field name="TEXT">hello</field>
          </block>
        </value>
      </block>
    </statement>
  </block>
</xml>`;

const UNKNOWN_BLOCK_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup" x="50" y="50"/>
  <block type="arduino_loop" x="50" y="350">
    <statement name="LOOP">
      <block type="this_block_does_not_exist_in_catalog"/>
    </statement>
  </block>
</xml>`;

interface FixtureCase {
  id: string;
  fileName: string;
  xml: string;
}

function writeFixture(
  cases: FixtureCase[],
): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-codegen-'));
  for (const c of cases) {
    fs.writeFileSync(path.join(dir, c.fileName), c.xml);
  }
  const manifest: Manifest = {
    generatorVersion: 'test',
    catalogHash: 'test',
    catalogBlockCount: 0,
    generatedAt: new Date().toISOString(),
    seed: 0,
    count: cases.length,
    cases: cases.map((c) => ({
      id: c.id,
      strategy: 'singleton',
      mode: 'all_blocks',
      boardId: 'esp32-generic',
      blocksUsed: [],
      fileName: c.fileName,
    })),
  };
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
  );
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

describe('runOrchestrator — stage="code-gen"', () => {
  it('PASSes a valid XML case without contacting the compile server', async () => {
    const fixture = writeFixture([
      { id: 'case_0001', fileName: 'case_0001.xml', xml: MINIMAL_VALID_XML },
    ]);
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-out-'));
    try {
      await runOrchestrator({
        inDir: fixture.dir,
        outDir,
        parallel: 1,
        verbose: false,
        // Sentinel — if the orchestrator accidentally reaches the network
        // we'd see a connection error. code-gen mode must skip compileCpp().
        serverUrl: 'http://127.0.0.1:1',
        connectionType: 'usb',
        timeoutMs: 5_000,
        stage: 'code-gen',
      });
      const lines = fs
        .readFileSync(path.join(outDir, 'results.jsonl'), 'utf-8')
        .trim()
        .split('\n');
      expect(lines).toHaveLength(1);
      const result = JSON.parse(lines[0]);
      expect(result.caseId).toBe('case_0001');
      expect(result.ok).toBe(true);
      expect(result.stage).toBe('code-gen');
      expect(result.error).toBeUndefined();
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
      fixture.cleanup();
    }
  });

  it('FAILs an unknown-block XML with a "pre-compile error" message', async () => {
    const fixture = writeFixture([
      { id: 'case_0002', fileName: 'case_0002.xml', xml: UNKNOWN_BLOCK_XML },
    ]);
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-out-'));
    try {
      await runOrchestrator({
        inDir: fixture.dir,
        outDir,
        parallel: 1,
        verbose: false,
        serverUrl: 'http://127.0.0.1:1',
        connectionType: 'usb',
        timeoutMs: 5_000,
        stage: 'code-gen',
      });
      const lines = fs
        .readFileSync(path.join(outDir, 'results.jsonl'), 'utf-8')
        .trim()
        .split('\n');
      expect(lines).toHaveLength(1);
      const result = JSON.parse(lines[0]);
      expect(result.caseId).toBe('case_0002');
      expect(result.ok).toBe(false);
      expect(result.stage).toBe('code-gen');
      expect(result.error).toMatch(/pre-compile error/i);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
      fixture.cleanup();
    }
  });
});
