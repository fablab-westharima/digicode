/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * ESP-NOW ブロック (51.md Phase A+B、第79回 commit #9 / 2026-05-04)
 *
 * 8 ブロック構成 (Fab Academy Networking 週の核機能):
 *   - espnow_init           (statement) — WiFi.mode(STA) + esp_now_init
 *   - espnow_register_peer  (statement, MAC) — esp_now_add_peer
 *   - espnow_send           (statement, MAC, DATA) — unicast
 *   - espnow_broadcast      (statement, DATA) — broadcast (FF:FF:FF:FF:FF:FF)
 *   - espnow_on_receive     (statement, HANDLER, loopPre_ パターン)
 *   - espnow_received_data  (String output, HANDLER 内専用)
 *   - espnow_received_mac   (String output, HANDLER 内専用)
 *   - espnow_get_my_mac     (String output)
 *
 * 内部 lib: なし (esp_now.h、ESP32 Arduino core 組込み)
 * boardRequires: supportsEspNow (51.md commit #3 で軸新設済、本 commit でカテゴリ activate)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const ESPNOW_COLOR = '#FF6F00';

const ESPNOW_INCLUDE = `#include <esp_now.h>
#include <WiFi.h>`;

const ESPNOW_GLOBALS = `String espnowReceivedData = "";
String espnowReceivedMac = "";
typedef void (*_EspNowRecvCallback)();
struct _EspNowRecvReg { static _EspNowRecvCallback _cb; _EspNowRecvReg(_EspNowRecvCallback cb) { _cb = cb; } };
volatile bool _espnowMsgPending = false;`;

const ESPNOW_GLOBALS_CB = `_EspNowRecvCallback _EspNowRecvReg::_cb = nullptr;`;

const ESPNOW_HELPER = `
// 51.md commit #9: ESP-NOW helpers (arduino-esp32 v3.x esp_now_recv_info_t signature)
// 注: arduino-esp32 v2.x signature は (const uint8_t* mac, const uint8_t* data, int len)、
//     v3.x は (const esp_now_recv_info_t* info, const uint8_t* data, int len)。
//     pioarduino image (commit #2 cutover 後) は v3.x ベース。
static void _espnowOnRecv(const esp_now_recv_info_t* info, const uint8_t* data, int len) {
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
           info->src_addr[0], info->src_addr[1], info->src_addr[2],
           info->src_addr[3], info->src_addr[4], info->src_addr[5]);
  espnowReceivedMac = String(macStr);
  espnowReceivedData = "";
  for (int i = 0; i < len; i++) espnowReceivedData += (char)data[i];
  _espnowMsgPending = true;
}

void espnowInit() {
  WiFi.mode(WIFI_STA);
  if (esp_now_init() != ESP_OK) {
    Serial.println("[espnow] init failed");
    return;
  }
  esp_now_register_recv_cb(_espnowOnRecv);
}

static bool _espnowParseMac(const String& macStr, uint8_t out[6]) {
  unsigned int b0, b1, b2, b3, b4, b5;
  if (sscanf(macStr.c_str(), "%x:%x:%x:%x:%x:%x", &b0, &b1, &b2, &b3, &b4, &b5) != 6) return false;
  out[0] = (uint8_t)b0; out[1] = (uint8_t)b1; out[2] = (uint8_t)b2;
  out[3] = (uint8_t)b3; out[4] = (uint8_t)b4; out[5] = (uint8_t)b5;
  return true;
}

void espnowRegisterPeer(const String& macStr) {
  uint8_t mac[6];
  if (!_espnowParseMac(macStr, mac)) return;
  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, mac, 6);
  peer.channel = 0;
  peer.encrypt = false;
  if (!esp_now_is_peer_exist(mac)) esp_now_add_peer(&peer);
}

void espnowSend(const String& macStr, const String& data) {
  uint8_t mac[6];
  if (!_espnowParseMac(macStr, mac)) return;
  if (!esp_now_is_peer_exist(mac)) {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, mac, 6);
    peer.channel = 0;
    peer.encrypt = false;
    esp_now_add_peer(&peer);
  }
  esp_now_send(mac, (const uint8_t*)data.c_str(), data.length());
}

void espnowBroadcast(const String& data) {
  static const uint8_t broadcastMac[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
  if (!esp_now_is_peer_exist(broadcastMac)) {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, broadcastMac, 6);
    peer.channel = 0;
    peer.encrypt = false;
    esp_now_add_peer(&peer);
  }
  esp_now_send(broadcastMac, (const uint8_t*)data.c_str(), data.length());
}

void espnowCheckRecv() {
  if (_espnowMsgPending) {
    _espnowMsgPending = false;
    if (_EspNowRecvReg::_cb) _EspNowRecvReg::_cb();
    espnowReceivedData = "";
    espnowReceivedMac = "";
  }
}`;

function emitEspnowDefs() {
  generator.definitions_['include_espnow'] = ESPNOW_INCLUDE;
  generator.definitions_['espnow_globals'] = ESPNOW_GLOBALS;
  generator.definitions_['espnow_globals_cb'] = ESPNOW_GLOBALS_CB;
  generator.definitions_['espnow_helper'] = ESPNOW_HELPER;
}

Blockly.Blocks['espnow_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_INIT || 'ESP-NOW を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_INIT_TOOLTIP || 'ESP-NOW を初期化します。WiFi STA モード + esp_now_init + 受信コールバック登録。ESP32 系のみ対応。');
  }
};

