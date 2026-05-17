/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

import { describe, it, expect, vi } from 'vitest';
import { generateAndValidate } from '../validationRetryOrchestrator';
import type {
  AIClient,
  GenerateFromConversationInput,
  GenerateOutput,
  ChatInput,
  ChatOutput,
} from '../index';
import type { BlockCatalog } from '../systemPrompt';
import realCatalog from '../../../../public/ai/block-catalog.json';

const CATALOG = realCatalog as unknown as BlockCatalog;

// Stub board for input shape compliance.
const FAKE_INPUT: GenerateFromConversationInput = {
  messages: [],
  generateRequest: 'test',
  language: 'ja',
  robotMode: 'all_blocks',
  board: {
    id: 'esp32',
    name: 'ESP32',
    fqbn: 'esp32:esp32:esp32',
    description: '',
    category: 'generic',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false,
    supportedFlashMethods: ['wifi', 'usb'],
  },
};

// Common XML strings.
const VALID_XML =
  '<xml xmlns="https://developers.google.com/blockly/xml">' +
    '<block type="arduino_setup"><statement name="SETUP">' +
      '<block type="esp32_pin_mode"><field name="PIN">2</field><field name="MODE">OUTPUT</field></block>' +
    '</statement></block>' +
  '</xml>';

const INVALID_XML_F1_F2 =
  '<xml xmlns="https://developers.google.com/blockly/xml">' +
    '<block type="arduino_setup"><statement name="SETUP">' +
      '<block type="wifi_connect"><field name="SSID">x</field><field name="PASSWORD">y</field>' +
        '<next>' +
          '<block type="websocket_server_on_message"><field name="CHANNEL_ID">servo">' +
            '<statement name="HANDLER">' +
              // F1: servo_write missing <value name="ANGLE">
              '<block type="servo_write"><field name="PIN">13</field></block>' +
            '</statement>' +
          '</block>' +
        '</next>' +
      '</block>' +
    '</statement></block>' +
    // F2: orphan websocket_server_received_value at top-level
    '<block type="websocket_server_received_value" id="orphan"></block>' +
  '</xml>';

// Cleaner invalid XML that the validator can fully parse + flag both F1 and F2.
const INVALID_XML_CLEAN =
  '<xml xmlns="https://developers.google.com/blockly/xml">' +
    '<block type="arduino_setup"><statement name="SETUP">' +
      '<block type="wifi_connect"><field name="SSID">x</field><field name="PASSWORD">y</field>' +
        '<next>' +
          '<block type="websocket_server_on_message"><field name="CHANNEL_ID">servo</field>' +
            '<statement name="HANDLER">' +
              '<block type="servo_write"><field name="PIN">13</field></block>' +  // F1: no ANGLE value child
            '</statement>' +
          '</block>' +
        '</next>' +
      '</block>' +
    '</statement></block>' +
    '<block type="websocket_server_received_value" id="orphan"></block>' +  // F2: orphan
  '</xml>';

function makeMockClient(xmls: string[]): AIClient {
  let callIndex = 0;
  return {
    chat: vi.fn(async (_input: ChatInput): Promise<ChatOutput> => ({ content: 'noop', tokensUsed: 0 })),
    generateFromConversation: vi.fn(async (_input: GenerateFromConversationInput): Promise<GenerateOutput> => {
      const xml = xmls[callIndex] ?? xmls[xmls.length - 1];
      callIndex++;
      return { xml, rawResponse: xml, attempts: 1 };
    }),
  };
}

describe('validationRetryOrchestrator — generateAndValidate', () => {
  it('0 retries when initial XML is valid', async () => {
    const client = makeMockClient([VALID_XML]);
    const result = await generateAndValidate(client, FAKE_INPUT, CATALOG);
    expect(result.semanticRetries).toBe(0);
    expect(result.totalCalls).toBe(1);
    expect(result.residualIssues).toEqual([]);
    expect(result.xml).toBe(VALID_XML);
  });

  it('1 retry when fix prompt produces valid XML', async () => {
    const client = makeMockClient([INVALID_XML_CLEAN, VALID_XML]);
    const result = await generateAndValidate(client, FAKE_INPUT, CATALOG);
    expect(result.semanticRetries).toBe(1);
    expect(result.totalCalls).toBe(2);
    expect(result.residualIssues).toEqual([]);
    expect(result.xml).toBe(VALID_XML);
  });

  it('3 retries when AI never fixes the issues, residualIssues set', async () => {
    // Same invalid XML returned for all calls — AI fails to fix.
    const client = makeMockClient([
      INVALID_XML_CLEAN,
      INVALID_XML_CLEAN,
      INVALID_XML_CLEAN,
      INVALID_XML_CLEAN,
    ]);
    const result = await generateAndValidate(client, FAKE_INPUT, CATALOG);
    expect(result.semanticRetries).toBe(3);
    expect(result.totalCalls).toBe(4); // 1 initial + 3 retries
    expect(result.residualIssues.length).toBeGreaterThan(0);
    // Both F1 (unconnected_value_input servo_write) and F2 (orphan) should remain
    expect(result.residualIssues.some((i) => i.kind === 'unconnected_value_input' && i.blockType === 'servo_write')).toBe(true);
    expect(result.residualIssues.some((i) => i.kind === 'orphan_value_block')).toBe(true);
  });

  it('respects maxRetries option (e.g. 2)', async () => {
    const client = makeMockClient([
      INVALID_XML_CLEAN,
      INVALID_XML_CLEAN,
      INVALID_XML_CLEAN,
    ]);
    const result = await generateAndValidate(client, FAKE_INPUT, CATALOG, { maxRetries: 2 });
    expect(result.semanticRetries).toBe(2);
    expect(result.totalCalls).toBe(3);
  });

  it('passes fix prompt as generateRequest on retries', async () => {
    const client = makeMockClient([INVALID_XML_CLEAN, VALID_XML]);
    await generateAndValidate(client, FAKE_INPUT, CATALOG);
    const calls = (client.generateFromConversation as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(2);
    // First call: generateRequest = 'test' (initial input)
    expect(calls[0][0].generateRequest).toBe('test');
    // Second call: generateRequest = fix prompt (contains issue list keywords)
    expect(calls[1][0].generateRequest).toContain('servo_write');
    expect(calls[1][0].generateRequest).toContain('valueInput');
  });
});
