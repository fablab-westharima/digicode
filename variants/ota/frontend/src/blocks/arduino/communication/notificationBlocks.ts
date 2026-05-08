/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * 通知ブロック (51.md Phase A+B、第79回 commit #8 / 2026-05-04)
 *
 * 1 ブロック構成:
 *   - pushover_send (statement、TOKEN/USER/MESSAGE/PRIORITY dropdown)
 *
 * 内部 lib: なし (WiFi.h + WiFiClientSecure.h + HTTPClient.h、ESP32 core 組込み)
 * boardRequires: supportsWifi
 *
 * Pushover API: POST https://api.pushover.net/1/messages.json (form-urlencoded)
 * Free tier: 10000 msg / month / app token (51.md §12 R-12)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const NOTIFICATION_COLOR = '#9C27B0';

const PUSHOVER_HELPER = `
// 51.md commit #8: Pushover notification helper (HTTPClient + TLS)
bool pushoverSend(const String& token, const String& user, const String& message, int priority) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  client.setInsecure();  // Pushover cert check skipped for simplicity (Phase D で root CA pin 候補)
  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(client, "https://api.pushover.net/1/messages.json")) return false;
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  String payload = "token=" + token + "&user=" + user + "&message=" + message + "&priority=" + String(priority);
  int code = http.POST(payload);
  http.end();
  return code == 200;
}`;

Blockly.Blocks['pushover_send'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔔 ' + (Blockly.Msg.BLOCKS_PUSHOVER_SEND || 'Pushover 通知を送信'));
    this.appendValueInput('TOKEN')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_PUSHOVER_TOKEN || 'App トークン');
    this.appendValueInput('USER')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_PUSHOVER_USER || 'ユーザーキー');
    this.appendValueInput('MESSAGE')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_PUSHOVER_MESSAGE || 'メッセージ');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_PUSHOVER_PRIORITY || '優先度')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_PUSHOVER_PRIORITY_LOWEST || '静音 (-2)', '-2'],
          [Blockly.Msg.BLOCKS_PUSHOVER_PRIORITY_LOW || '低 (-1)', '-1'],
          [Blockly.Msg.BLOCKS_PUSHOVER_PRIORITY_NORMAL || '通常 (0)', '0'],
          [Blockly.Msg.BLOCKS_PUSHOVER_PRIORITY_HIGH || '高 (1)', '1'],
          [Blockly.Msg.BLOCKS_PUSHOVER_PRIORITY_EMERGENCY || '緊急 (2)', '2'],
        ]), 'PRIORITY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NOTIFICATION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PUSHOVER_SEND_TOOLTIP || 'Pushover で通知を送信します。App トークン (アプリ作成時) と ユーザーキー (アカウントトップ画面) は pushover.net で取得。WiFi 接続必須。Free tier 10000 msg/月。');
  }
};

generator.forBlock['pushover_send'] = function(block: Blockly.Block) {
  const token = generator.valueToCode(block, 'TOKEN', Order.ATOMIC) || '""';
  const user = generator.valueToCode(block, 'USER', Order.ATOMIC) || '""';
  const message = generator.valueToCode(block, 'MESSAGE', Order.ATOMIC) || '""';
  const priority = block.getFieldValue('PRIORITY');
  generator.definitions_['include_pushover'] = '#include <WiFi.h>\n#include <WiFiClientSecure.h>\n#include <HTTPClient.h>';
  generator.definitions_['pushover_helper'] = PUSHOVER_HELPER;
  return `pushoverSend(${token}, ${user}, ${message}, ${priority});\n`;
};

console.log('Notification (Pushover) blocks loaded');
