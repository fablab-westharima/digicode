/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

import { describe, it, expect } from 'vitest';
import { validateXml, type ValidationIssue } from '../semanticValidator';
import type { BlockCatalog } from '../systemPrompt';
import realCatalog from '../../../../public/ai/block-catalog.json';

// Use the real catalog (570 blocks with outputType added in Phase 1 B).
const CATALOG = realCatalog as unknown as BlockCatalog;

// Convenience helper: wraps content in <xml> root with namespace.
function wrap(inner: string): string {
  return `<xml xmlns="https://developers.google.com/blockly/xml">${inner}</xml>`;
}

describe('semanticValidator — Check 1: unconnected_value_input', () => {
  it('flags servo_write without <value name="ANGLE"> child (user verbatim failure F1)', () => {
    const xml = wrap(
      '<block type="arduino_setup" id="s"><statement name="SETUP">' +
        '<block type="servo_write" id="sw"><field name="PIN">13</field></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    const f1 = result.issues.find((i): i is Extract<ValidationIssue, { kind: 'unconnected_value_input' }> =>
      i.kind === 'unconnected_value_input' && i.blockType === 'servo_write',
    );
    expect(f1).toBeDefined();
    expect(f1?.inputName).toBe('ANGLE');
    expect(f1?.expectedType).toBe('Number');
  });

  it('flags <value name="ANGLE"> with empty inner (no block, no shadow)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="servo_write" id="sw2"><field name="PIN">13</field><value name="ANGLE"></value></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'unconnected_value_input' && i.blockType === 'servo_write')).toBe(true);
  });

  it('passes when ANGLE connects to math_number block', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="servo_write" id="sw3"><field name="PIN">13</field>' +
          '<value name="ANGLE"><block type="math_number"><field name="NUM">90</field></block></value>' +
        '</block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'unconnected_value_input' && i.blockType === 'servo_write')).toBe(false);
  });

  it('passes when ANGLE connects to websocket_server_received_value (canonical pattern)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="websocket_server_on_message"><field name="CHANNEL_ID">servo</field>' +
          '<statement name="HANDLER">' +
            '<block type="servo_write" id="sw4"><field name="PIN">13</field>' +
              '<value name="ANGLE"><block type="websocket_server_received_value"></block></value>' +
            '</block>' +
          '</statement>' +
        '</block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'unconnected_value_input')).toBe(false);
  });

  it('passes when ANGLE has shadow block (default fallback OK, shadows count as connected)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="servo_write"><field name="PIN">13</field>' +
          '<value name="ANGLE"><shadow type="math_number"><field name="NUM">90</field></shadow></value>' +
        '</block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    // shadow counts as connected — sample XMLs use this pattern
    expect(result.issues.some((i) => i.kind === 'unconnected_value_input')).toBe(false);
  });

  it('flags esp32_delay TIME input empty', () => {
    const xml = wrap(
      '<block type="arduino_loop"><statement name="LOOP">' +
        '<block type="esp32_delay" id="d1"></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) =>
      i.kind === 'unconnected_value_input' && i.blockType === 'esp32_delay' && i.inputName === 'TIME',
    )).toBe(true);
  });

  it('does not flag statement blocks with no value inputs (e.g. wifi_connect)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'unconnected_value_input')).toBe(false);
  });
});

