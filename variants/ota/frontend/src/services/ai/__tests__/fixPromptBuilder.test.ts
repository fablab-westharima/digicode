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
