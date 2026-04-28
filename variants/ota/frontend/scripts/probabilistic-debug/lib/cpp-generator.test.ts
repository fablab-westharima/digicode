import { describe, it, expect } from 'vitest';
import { xmlToCpp } from './cpp-generator';
import { sampleProjects } from '../../../src/data/sampleProjects';

describe('xmlToCpp — sampleProjects round-trip', () => {
  it('led-blink: generates void setup() with pinMode and void loop() with digitalWrite', () => {
    const sample = sampleProjects.find((s) => s.id === 'led-blink');
    expect(sample).toBeDefined();
    if (!sample) return;
    const out = xmlToCpp(sample.blocklyXml);
    expect(out.fullCode).toContain('void setup()');
    expect(out.fullCode).toContain('void loop()');
    expect(out.setupCode).toContain('pinMode');
    expect(out.loopCode).toContain('digitalWrite');
  });

  it('serial-hello: extracts Serial.begin into setupCode and a Serial.println into loopCode', () => {
    const sample = sampleProjects.find((s) => s.id === 'serial-hello');
    expect(sample).toBeDefined();
    if (!sample) return;
    const out = xmlToCpp(sample.blocklyXml);
    expect(out.setupCode).toMatch(/Serial\.begin/);
    expect(out.loopCode).toMatch(/Serial\.println/);
  });

  it('produces deterministic output across consecutive calls', () => {
    const sample = sampleProjects[0];
    const a = xmlToCpp(sample.blocklyXml);
    const b = xmlToCpp(sample.blocklyXml);
    expect(a.fullCode).toBe(b.fullCode);
    expect(a.setupCode).toBe(b.setupCode);
    expect(a.loopCode).toBe(b.loopCode);
  });

  it('fragments add up to (most of) fullCode (split is non-lossy modulo whitespace)', () => {
    const sample = sampleProjects.find((s) => s.id === 'led-blink');
    if (!sample) return;
    const out = xmlToCpp(sample.blocklyXml);
    expect(out.includes.length + out.globals.length + out.setupCode.length + out.loopCode.length).toBeGreaterThan(0);
    // All fragments derived from the same code → consistent token presence.
    if (out.includes.length > 0) expect(out.fullCode).toContain(out.includes);
    if (out.setupCode.length > 0) expect(out.fullCode).toContain(out.setupCode);
    if (out.loopCode.length > 0) expect(out.fullCode).toContain(out.loopCode);
  });

  it('handles an empty arduino_setup + arduino_loop pair (Singleton case_0001 shape)', () => {
    const minimal =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50"></block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(minimal);
    expect(out.fullCode).toContain('void setup()');
    expect(out.fullCode).toContain('void loop()');
    // Bodies should be empty (or whitespace) — no extra noise.
    expect(out.setupCode.trim()).toBe('');
    expect(out.loopCode.trim()).toBe('');
  });
});

describe('xmlToCpp — Phase 1 generated cases', () => {
  it('a synthesized esp32_pin_mode case yields pinMode in setupCode', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="esp32_pin_mode">' +
      '<field name="PIN">2</field>' +
      '<field name="MODE">OUTPUT</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.setupCode).toContain('pinMode');
    expect(out.setupCode).toMatch(/2,\s*OUTPUT/);
  });
});