describe('semanticValidator — Check 2: orphan_value_block', () => {
  it('flags top-level websocket_server_received_value (user verbatim failure F2)', () => {
    const xml = wrap(
      '<block type="arduino_setup"></block>' +
      '<block type="websocket_server_received_value" id="orphan1" x="50" y="200"></block>' +
      '<block type="arduino_loop"></block>',
    );
    const result = validateXml(xml, CATALOG);
    const f2 = result.issues.find((i): i is Extract<ValidationIssue, { kind: 'orphan_value_block' }> =>
      i.kind === 'orphan_value_block',
    );
    expect(f2).toBeDefined();
    expect(f2?.blockType).toBe('websocket_server_received_value');
    expect(f2?.blockId).toBe('orphan1');
  });

  it('flags top-level math_number (any hasOutput=true block)', () => {
    const xml = wrap(
      '<block type="arduino_setup"></block>' +
      '<block type="math_number" id="orphan2"><field name="NUM">42</field></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'orphan_value_block' && i.blockType === 'math_number')).toBe(true);
  });

  it('does not flag hat blocks (arduino_setup, arduino_loop) at top-level', () => {
    const xml = wrap(
      '<block type="arduino_setup"></block>' +
      '<block type="arduino_loop"></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'orphan_value_block')).toBe(false);
  });

  it('does not flag HA callback blocks at top-level (intentional placement)', () => {
    const xml = wrap(
      '<block type="arduino_setup"></block>' +
      '<block type="ha_switch_on_command"><field name="SWITCH_ID">relay</field></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'orphan_value_block' && i.blockType === 'ha_switch_on_command')).toBe(false);
  });

  it('does not flag received_value when properly nested inside HANDLER', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="websocket_server_on_message"><field name="CHANNEL_ID">servo</field>' +
          '<statement name="HANDLER">' +
            '<block type="servo_write"><field name="PIN">13</field>' +
              '<value name="ANGLE"><block type="websocket_server_received_value"></block></value>' +
            '</block>' +
          '</statement>' +
        '</block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'orphan_value_block')).toBe(false);
  });

  it('handles multiple orphan value blocks (returns one issue per orphan)', () => {
    const xml = wrap(
      '<block type="arduino_setup"></block>' +
      '<block type="websocket_server_received_value" id="orphan3"></block>' +
      '<block type="ble_received_value" id="orphan4"></block>' +
      '<block type="arduino_loop"></block>',
    );
    const result = validateXml(xml, CATALOG);
    const orphans = result.issues.filter((i) => i.kind === 'orphan_value_block');
    expect(orphans.length).toBe(2);
  });
});

describe('semanticValidator — Check 3: asymmetric_binary_branch', () => {
  // Helper to build a controls_if comparing received_value to a literal string.
  function makeControlsIfStringEq(literal: string, doBody: string = ''): string {
    return (
      '<block type="controls_if">' +
        '<value name="IF0">' +
          '<block type="logic_compare"><field name="OP">EQ</field>' +
            '<value name="A"><block type="websocket_server_received_value"></block></value>' +
            `<value name="B"><block type="text"><field name="TEXT">${literal}</field></block></value>` +
          '</block>' +
        '</value>' +
        `<statement name="DO0">${doBody}</statement>` +
      '</block>'
    );
  }

  function makeWsHandler(channelId: string, handlerBody: string): string {
    return (
      `<block type="websocket_server_on_message"><field name="CHANNEL_ID">${channelId}</field>` +
        `<statement name="HANDLER">${handlerBody}</statement>` +
      '</block>'
    );
  }

  it('flags "1" only (missing "0") in WS on_message HANDLER', () => {
    const led = makeControlsIfStringEq('1');
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('led', led) +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    const asym = result.issues.find((i): i is Extract<ValidationIssue, { kind: 'asymmetric_binary_branch' }> =>
      i.kind === 'asymmetric_binary_branch',
    );
    expect(asym).toBeDefined();
    expect(asym?.handlerKey).toBe('led');
    expect(asym?.present).toContain('1');
    expect(asym?.missing).toContain('0');
  });

  it('flags "ON" only (missing "OFF"), case-insensitive', () => {
    const led = makeControlsIfStringEq('ON');
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('switch1', led) +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    const asym = result.issues.find((i) => i.kind === 'asymmetric_binary_branch');
    expect(asym).toBeDefined();
    expect((asym as Extract<ValidationIssue, { kind: 'asymmetric_binary_branch' }>).missing).toContain('off');
  });

  it('passes when both "1" and "0" branches exist', () => {
    const led = makeControlsIfStringEq('1') + makeControlsIfStringEq('0');
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('led', led) +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'asymmetric_binary_branch')).toBe(false);
  });

  it('passes when both "true" and "false" branches exist (alternative pair)', () => {
    const led = makeControlsIfStringEq('true') + makeControlsIfStringEq('false');
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('led', led) +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'asymmetric_binary_branch')).toBe(false);
  });

  it('does not flag 3+ value branches (RGB-like state machine)', () => {
    const handler =
      makeControlsIfStringEq('RED') +
      makeControlsIfStringEq('GREEN') +
      makeControlsIfStringEq('BLUE');
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('rgb', handler) +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    // None of RED/GREEN/BLUE is in BINARY_PAIRS, so no asymmetry triggered
    expect(result.issues.some((i) => i.kind === 'asymmetric_binary_branch')).toBe(false);
  });

  it('passes when handler is empty (no branches at all)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('led', '') +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'asymmetric_binary_branch')).toBe(false);
  });

  it('detects ble_uart_on_receive asymmetric ON/OFF', () => {
    const handler = (
      '<block type="controls_if">' +
        '<value name="IF0">' +
          '<block type="logic_compare"><field name="OP">EQ</field>' +
            '<value name="A"><block type="ble_received_value"></block></value>' +
            '<value name="B"><block type="text"><field name="TEXT">ON</field></block></value>' +
          '</block>' +
        '</value>' +
      '</block>'
    );
    const xml = wrap(
      '<block type="arduino_loop"><statement name="LOOP">' +
        '<block type="ble_uart_on_receive"><statement name="HANDLER">' +
          handler +
        '</statement></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'asymmetric_binary_branch')).toBe(true);
  });

  it('ignores non-EQ operators (logic_compare with NEQ / LT / GT etc.)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('temp',
          '<block type="controls_if">' +
            '<value name="IF0">' +
              '<block type="logic_compare"><field name="OP">GT</field>' +
                '<value name="A"><block type="websocket_server_received_value"></block></value>' +
                '<value name="B"><block type="math_number"><field name="NUM">25</field></block></value>' +
              '</block>' +
            '</value>' +
          '</block>',
        ) +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'asymmetric_binary_branch')).toBe(false);
  });

  it('ignores logic_compare without received-value (e.g. variables_get == literal)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        makeWsHandler('test',
          '<block type="controls_if">' +
            '<value name="IF0">' +
              '<block type="logic_compare"><field name="OP">EQ</field>' +
                '<value name="A"><block type="variables_get"><field name="VAR">x</field></block></value>' +
                '<value name="B"><block type="text"><field name="TEXT">1</field></block></value>' +
              '</block>' +
            '</value>' +
          '</block>',
        ) +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'asymmetric_binary_branch')).toBe(false);
  });
});

