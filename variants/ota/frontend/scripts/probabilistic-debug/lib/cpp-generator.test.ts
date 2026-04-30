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

describe('xmlToCpp — NimBLE v2 callback signatures + scan ms (BUG-065)', () => {
  // The vendored NimBLE-Arduino v2.4.0 changed callback signatures and time units:
  //   * NimBLEServerCallbacks::onConnect(NimBLEServer*, NimBLEConnInfo&)
  //   * NimBLEServerCallbacks::onDisconnect(NimBLEServer*, NimBLEConnInfo&, int reason)
  //   * NimBLECharacteristicCallbacks::onWrite(NimBLECharacteristic*, NimBLEConnInfo&)
  //   * NimBLEScanCallbacks::onResult(const NimBLEAdvertisedDevice*)  // const-ified
  //   * NimBLEScan::start(<ms>, ...)  // seconds → milliseconds
  // v1 signatures compile against v2 (base virtual + default empty body) but the
  // user override is never called → silent runtime fail (production user impact).

  it('ble_uart_setup emits BleServerCallbacks with NimBLEConnInfo& signatures (onConnect / onDisconnect)', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ble_uart_setup">' +
      '<field name="NAME">Test</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.fullCode).toContain('void onConnect(NimBLEServer* s, NimBLEConnInfo& connInfo)');
    expect(out.fullCode).toContain('void onDisconnect(NimBLEServer* s, NimBLEConnInfo& connInfo, int reason)');
    expect(out.fullCode).not.toMatch(/void onConnect\(NimBLEServer\* s\) \{/);
    expect(out.fullCode).not.toMatch(/void onDisconnect\(NimBLEServer\* s\) \{/);
  });

  it('ble_uart_setup emits BleRxCallbacks with NimBLEConnInfo& onWrite signature', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ble_uart_setup">' +
      '<field name="NAME">Test</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.fullCode).toContain('void onWrite(NimBLECharacteristic* c, NimBLEConnInfo& connInfo)');
    expect(out.fullCode).not.toMatch(/void onWrite\(NimBLECharacteristic\* c\) \{/);
  });

  it('ble_scan_start emits const NimBLEAdvertisedDevice* in onResult and ms-converted start()', () => {
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
    expect(out.fullCode).toContain('void onResult(const NimBLEAdvertisedDevice* d)');
    expect(out.fullCode).not.toMatch(/void onResult\(NimBLEAdvertisedDevice\* d\)/);
    // duration sec → ms conversion at emit
    expect(out.fullCode).toContain('pScan->start(5 * 1000, false)');
    expect(out.fullCode).not.toMatch(/pScan->start\(5, false\)/);
  });

  it('ble_uart_setup emits enableScanResponse + setName before start — NimBLE v2 (BUG-069 round 2)', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ble_uart_setup">' +
      '<field name="NAME">DigiCodeTest</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    // NimBLE v2: scan response default OFF + advertising name default 非自動
    // → 両方 enable しないと name が advertising に乗らない (round 1 = setName のみは
    // 12+ byte name で primary adv 31-byte 制限超過 → silently drop)
    expect(out.fullCode).toContain('pAdv->enableScanResponse(true)');
    expect(out.fullCode).toContain('pAdv->setName("DigiCodeTest")');
    // 順序: enableScanResponse → setName → start (setName 内で m_scanResp 参照)
    const enableIdx = out.fullCode.indexOf('pAdv->enableScanResponse(true)');
    const setNameIdx = out.fullCode.indexOf('pAdv->setName(');
    const startIdx = out.fullCode.indexOf('pAdv->start()');
    expect(enableIdx).toBeGreaterThan(0);
    expect(enableIdx).toBeLessThan(setNameIdx);
    expect(setNameIdx).toBeLessThan(startIdx);
  });

  it('ble_init emits enableScanResponse + setName via getAdvertising() — NimBLE v2 (BUG-069 round 2)', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ble_init">' +
      '<field name="NAME">GattDevice</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    // GATT custom path も同様に enableScanResponse(true) + setName(name) を pre-set
    expect(out.fullCode).toContain('NimBLEDevice::getAdvertising()->enableScanResponse(true)');
    expect(out.fullCode).toContain('NimBLEDevice::getAdvertising()->setName("GattDevice")');
    // 順序: enableScanResponse → setName (setName 内で m_scanResp 参照のため)
    const enableIdx = out.fullCode.indexOf('NimBLEDevice::getAdvertising()->enableScanResponse(true)');
    const setNameIdx = out.fullCode.indexOf('NimBLEDevice::getAdvertising()->setName(');
    expect(enableIdx).toBeGreaterThan(0);
    expect(enableIdx).toBeLessThan(setNameIdx);
  });

  it('ble_add_characteristic (write) emits GattWriteCallbacks with NimBLEConnInfo& onWrite signature', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ble_init">' +
      '<field name="NAME">Test</field>' +
      '<next>' +
      '<block type="ble_add_service">' +
      '<field name="UUID">12345678-1234-1234-1234-123456789ABC</field>' +
      '<next>' +
      '<block type="ble_add_characteristic">' +
      '<field name="SERVICE_UUID">12345678-1234-1234-1234-123456789ABC</field>' +
      '<field name="CHAR_UUID">00001111-1234-1234-1234-123456789ABC</field>' +
      '<field name="READ">FALSE</field>' +
      '<field name="WRITE">TRUE</field>' +
      '<field name="NOTIFY">FALSE</field>' +
      '</block>' +
      '</next>' +
      '</block>' +
      '</next>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    // GattWriteCallbacks must use the v2 onWrite signature (NimBLECharacteristic*, NimBLEConnInfo&)
    expect(out.fullCode).toContain('class GattWriteCallbacks');
    expect(out.fullCode).toMatch(/GattWriteCallbacks[\s\S]*void onWrite\(NimBLECharacteristic\* c, NimBLEConnInfo& connInfo\)/);
  });
});

