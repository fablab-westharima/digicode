/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

import { describe, it, expect } from 'vitest';
import { buildFixPrompt } from '../fixPromptBuilder';
import type { ValidationIssue } from '../semanticValidator';
import type { AiLanguage } from '@/data/aiSystemPrompts';

const SAMPLE_XML = '<xml><block type="servo_write"><field name="PIN">13</field></block></xml>';

const LANGS: AiLanguage[] = ['ja', 'en', 'zh-TW', 'es', 'pt-PT'];

describe('fixPromptBuilder — structure', () => {
  it('includes issue list + rules reminder + previous XML in 5 lang prompts', () => {
    const issue: ValidationIssue = {
      kind: 'unconnected_value_input',
      blockType: 'servo_write',
      blockId: 'sw1',
      inputName: 'ANGLE',
      expectedType: 'Number',
    };

    for (const lang of LANGS) {
      const prompt = buildFixPrompt(SAMPLE_XML, [issue], lang);
      // Each prompt mentions: servo_write, ANGLE, the sample XML
      expect(prompt).toContain('servo_write');
      expect(prompt).toContain('ANGLE');
      expect(prompt).toContain(SAMPLE_XML);
      // BUG-085 reminder rules present
      expect(prompt).toContain('valueInput');
    }
  });

  it('numbers each issue (1. 2. 3...)', () => {
    const issues: ValidationIssue[] = [
      { kind: 'unconnected_value_input', blockType: 'servo_write', blockId: 'a', inputName: 'ANGLE', expectedType: 'Number' },
      { kind: 'orphan_value_block', blockType: 'websocket_server_received_value', blockId: 'b' },
      { kind: 'missing_wifi_connect', presentWifiBlocks: ['websocket_server_start'] },
    ];
    const prompt = buildFixPrompt(SAMPLE_XML, issues, 'ja');
    expect(prompt).toContain('1.');
    expect(prompt).toContain('2.');
    expect(prompt).toContain('3.');
  });
});

describe('fixPromptBuilder — Check 1 (unconnected_value_input) per language', () => {
  const issue: ValidationIssue = {
    kind: 'unconnected_value_input',
    blockType: 'servo_write',
    blockId: 'sw1',
    inputName: 'ANGLE',
    expectedType: 'Number',
  };

  it('ja mentions auto-coerce hint', () => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], 'ja');
    expect(p).toContain('auto-coerce');
  });
  it('en mentions auto-coerce hint', () => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], 'en');
    expect(p).toContain('auto-coerced');
  });
  it('zh-TW mentions 自動 coerce hint', () => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], 'zh-TW');
    expect(p).toContain('自動 coerce');
  });
  it('es mentions auto-coerced hint', () => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], 'es');
    expect(p).toContain('auto-coerced');
  });
  it('pt-PT mentions auto-coerced hint', () => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], 'pt-PT');
    expect(p).toContain('auto-coerced');
  });
});

describe('fixPromptBuilder — Check 2 (orphan_value_block) per language', () => {
  const issue: ValidationIssue = {
    kind: 'orphan_value_block',
    blockType: 'websocket_server_received_value',
    blockId: 'orphan1',
  };

  it('all langs mention wsServerMessage anti-example', () => {
    for (const lang of LANGS) {
      const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
      expect(p).toContain('wsServerMessage');
    }
  });

  it('all langs mention top-level keyword', () => {
    for (const lang of LANGS) {
      const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
      expect(p).toContain('top-level');
    }
  });
});

describe('fixPromptBuilder — Check 3 (asymmetric_binary_branch) per language', () => {
  const issue: ValidationIssue = {
    kind: 'asymmetric_binary_branch',
    handlerType: 'websocket_server_on_message',
    handlerKey: 'led',
    present: ['1'],
    missing: ['0'],
  };

  it('all langs mention controls_if + both branches required', () => {
    for (const lang of LANGS) {
      const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
      expect(p).toContain('controls_if');
    }
  });

  it('mentions the present + missing literal values', () => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], 'ja');
    expect(p).toContain('"1"');
    expect(p).toContain('"0"');
  });
});