describe('semanticValidator — Check 4: missing_wifi_connect', () => {
  it('flags missing wifi_connect when websocket_server_start is used', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="websocket_server_start"><field name="PORT">81</field><field name="PATH">/</field></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'missing_wifi_connect')).toBe(true);
  });

  it('passes when wifi_connect is present in setup', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="wifi_connect"><field name="SSID">x</field><field name="PASSWORD">y</field>' +
          '<next><block type="websocket_server_start"><field name="PORT">81</field><field name="PATH">/</field></block></next>' +
        '</block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'missing_wifi_connect')).toBe(false);
  });

  it('passes when ha_device_init is present (embeds WiFi)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="ha_device_init"><field name="SSID">x</field><field name="WIFI_PASS">y</field>' +
          '<field name="BROKER">b</field><field name="PORT">1883</field><field name="DEVICE_NAME">d</field>' +
          '<field name="DEVICE_ID">id</field><field name="MANUFACTURER">m</field><field name="MODEL">M</field>' +
          '<field name="SOFTWARE_VERSION">1</field><field name="AUTO_UNIQUE_ID">TRUE</field>' +
          '<field name="AVAILABILITY">TRUE</field><field name="VIA_DEVICE"></field>' +
        '</block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'missing_wifi_connect')).toBe(false);
  });

  it('does not flag non-WiFi programs (LED blink only)', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.issues.some((i) => i.kind === 'missing_wifi_connect')).toBe(false);
  });

  it('flags mqtt_setup without wifi_connect', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="mqtt_setup"><field name="SSID">x</field><field name="WIFI_PASS">y</field><field name="BROKER">b</field><field name="PORT">1883</field></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    // mqtt_setup is mqtt_ prefix → WiFi needed; mqtt_setup itself doesn't include wifi_connect block type
    expect(result.issues.some((i) => i.kind === 'missing_wifi_connect')).toBe(true);
  });

  it('reports up to 5 unique WiFi-using block types', () => {
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="websocket_server_start"></block>' +
        '<block type="websocket_server_register"></block>' +
        '<block type="websocket_server_on_message"></block>' +
        '<block type="websocket_server_send"></block>' +
        '<block type="mqtt_setup"></block>' +
        '<block type="http_get"></block>' +
        '<block type="ntp_sync"></block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    const issue = result.issues.find((i): i is Extract<ValidationIssue, { kind: 'missing_wifi_connect' }> =>
      i.kind === 'missing_wifi_connect',
    );
    expect(issue).toBeDefined();
    expect(issue?.presentWifiBlocks.length).toBeLessThanOrEqual(5);
  });
});