describe('xmlToCpp — HASensorNumber setValue overload disambiguation (BUG-066)', () => {
  // ArduinoHA v2.1 HASensorNumber::setValue is generated via _SET_VALUE_OVERLOAD
  // macro for uint16_t / uint32_t / float; passing an int from math_number is
  // ambiguous and fails compile. ha_sensor_create initializes with PrecisionP1
  // so float is the design intent — emit static_cast<float> to disambiguate.
  it('ha_sensor_update emits static_cast<float> wrapping the value', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ha_sensor_create">' +
      '<field name="DEVICE_CLASS">temperature</field>' +
      '<field name="SENSOR_ID">temperature</field>' +
      '<field name="NAME">温度</field>' +
      '<field name="UNIT">°C</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350">' +
      '<statement name="LOOP">' +
      '<block type="ha_sensor_update">' +
      '<field name="SENSOR_ID">temperature</field>' +
      '<value name="VALUE">' +
      '<block type="math_number"><field name="NUM">25</field></block>' +
      '</value>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.fullCode).toContain('haSensor_temperature.setValue(static_cast<float>(25))');
    // The bare `setValue(25)` form (without cast) must not appear — that's the
    // exact pattern that triggers the ambiguous-overload error.
    expect(out.fullCode).not.toMatch(/setValue\(25\)(?!\s*\)|;)/);
  });
});

describe('xmlToCpp — Serial2 redundant declaration removed (BUG-067)', () => {
  // arduino-esp32 v3.x ships Serial2 as a definition in
  // cores/esp32/HardwareSerial.cpp:49. Re-declaring it in user globals causes
  // a linker `multiple definition of 'Serial2'` error. Generator must use the
  // framework-provided Serial2 directly without emitting `HardwareSerial Serial2(2);`.
  it('serial2_begin does not emit a redundant HardwareSerial Serial2(2) declaration', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="serial2_begin">' +
      '<field name="BAUD">9600</field>' +
      '<field name="RX">16</field>' +
      '<field name="TX">17</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    // Generator must still emit the begin call against the framework Serial2
    expect(out.fullCode).toContain('Serial2.begin(9600, SERIAL_8N1, 16, 17)');
    // But must NOT redeclare Serial2 — the framework already does this.
    expect(out.fullCode).not.toMatch(/HardwareSerial\s+Serial2\s*\(\s*2\s*\)\s*;/);
  });
});

describe('xmlToCpp — ArduinoHA defensive include (BUG-057)', () => {
  // ha_xxx_create generators declare globals with HA classes (HASensorNumber,
  // HALight, ...). Before BUG-057, only ha_device_init emitted
  // `#include <ArduinoHA.h>`, so any case using ha_sensor_create alone (no
  // ha_device_init) failed with "'HASensorNumber' does not name a type".
  // The fix adds an idempotent ensureArduinoHAInclude() call to every HA
  // forBlock generator.
  it('ha_sensor_create alone (no ha_device_init) emits <ArduinoHA.h>', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="arduino_setup" x="50" y="50">' +
      '<statement name="SETUP">' +
      '<block type="ha_sensor_create">' +
      '<field name="SENSOR_ID">temperature</field>' +
      '<field name="NAME">温度</field>' +
      '<field name="DEVICE_CLASS">temperature</field>' +
      '<field name="UNIT">°C</field>' +
      '</block>' +
      '</statement>' +
      '</block>' +
      '<block type="arduino_loop" x="50" y="350"></block>' +
      '</xml>';
    const out = xmlToCpp(xml);
    expect(out.fullCode).toContain('#include <ArduinoHA.h>');
    expect(out.fullCode).toContain('HASensorNumber haSensor_temperature');
  });
});