generator.forBlock['espnow_init'] = function() {
  emitEspnowDefs();
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['espnow_init'] = 'espnowInit();';
  return '';
};

Blockly.Blocks['espnow_register_peer'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_REGISTER_PEER || 'ESP-NOW ピア登録'));
    this.appendValueInput('MAC')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_ESPNOW_MAC || 'MAC アドレス');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_REGISTER_PEER_TOOLTIP || 'ESP-NOW ピアを事前登録します。MAC アドレスは "AA:BB:CC:DD:EE:FF" 形式。事前に espnow_init が必要。');
  }
};

generator.forBlock['espnow_register_peer'] = function(block: Blockly.Block) {
  const mac = generator.valueToCode(block, 'MAC', Order.ATOMIC) || '""';
  emitEspnowDefs();
  return `espnowRegisterPeer(${mac});\n`;
};

Blockly.Blocks['espnow_send'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_SEND || 'ESP-NOW 送信'));
    this.appendValueInput('MAC')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_ESPNOW_DEST_MAC || '宛先 MAC');
    this.appendValueInput('DATA')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_ESPNOW_DATA || 'データ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_SEND_TOOLTIP || '指定 MAC の ESP-NOW ピアに unicast 送信します。未登録なら自動 add_peer。事前に espnow_init 必須。');
  }
};

generator.forBlock['espnow_send'] = function(block: Blockly.Block) {
  const mac = generator.valueToCode(block, 'MAC', Order.ATOMIC) || '""';
  const data = generator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
  emitEspnowDefs();
  return `espnowSend(${mac}, String(${data}));\n`;
};

Blockly.Blocks['espnow_broadcast'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_BROADCAST || 'ESP-NOW ブロードキャスト'));
    this.appendValueInput('DATA')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_ESPNOW_DATA || 'データ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_BROADCAST_TOOLTIP || '全 ESP-NOW デバイス (FF:FF:FF:FF:FF:FF) に broadcast 送信します。事前に espnow_init 必須。');
  }
};

generator.forBlock['espnow_broadcast'] = function(block: Blockly.Block) {
  const data = generator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
  emitEspnowDefs();
  return `espnowBroadcast(String(${data}));\n`;
};

Blockly.Blocks['espnow_on_receive'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_ON_RECEIVE || 'ESP-NOW 受信したら'));
    this.appendStatementInput('HANDLER')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_ESPNOW_HANDLER || 'ハンドラ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_ON_RECEIVE_TOOLTIP || 'ESP-NOW メッセージを受信したときの処理を定義します。HANDLER 内で espnow_received_data / espnow_received_mac で値を取得。arduino_loop の中に配置してください。');
  }
};

generator.forBlock['espnow_on_receive'] = function(block: Blockly.Block) {
  const handler = javascriptGenerator.statementToCode(block, 'HANDLER');
  emitEspnowDefs();
  generator.definitions_['espnow_handler_func'] = `
void espnowHandleRecv() {
${handler}}
static _EspNowRecvReg _espnowRecvReg(espnowHandleRecv);`;
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['espnow_check_recv'] = '  espnowCheckRecv();';
  return '';
};

Blockly.Blocks['espnow_received_data'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_RECEIVED_DATA || 'ESP-NOW 受信データ'));
    this.setOutput(true, 'String');
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_RECEIVED_DATA_TOOLTIP || 'ESP-NOW 受信ハンドラ内で受信データを取得します。HANDLER 外で使うと空文字列を返します。');
  }
};

generator.forBlock['espnow_received_data'] = function() {
  emitEspnowDefs();
  return ['espnowReceivedData', Order.ATOMIC];
};

Blockly.Blocks['espnow_received_mac'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_RECEIVED_MAC || 'ESP-NOW 送信元 MAC'));
    this.setOutput(true, 'String');
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_RECEIVED_MAC_TOOLTIP || 'ESP-NOW 受信ハンドラ内で送信元 MAC を取得します ("AA:BB:CC:DD:EE:FF" 形式)。HANDLER 外で使うと空文字列。');
  }
};

generator.forBlock['espnow_received_mac'] = function() {
  emitEspnowDefs();
  return ['espnowReceivedMac', Order.ATOMIC];
};

Blockly.Blocks['espnow_get_my_mac'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_ESPNOW_GET_MY_MAC || '自機の MAC アドレス'));
    this.setOutput(true, 'String');
    this.setColour(ESPNOW_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ESPNOW_GET_MY_MAC_TOOLTIP || '自機の MAC アドレスを取得します ("AA:BB:CC:DD:EE:FF" 形式、WiFi STA mode の MAC)。');
  }
};

generator.forBlock['espnow_get_my_mac'] = function() {
  generator.definitions_['include_espnow'] = ESPNOW_INCLUDE;
  return ['WiFi.macAddress()', Order.FUNCTION_CALL];
};

console.log('ESP-NOW blocks loaded');