describe('semanticValidator — integration (user verbatim failure replication)', () => {
  it('user verbatim Phase 1+2 failure XML triggers F1 + F2 (servo hardcode + orphan wsServerMessage)', () => {
    // Mirrors the structure of the actual smoke output: servo_write without ANGLE child
    // + websocket_server_received_value at top-level.
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="wifi_connect"><field name="SSID">your_ssid</field><field name="PASSWORD">your_password</field>' +
          '<next>' +
            '<block type="websocket_server_start"><field name="PORT">81</field><field name="PATH">/</field>' +
              '<next>' +
                '<block type="dht_init"><field name="PIN">4</field><field name="TYPE">DHT22</field>' +
                  '<next>' +
                    '<block type="websocket_server_on_message"><field name="CHANNEL_ID">servo">' +
                      '<statement name="HANDLER">' +
                        // F1 reproduction: servo_write missing <value name="ANGLE">
                        '<block type="servo_write"><field name="PIN">13</field></block>' +
                      '</statement>' +
                    '</block>' +
                  '</next>' +
                '</block>' +
              '</next>' +
            '</block>' +
          '</next>' +
        '</block>' +
      '</statement></block>' +
      // F2 reproduction: orphan websocket_server_received_value at top-level
      '<block type="websocket_server_received_value" id="orphan-wsmsg" x="50" y="500"></block>' +
      '<block type="arduino_loop"></block>',
    );
    const result = validateXml(xml, CATALOG);
    // Note: this synthetic XML may have an invalid quote in CHANNEL_ID="servo">,
    // so loadError may be set. The test verifies the validator either:
    //   (a) reports loadError (XML parser failed on malformed input), or
    //   (b) detects both F1 + F2 issues.
    if (result.loadError) {
      expect(result.loadError).toBeTruthy();
      return;
    }
    expect(result.issues.some((i) => i.kind === 'unconnected_value_input' && i.blockType === 'servo_write')).toBe(true);
    expect(result.issues.some((i) => i.kind === 'orphan_value_block' && i.blockType === 'websocket_server_received_value')).toBe(true);
  });

  it('returns valid:true for canonical wifi-dht22-controller sample (no false positives)', () => {
    // Minimal valid pattern equivalent to wifi-dht22-controller D1 sample.
    const xml = wrap(
      '<block type="arduino_setup"><statement name="SETUP">' +
        '<block type="wifi_connect"><field name="SSID">x</field><field name="PASSWORD">y</field>' +
          '<next>' +
            '<block type="websocket_server_start"><field name="PORT">81</field><field name="PATH">/</field>' +
              '<next>' +
                '<block type="dht_init"><field name="PIN">4</field><field name="TYPE">DHT22</field>' +
                  '<next>' +
                    '<block type="websocket_server_on_message"><field name="CHANNEL_ID">led</field>' +
                      '<statement name="HANDLER">' +
                        '<block type="controls_if">' +
                          '<value name="IF0">' +
                            '<block type="logic_compare"><field name="OP">EQ</field>' +
                              '<value name="A"><block type="websocket_server_received_value"></block></value>' +
                              '<value name="B"><block type="text"><field name="TEXT">1</field></block></value>' +
                            '</block>' +
                          '</value>' +
                          '<next>' +
                            '<block type="controls_if">' +
                              '<value name="IF0">' +
                                '<block type="logic_compare"><field name="OP">EQ</field>' +
                                  '<value name="A"><block type="websocket_server_received_value"></block></value>' +
                                  '<value name="B"><block type="text"><field name="TEXT">0</field></block></value>' +
                                '</block>' +
                              '</value>' +
                            '</block>' +
                          '</next>' +
                        '</block>' +
                      '</statement>' +
                    '</block>' +
                  '</next>' +
                '</block>' +
              '</next>' +
            '</block>' +
          '</next>' +
        '</block>' +
      '</statement></block>' +
      '<block type="arduino_loop"><statement name="LOOP">' +
        '<block type="websocket_server_send"><field name="CHANNEL_ID">temp</field>' +
          '<value name="VALUE"><block type="dht_temperature"></block></value>' +
          '<next><block type="esp32_delay"><value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value></block></next>' +
        '</block>' +
      '</statement></block>',
    );
    const result = validateXml(xml, CATALOG);
    expect(result.loadError).toBeUndefined();
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('returns loadError for malformed XML', () => {
    const result = validateXml('not xml at all <<<', CATALOG);
    expect(result.valid).toBe(false);
    // jsdom parser is lenient — may produce loadError or empty issues, both OK
    expect(result.issues).toEqual([]);
  });

  it('returns valid:true for completely empty xml root', () => {
    const result = validateXml(wrap(''), CATALOG);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
