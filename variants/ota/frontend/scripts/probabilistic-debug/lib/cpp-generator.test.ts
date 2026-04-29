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

describe('xmlToCpp — built-in block overrides (BUG-060 / BUG-061)', () => {
  it('controls_for emits C++ for-loop with int declaration, hoist switched to int', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="controls_for">' +
      '<field name="VAR">i</field>' +
      '<value name="FROM"><block type="math_number"><field name="NUM">0</field></block></value>' +
      '<value name="TO"><block type="math_number"><field name="NUM">5</field></block></value>' +
      '<value name="BY"><block type="math_number"><field name="NUM">1</field></block></value>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.setupCode).toMatch(/for \(int i = 0; i <= 5; i \+= 1\)/);
    expect(out.globals).toContain('int i = 0;');
    // No JS var keyword anywhere — Blockly's hoist was rewritten and the
    // controls_for body uses an inner `int` declaration.
    expect(out.fullCode).not.toMatch(/(?:^|\s)var\s/);
  });

  it('controls_repeat_ext emits C++ for-loop with int count', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50"></block>' +
      '<block type="arduino_loop" x="50" y="350">' +
      '<statement name="LOOP">' +
      '<block type="controls_repeat_ext">' +
      '<value name="TIMES"><block type="math_number"><field name="NUM">10</field></block></value>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.loopCode).toMatch(/for \(int count = 0; count < 10; count\+\+\)/);
    expect(out.fullCode).not.toMatch(/(?:^|\s)var\s/);
  });

  it('variables_set + variables_get retain a typed declaration when used outside controls_for', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<variables><variable id="v1">counter</variable></variables>' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="variables_set">' +
      '<field name="VAR" id="v1">counter</field>' +
      '<value name="VALUE"><block type="math_number"><field name="NUM">7</field></block></value>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.globals).toContain('int counter = 0;');
    expect(out.setupCode).toContain('counter = 7;');
    expect(out.fullCode).not.toMatch(/(?:^|\s)var\s/);
  });

  it('empty text block emits C++ string literal "" (not single-quoted empty char)', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="esp32_serial_begin"><field name="BAUD">9600</field></block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350">' +
      '<statement name="LOOP">' +
      '<block type="esp32_serial_println">' +
      '<value name="VALUE"><block type="text"><field name="TEXT"></field></block></value>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.loopCode).toContain('Serial.println("")');
    expect(out.loopCode).not.toContain("Serial.println('')");
  });

  it('text block with content emits double-quoted C++ string literal', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50"></block>' +
      '<block type="arduino_loop" x="50" y="350">' +
      '<statement name="LOOP">' +
      '<block type="esp32_serial_println">' +
      '<value name="VALUE"><block type="text"><field name="TEXT">Hello</field></block></value>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.loopCode).toContain('Serial.println("Hello")');
    expect(out.loopCode).not.toContain("'Hello'");
  });

  it('text block escapes embedded backslash and double-quote for C++ literal safety', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50"></block>' +
      '<block type="arduino_loop" x="50" y="350">' +
      '<statement name="LOOP">' +
      '<block type="esp32_serial_println">' +
      '<value name="VALUE"><block type="text"><field name="TEXT">a\\b"c</field></block></value>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.loopCode).toContain('Serial.println("a\\\\b\\"c")');
  });
});

describe('xmlToCpp — NTP block header casing (BUG-058)', () => {
  // arduino-esp32 / arduino-mbed framework ship the header as `WiFiUdp.h`
  // (lowercase 'd'); a literal `<WiFiUDP.h>` (uppercase 'D') leaks into the
  // unconditional includes via splitFragments and fails on case-sensitive
  // filesystems. The class name `WiFiUDP` (uppercase) stays as the WiFi
  // library defines it.
  it('ntp_sync emits <WiFiUdp.h> (lowercase d), not <WiFiUDP.h>', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ntp_sync">' +
      '<field name="SERVER">pool.ntp.org</field>' +
      '<field name="TZ_OFFSET">32400</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.fullCode).toContain('#include <WiFiUdp.h>');
    expect(out.fullCode).not.toContain('#include <WiFiUDP.h>');
    expect(out.fullCode).toContain('WiFiUDP ntpUDP;');
  });
});

describe('xmlToCpp — NimBLE v2 API (BUG-056)', () => {
  // The vendored NimBLE-Arduino is v2.4.0 (compile-api/libs/NimBLE-Arduino).
  // The 1.x→2.x migration guide renamed the static check
  // `NimBLEDevice::getInitialized` to `NimBLEDevice::isInitialized`. Generators
  // that emit `getInitialized()` fail to compile against the vendored copy.
  it('ble_scan_start emits NimBLEDevice::isInitialized (v2 API), not getInitialized', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ble_scan_start">' +
      '<field name="DURATION">5</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.fullCode).toContain('NimBLEDevice::isInitialized()');
    expect(out.fullCode).not.toContain('NimBLEDevice::getInitialized()');
  });
});