describe('fixPromptBuilder — Check 4 (missing_wifi_connect) per language', () => {
  const issue: ValidationIssue = {
    kind: 'missing_wifi_connect',
    presentWifiBlocks: ['websocket_server_start', 'websocket_server_register'],
  };

  it('all langs mention wifi_connect + arduino_setup', () => {
    for (const lang of LANGS) {
      const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
      expect(p).toContain('wifi_connect');
      expect(p).toContain('arduino_setup');
    }
  });
});

describe('fixPromptBuilder — multi-issue prompt', () => {
  it('handles all 4 issue kinds combined', () => {
    const issues: ValidationIssue[] = [
      { kind: 'unconnected_value_input', blockType: 'servo_write', blockId: 'sw', inputName: 'ANGLE', expectedType: 'Number' },
      { kind: 'orphan_value_block', blockType: 'websocket_server_received_value', blockId: 'orphan' },
      { kind: 'asymmetric_binary_branch', handlerType: 'websocket_server_on_message', handlerKey: 'led', present: ['1'], missing: ['0'] },
      { kind: 'missing_wifi_connect', presentWifiBlocks: ['websocket_server_start'] },
    ];
    const prompt = buildFixPrompt(SAMPLE_XML, issues, 'en');
    expect(prompt).toContain('1.');
    expect(prompt).toContain('2.');
    expect(prompt).toContain('3.');
    expect(prompt).toContain('4.');
    expect(prompt).toContain('servo_write');
    expect(prompt).toContain('orphan');
    expect(prompt).toContain('led');
    expect(prompt).toContain('wifi_connect');
  });
});

// ---------------------------------------------------------------------------
// BUG-086 Session 133 (Check 6): register_without_handler per language
// ---------------------------------------------------------------------------

describe('fixPromptBuilder — Check 6 (register_without_handler) per language', () => {
  const idKeyedIssue: ValidationIssue = {
    kind: 'register_without_handler',
    contractId: 'websocket-server',
    registerType: 'websocket_server_register',
    handlerType: 'websocket_server_on_message',
    idField: 'CHANNEL_ID',
    missingId: 'servo',
    protocolLabel: 'WebSocket server',
  };

  const globalIssue: ValidationIssue = {
    kind: 'register_without_handler',
    contractId: 'mqtt-subscribe',
    registerType: 'mqtt_subscribe',
    handlerType: 'mqtt_on_message',
    idField: null,
    missingId: '__global__',
    protocolLabel: 'MQTT Subscribe',
  };

  it.each(LANGS)('id-keyed (WebSocket) issue: lang=%s mentions registerType + handlerType + idField + missingId + protocolLabel', (lang) => {
    const p = buildFixPrompt(SAMPLE_XML, [idKeyedIssue], lang);
    expect(p).toContain('websocket_server_register');
    expect(p).toContain('websocket_server_on_message');
    expect(p).toContain('CHANNEL_ID');
    expect(p).toContain('servo');
    expect(p).toContain('WebSocket server');
  });

  it.each(LANGS)('global (MQTT) issue: lang=%s mentions registerType + handlerType + global indicator', (lang) => {
    const p = buildFixPrompt(SAMPLE_XML, [globalIssue], lang);
    expect(p).toContain('mqtt_subscribe');
    expect(p).toContain('mqtt_on_message');
    expect(p).toContain('MQTT Subscribe');
    expect(p).toContain('global');
  });

  it('multi-protocol issues coexist in a single fix prompt', () => {
    const issues: ValidationIssue[] = [
      idKeyedIssue,
      {
        kind: 'register_without_handler',
        contractId: 'ha-switch',
        registerType: 'ha_switch_create',
        handlerType: 'ha_switch_on_command',
        idField: 'SWITCH_ID',
        missingId: 'relay',
        protocolLabel: 'HA Switch',
      },
      globalIssue,
    ];
    const p = buildFixPrompt(SAMPLE_XML, issues, 'en');
    expect(p).toContain('1.');
    expect(p).toContain('2.');
    expect(p).toContain('3.');
    expect(p).toContain('websocket_server_register');
    expect(p).toContain('ha_switch_create');
    expect(p).toContain('mqtt_subscribe');
  });

  it('RULES_REMINDER includes BUG-086 cross-block contract rule in all langs', () => {
    for (const lang of LANGS) {
      const p = buildFixPrompt(SAMPLE_XML, [idKeyedIssue], lang);
      expect(p).toContain('BUG-086');
    }
  });
});

