/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * Google Services ブロック (51.md Phase A+B、第79回 commit #8 / 2026-05-04)
 *
 * 2 ブロック構成:
 *   - google_sheets_append      (statement、URL/DATA)
 *   - google_sheets_format_row  (String output、TS/VAL → JSON string)
 *
 * 内部 lib: なし (WiFi.h + WiFiClientSecure.h + HTTPClient.h、ESP32 core 組込み)
 * boardRequires: supportsWifi (Sheets) / null (format_row、純 string 操作)
 *
 * Google Sheets: ユーザー作成の Apps Script Webhook URL に POST する pattern。
 * 制限: ~10 req/sec (51.md §12 R-13)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const GOOGLE_COLOR = '#0F9D58';

// post-Phase 4-4 commit 2-9 fix (case_0323):
// Originally `GOOGLE_SHEETS_HELPER` bundled both `googleSheetsAppend` (uses
// WiFi/WiFiClientSecure/HTTPClient) and `googleSheetsFormatRow` (pure String
// op). Standalone `google_sheets_format_row` emitted the bundled helper but
// not `include_google_sheets`, leaking WiFi references into a sketch with no
// WiFi.h include → `'WiFi' was not declared in this scope` etc. Split into
// two helpers so each block emits only what it actually needs.
// emits (append): include_google_sheets + GOOGLE_SHEETS_APPEND_HELPER + GOOGLE_SHEETS_FORMAT_ROW_HELPER
// emits (format_row): GOOGLE_SHEETS_FORMAT_ROW_HELPER only (pure String, no WiFi)

const GOOGLE_SHEETS_APPEND_HELPER = `
// 51.md commit #8: Google Sheets Apps Script Webhook helper (HTTPClient + TLS)
bool googleSheetsAppend(const String& url, const String& data) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, url)) return false;
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(data);
  http.end();
  return code >= 200 && code < 300;
}`;

const GOOGLE_SHEETS_FORMAT_ROW_HELPER = `
// 51.md commit #8: pure String formatting (no WiFi dependency)
String googleSheetsFormatRow(const String& ts, const String& val) {
  String out = "{\\"ts\\":\\"";
  out += ts; out += "\\",\\"val\\":\\""; out += val; out += "\\"}";
  return out;
}`;

Blockly.Blocks['google_sheets_append'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📊 ' + (Blockly.Msg.BLOCKS_GOOGLE_SHEETS_APPEND || 'Google スプレッドシートに追記'));
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_GOOGLE_SHEETS_URL || 'Webhook URL');
    this.appendValueInput('DATA')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_GOOGLE_SHEETS_DATA || 'データ (JSON)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GOOGLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_GOOGLE_SHEETS_APPEND_TOOLTIP || 'Google Apps Script の Webhook URL に JSON を POST してスプレッドシートに 1 行追加します。WiFi 接続必須。Apps Script 側で doPost(e) を実装して Sheet.appendRow() してください。');
  }
};

generator.forBlock['google_sheets_append'] = function(block: Blockly.Block) {
  const url = generator.valueToCode(block, 'URL', Order.ATOMIC) || '""';
  const data = generator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
  generator.definitions_['include_google_sheets'] = '#include <WiFi.h>\n#include <WiFiClientSecure.h>\n#include <HTTPClient.h>';
  // append needs both helpers (append calls into nothing, but format_row may be
  // co-emitted in the same sketch; declaring both is the safe superset).
  generator.definitions_['google_sheets_append_helper'] = GOOGLE_SHEETS_APPEND_HELPER;
  generator.definitions_['google_sheets_format_row_helper'] = GOOGLE_SHEETS_FORMAT_ROW_HELPER;
  return `googleSheetsAppend(${url}, ${data});\n`;
};

Blockly.Blocks['google_sheets_format_row'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📊 ' + (Blockly.Msg.BLOCKS_GOOGLE_SHEETS_FORMAT_ROW || 'スプレッドシート行形式'));
    this.appendValueInput('TS')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_GOOGLE_SHEETS_TS || 'タイムスタンプ');
    this.appendValueInput('VAL')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_GOOGLE_SHEETS_VAL || '値');
    this.setOutput(true, 'String');
    this.setColour(GOOGLE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_GOOGLE_SHEETS_FORMAT_ROW_TOOLTIP || 'タイムスタンプと値を JSON 形式 ({"ts":"...","val":"..."}) に整形して返します。google_sheets_append の DATA 入力に渡せます。');
  }
};

generator.forBlock['google_sheets_format_row'] = function(block: Blockly.Block) {
  const ts = generator.valueToCode(block, 'TS', Order.ATOMIC) || '""';
  const val = generator.valueToCode(block, 'VAL', Order.ATOMIC) || '""';
  // format_row is a pure String formatter — only emit the format_row helper,
  // no WiFi/HTTPClient includes needed (commit 2-9 case_0323 fix).
  generator.definitions_['google_sheets_format_row_helper'] = GOOGLE_SHEETS_FORMAT_ROW_HELPER;
  return [`googleSheetsFormatRow(String(${ts}), String(${val}))`, Order.FUNCTION_CALL];
};

console.log('Google Services (Sheets) blocks loaded');
