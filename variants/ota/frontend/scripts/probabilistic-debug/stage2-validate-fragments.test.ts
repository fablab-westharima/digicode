import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  runStage2,
  validateBraceBalance,
  validateIncludeFormat,
  validatePlaceholderNoise,
  validateFragments,
} from './stage2-validate-fragments';
import type { Manifest } from './lib/case-types';
import type { CompileFragments } from './lib/cpp-generator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFragments(partial: Partial<CompileFragments>): CompileFragments {
  return {
    fullCode: '',
    includes: '',
    globals: '',
    setupCode: '',
    loopCode: '',
    ...partial,
  };
}

interface FixtureCase {
  id: string;
  fileName: string;
  xml: string;
  blocksUsed?: string[];
}

function writeFixture(cases: FixtureCase[]): {
  inDir: string;
  outPath: string;
  cleanup: () => void;
} {
  const inDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage2-in-'));
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage2-out-'));
  for (const c of cases) {
    fs.writeFileSync(path.join(inDir, c.fileName), c.xml);
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
      blocksUsed: c.blocksUsed ?? [],
      fileName: c.fileName,
    })),
  };
  fs.writeFileSync(path.join(inDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return {
    inDir,
    outPath: path.join(outDir, 'validation.json'),
    cleanup: () => {
      fs.rmSync(inDir, { recursive: true, force: true });
      fs.rmSync(outDir, { recursive: true, force: true });
    },
  };
}

const VALID_XML = `<xml xmlns="https://developers.google.com/blockly/xml">
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

// ---------------------------------------------------------------------------
// Unit tests for individual validation rules
// ---------------------------------------------------------------------------

describe('validateBraceBalance', () => {
  it('reports balanced setup/loop as ok', () => {
    const r = validateBraceBalance('if (x) { y(); }', '{ z(); }');
    expect(r.ok).toBe(true);
  });

  it('flags an unbalanced setup body', () => {
    const r = validateBraceBalance('if (x) { y();', 'z();');
    expect(r.ok).toBe(false);
    expect(r.setupOpen).toBe(1);
    expect(r.setupClose).toBe(0);
  });

  it('flags an unbalanced loop body', () => {
    const r = validateBraceBalance('y();', '{}');
    // setup balanced, loop balanced — ok
    expect(r.ok).toBe(true);
    const r2 = validateBraceBalance('y();', '{ z()');
    expect(r2.ok).toBe(false);
    expect(r2.loopOpen).toBe(1);
    expect(r2.loopClose).toBe(0);
  });

  it('treats fully empty bodies as ok (empty wrapping)', () => {
    expect(validateBraceBalance('', '').ok).toBe(true);
  });
});

describe('validateIncludeFormat', () => {
  it('passes a normal include block', () => {
    const r = validateIncludeFormat('#include <Arduino.h>\n#include "MyLib.h"');
    expect(r.ok).toBe(true);
    expect(r.badLines).toEqual([]);
  });

  it('flags a malformed include line', () => {
    const r = validateIncludeFormat('#include <Arduino.h>\ninclude foo');
    expect(r.ok).toBe(false);
    expect(r.badLines).toEqual(['include foo']);
  });

  it('treats empty input as ok', () => {
    expect(validateIncludeFormat('').ok).toBe(true);
  });
});

describe('validatePlaceholderNoise', () => {
  it('passes clean C++', () => {
    const r = validatePlaceholderNoise('void setup() { Serial.println("hi"); }');
    expect(r.ok).toBe(true);
    expect(r.matches).toEqual([]);
  });

  it('flags a literal `undefined`', () => {
    const r = validatePlaceholderNoise('Serial.println(undefined);');
    expect(r.ok).toBe(false);
    expect(r.matches).toContain('undefined');
  });

  it('flags `[object Object]`', () => {
    const r = validatePlaceholderNoise('// got [object Object]');
    expect(r.ok).toBe(false);
    expect(r.matches).toContain('objectObj');
  });

  it('does not false-positive on `nullptr`', () => {
    expect(validatePlaceholderNoise('void *p = nullptr;').ok).toBe(true);
  });

  it('does not false-positive on `NULL` (C macro, uppercase)', () => {
    expect(validatePlaceholderNoise('if (p == NULL) {}').ok).toBe(true);
  });
});

describe('validateFragments (combined)', () => {
  it('passes a clean valid fragment set', () => {
    const r = validateFragments(
      makeFragments({
        fullCode: '#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}',
        includes: '#include <Arduino.h>',
        setupCode: '',
        loopCode: '',
      }),
    );
    expect(r.failedChecks).toEqual([]);
  });

  it('passes empty wrapping (D-2): individual empty setupCode/loopCode is OK', () => {
    const r = validateFragments(
      makeFragments({
        fullCode: '#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}',
        includes: '#include <Arduino.h>',
        setupCode: '',
        loopCode: '',
      }),
    );
    expect(r.failedChecks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// End-to-end runStage2 (mock-free integration via real xmlToCpp)
// ---------------------------------------------------------------------------

describe('runStage2 — happy path', () => {
  it('writes a validation.json with summary.pass=1 for a valid case', async () => {
    const fix = writeFixture([
      { id: 'case_0001', fileName: 'case_0001.xml', xml: VALID_XML },
    ]);
    try {
      const report = await runStage2({
        inDir: fix.inDir,
        outPath: fix.outPath,
        parallel: 1,
      });
      expect(report.summary.total).toBe(1);
      expect(report.summary.pass).toBe(1);
      expect(report.summary.fail).toBe(0);
      expect(report.summary.checks.braceBalance.pass).toBe(1);
      expect(report.summary.checks.includeFormat.pass).toBe(1);
      expect(report.summary.checks.placeholderNoise.pass).toBe(1);
      expect(report.failures).toEqual([]);

      // Confirm the file is on disk and reparses identically.
      const onDisk = JSON.parse(fs.readFileSync(fix.outPath, 'utf-8'));
      expect(onDisk.summary.pass).toBe(1);
    } finally {
      fix.cleanup();
    }
  });
});
