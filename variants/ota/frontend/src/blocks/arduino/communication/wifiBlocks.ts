/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * WiFi 接続ブロック
 *
 * 2026-04-20 BP1-2b で新規作成。
 * 既存の WiFi 接続は OTA / MQTT / Home Assistant ブロックの副作用として各所に
 * コピーされていたが、純粋な「WiFi に接続するだけ」のブロックが存在しなかったため新設。
 *
 * DigiCode は ESP32 系 16 boards 専用 (56.md 2026-05-05、RP2040 系削除)。
 * `#include <WiFi.h>` (espressif 内蔵) を固定使用。
 *
 * 既存の otaWifiConnect / mqtt_wifi_connect_func / ha_wifi_connect_func とは独立した
 * wifiConnect(ssid, password) 関数を生成する。definitions_ による重複排除で同じ
 * #include は自動的にまとめられる。
 *
 * i18n: Blockly.Msg.* パターンで 5 言語動的切替（ルール33）。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

// definitions_ を初期化（他の blocks と同じ安全策）
if (!generator.definitions_) {
  generator.definitions_ = {};
}

const WIFI_COLOR = '#00BCD4'; // シアン系、通信カテゴリ色

/**
 * wifi_connect - WiFi 接続（SSID / パスワード指定）
 *
 * ESP32 系の WiFi.h API
 * （WiFi.begin() / WiFi.status() / WiFi.localIP()）を利用する。
 */
Blockly.Blocks['wifi_connect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📶 ' + (Blockly.Msg.BLOCKS_WIFI_CONNECT || 'Connect WiFi'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WIFI_SSID || 'SSID')
        .appendField(new Blockly.FieldTextInput('your_ssid'), 'SSID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WIFI_PASSWORD || 'WiFi Password')
        .appendField(new Blockly.FieldTextInput('your_password'), 'PASSWORD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WIFI_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WIFI_CONNECTTOOLTIP || 'Connect to a WiFi network using SSID and password');
  }
};

javascriptGenerator.forBlock['wifi_connect'] = function(block: Blockly.Block) {
  const ssid = block.getFieldValue('SSID');
  const password = block.getFieldValue('PASSWORD');

  generator.definitions_['include_wifi'] = '#include <WiFi.h>';

  // 共通 WiFi 接続関数（MQTT/HA/OTA 側のコピー実装とは独立）。
  generator.definitions_['wifi_connect_func'] = `
void wifiConnect(const char* ssid, const char* password) {
  Serial.print("WiFi connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi Connection Failed");
  }
}`;

  return `  wifiConnect("${ssid}", "${password}");\n`;
};

console.log('WiFi blocks loaded');