// ---------------------------------------------------------------------------
// BUG-086 Session 133 (Check 7): xml_structural_malformed per language
// ---------------------------------------------------------------------------

describe('fixPromptBuilder — Check 7 (xml_structural_malformed) per language', () => {
  const issue: ValidationIssue = {
    kind: 'xml_structural_malformed',
    parseErrorSnippet: '1:1304: unexpected close tag.',
  };

  it.each(LANGS)('lang=%s mentions parse error + well-formed regen hint', (lang) => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
    expect(p).toContain('parse error');
    expect(p).toContain('1304'); // snippet substring
    expect(p).toContain('<block>'); // well-formedness hint mentions <block>
  });
});

// ---------------------------------------------------------------------------
// BUG-086 Session 133 (Check 8): controls_if_anomaly_no_body per language
// ---------------------------------------------------------------------------

describe('fixPromptBuilder — Check 8 (controls_if_anomaly_no_body) per language', () => {
  const issue: ValidationIssue = {
    kind: 'controls_if_anomaly_no_body',
    conditionBlockType: 'mpu6050_init',
    controlIfBlockId: 'if1',
  };

  it.each(LANGS)('lang=%s mentions controls_if + conditionBlockType + DO0 hint', (lang) => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
    expect(p).toContain('controls_if');
    expect(p).toContain('mpu6050_init');
    expect(p).toContain('DO0');
  });
});

// ---------------------------------------------------------------------------
// BUG-086 Session 133 (Check 9): missing_required_init per language
// ---------------------------------------------------------------------------

describe('fixPromptBuilder — Check 9 (missing_required_init) per language', () => {
  const issue: ValidationIssue = {
    kind: 'missing_required_init',
    contractId: 'espnow',
    protocolLabel: 'ESP-NOW',
    consumerBlocks: ['espnow_send'],
    requiredInitOptions: ['espnow_init'],
  };

  it.each(LANGS)('lang=%s mentions protocolLabel + consumer + init', (lang) => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
    expect(p).toContain('ESP-NOW');
    expect(p).toContain('espnow_send');
    expect(p).toContain('espnow_init');
  });
});

// ---------------------------------------------------------------------------
// BUG-086 Session 133 (Check 10): handler_nested_inside_handler per language
// ---------------------------------------------------------------------------

describe('fixPromptBuilder — Check 10 (handler_nested_inside_handler) per language', () => {
  const issue: ValidationIssue = {
    kind: 'handler_nested_inside_handler',
    innerHandlerType: 'websocket_server_on_message',
    innerHandlerId: 'inner1',
    outerHandlerType: 'websocket_server_on_message',
    outerHandlerId: 'outer1',
  };

  it.each(LANGS)('lang=%s mentions both inner + outer handler types + top-level hint', (lang) => {
    const p = buildFixPrompt(SAMPLE_XML, [issue], lang);
    expect(p).toContain('websocket_server_on_message');
    // top-level placement keyword (varies per lang but always references arduino_setup/loop)
    expect(p.toLowerCase()).toMatch(/arduino_setup|arduino_loop|top.?level/);
  });
});
