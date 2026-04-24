/**
 * WiFi 接続ブロック
 *
 * 2026-04-20 BP1-2b で新規作成。
 * 既存の WiFi 接続は OTA / MQTT / Home Assistant ブロックの副作用として各所に
 * コピーされていたが、純粋な「WiFi に接続するだけ」のブロックが存在しなかったため新設。
 *
 * 対応ボード:
 * - ESP32 ファミリー: `#include <WiFi.h>` (espressif 内蔵)
 * - Pico W (rp2040:rp2040:rpipicow): `#include <WiFi.h>` (arduino-pico 同梱、API 互換)
 * - Arduino Nano RP2040 Connect (arduino:mbed_nano:nanorp2040connect): `#include <WiFiNINA.h>`
 *   (NINA-W102 経由。WiFi.begin() / WiFi.status() / WiFi.localIP() の API は ESP32 と互換)
 *
 * ボード判定は useBoardStore の getSelectedBoard() を参照する。コンパイル時点で選択中の
 * ボードが固定されているため、generator 内でランタイム参照しても問題ない。
 *
 * 既存の otaWifiConnect / mqtt_wifi_connect_func / ha_wifi_connect_func とは独立した
 * wifiConnect(ssid, password) 関数を生成する。definitions_ による重複排除で同じ
 * #include は自動的にまとめられる。
 *
 * i18n: Blockly.Msg.* パターンで 5 言語動的切替（ルール33）。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { useBoardStore } from '@/stores/boardStore';

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
 * ESP32 / Pico W / Nano RP2040 Connect で共通の API
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

  // 選択中ボードによって WiFi ライブラリの #include を分岐
  // (Nano RP2040 Connect のみ WiFiNINA.h、それ以外は WiFi.h)
  const board = useBoardStore.getState().getSelectedBoard();
  const useWifiNINA = board.fqbn.startsWith('arduino:mbed_nano');
  generator.definitions_['include_wifi'] = useWifiNINA
    ? '#include <WiFiNINA.h>'
    : '#include <WiFi.h>';

  // 共通 WiFi 接続関数（MQTT/HA/OTA 側のコピー実装とは独立）
  // WiFi.begin() / WiFi.status() / WiFi.localIP() は
  // ESP32 WiFi.h / arduino-pico WiFi.h / WiFiNINA すべてで API 互換。
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
