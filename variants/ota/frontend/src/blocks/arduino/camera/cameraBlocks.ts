/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * カメラブロック (BP7-1, 2026-04-20)
 *
 * esp_camera.h は ESP32 Arduino コア組み込みのため追加ライブラリ不要
 * 対応モデル: ESP32-CAM / XIAO ESP32S3 Sense / M5Camera PSRAM / M5Camera Wide / M5Stack UnitCAM
 * ピン設定はモデル選択で自動決定（ユーザーはピン指定不要）
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const CAM_COLOR = '#212121';

// カメラモデル別ピン定義
const CAMERA_PINS: Record<string, Record<string, number>> = {
  AI_THINKER:       { pwdn: 32, reset: -1, xclk: 0,  siod: 26, sioc: 27, y9: 35, y8: 34, y7: 39, y6: 36, y5: 21, y4: 19, y3: 18, y2: 5,  vsync: 25, href: 23, pclk: 22 },
  XIAO_ESP32S3:     { pwdn: -1, reset: -1, xclk: 10, siod: 40, sioc: 39, y9: 48, y8: 11, y7: 12, y6: 14, y5: 16, y4: 18, y3: 17, y2: 15, vsync: 38, href: 47, pclk: 13 },
  M5STACK_PSRAM:    { pwdn: -1, reset: 15, xclk: 27, siod: 22, sioc: 23, y9: 19, y8: 36, y7: 18, y6: 39, y5: 5,  y4: 34, y3: 35, y2: 32, vsync: 25, href: 26, pclk: 21 },
  M5STACK_WIDE:     { pwdn: -1, reset: 15, xclk: 27, siod: 22, sioc: 23, y9: 19, y8: 36, y7: 18, y6: 39, y5: 5,  y4: 34, y3: 35, y2: 32, vsync: 25, href: 26, pclk: 21 },
  M5STACK_UNITCAM:  { pwdn: -1, reset: 15, xclk: 27, siod: 25, sioc: 23, y9: 19, y8: 36, y7: 18, y6: 39, y5: 5,  y4: 34, y3: 35, y2: 32, vsync: 22, href: 26, pclk: 21 },
};

const CAM_GLOBALS = `
#include "esp_camera.h"
camera_fb_t* camFb = nullptr;`;

/**
 * camera_init - カメラ初期化（モデル選択でピン自動設定）
 */
Blockly.Blocks['camera_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📷 ' + (Blockly.Msg.BLOCKS_CAM_INIT || 'Camera Init'))
        .appendField(new Blockly.FieldDropdown([
          ['ESP32-CAM (AI-Thinker)', 'AI_THINKER'],
          ['XIAO ESP32S3 Sense', 'XIAO_ESP32S3'],
          ['M5Camera (PSRAM)', 'M5STACK_PSRAM'],
          ['M5Camera Wide', 'M5STACK_WIDE'],
          ['M5Stack UnitCAM', 'M5STACK_UNITCAM'],
        ]), 'MODEL');
    this.setOutput(true, 'Boolean');
    this.setColour(CAM_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAM_INITTOOLTIP || 'Initialize camera. Select your board model — all pins are automatically configured. Returns true if successful. Call in setup block.');
  }
};

generator.forBlock['camera_init'] = function(block: Blockly.Block) {
  const model = block.getFieldValue('MODEL');
  const p = CAMERA_PINS[model] || CAMERA_PINS['AI_THINKER'];
  generator.definitions_['include_camera'] = CAM_GLOBALS;
  return [`([&](){
  camera_config_t camCfg;
  camCfg.ledc_channel = LEDC_CHANNEL_0;
  camCfg.ledc_timer   = LEDC_TIMER_0;
  camCfg.pin_d0 = ${p.y2}; camCfg.pin_d1 = ${p.y3}; camCfg.pin_d2 = ${p.y4}; camCfg.pin_d3 = ${p.y5};
  camCfg.pin_d4 = ${p.y6}; camCfg.pin_d5 = ${p.y7}; camCfg.pin_d6 = ${p.y8}; camCfg.pin_d7 = ${p.y9};
  camCfg.pin_xclk = ${p.xclk}; camCfg.pin_pclk = ${p.pclk};
  camCfg.pin_vsync = ${p.vsync}; camCfg.pin_href = ${p.href};
  camCfg.pin_sscb_sda = ${p.siod}; camCfg.pin_sscb_scl = ${p.sioc};
  camCfg.pin_pwdn = ${p.pwdn}; camCfg.pin_reset = ${p.reset};
  camCfg.xclk_freq_hz = 20000000;
  camCfg.pixel_format = PIXFORMAT_JPEG;
  camCfg.frame_size = FRAMESIZE_QVGA;
  camCfg.jpeg_quality = 12;
  camCfg.fb_count = 1;
  return esp_camera_init(&camCfg) == ESP_OK;
})()`, 0];
};

/**
 * camera_capture - 画像撮影（内部バッファに保存）
 */
Blockly.Blocks['camera_capture'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📷 ' + (Blockly.Msg.BLOCKS_CAM_CAPTURE || 'Camera Capture'));
    this.setOutput(true, 'Boolean');
    this.setColour(CAM_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAM_CAPTURETOOLTIP || 'Take a photo and store in internal buffer. Returns true if successful. Call camera_save_sd or camera_send_http to use the captured image.');
  }
};

generator.forBlock['camera_capture'] = function() {
  generator.definitions_['include_camera'] = CAM_GLOBALS;
  return [`([&](){
  if (camFb) { esp_camera_fb_return(camFb); camFb = nullptr; }
  camFb = esp_camera_fb_get();
  return camFb != nullptr;
})()`, 0];
};

/**
 * camera_save_sd - 撮影画像を SD カードに保存
 */
Blockly.Blocks['camera_save_sd'] = {
  init: function() {
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField('📷 ' + (Blockly.Msg.BLOCKS_CAM_SAVESD || 'Camera Save SD'));
    this.setOutput(true, 'Boolean');
    this.setColour(CAM_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAM_SAVESDTOOLTIP || 'Save the captured image to SD card as JPEG. Call camera_capture first. Returns true if saved successfully. Requires SD to be initialized (sd_begin block).');
  }
};

generator.forBlock['camera_save_sd'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/photo.jpg"';
  // post-Phase 4-4 commit 11 fix (case_0498):
  // 旧実装は `File f = SD.open(...)` を emit するが <SD.h> include 不在で
  // `'File' was not declared in this scope` でコンパイル fail。`File` 型は
  // arduino-esp32 の framework-shipped SD lib (`SD.h`) で declare される。
  // BUG-068 (第60回 closure) で `lib_ignore = SD` を compile.ts に追加して
  // registry SD lib を除外する fix は適用済だが、generator side で <SD.h>
  // を emit する責務は別途残っていた = systematic 設計欠陥。
  // 注: SD.begin() は user (or 別 init block) 側で呼び出す前提を維持
  // (camera_save_sd 自体には pin 引数なし、SD card module の SS pin は
  // board ごとに異なるため init を勝手に injecting しない設計判断)。
  // emits: include_camera (esp_camera + camFb) + include_sd (SD.h) /
  // requires: SD initialized (SD.begin() を user 側 setup で実行済)
  generator.definitions_['include_camera'] = CAM_GLOBALS;
  generator.definitions_['include_sd'] = '#include <SD.h>\n#include <SPI.h>';
  return [`([&](){
  if (!camFb) return false;
  /* requires: SD initialized */ File f = SD.open(${filename}, FILE_WRITE);
  if (!f) return false;
  f.write(camFb->buf, camFb->len);
  f.close();
  esp_camera_fb_return(camFb);
  camFb = nullptr;
  return true;
})()`, 0];
};

/**
 * camera_send_http - 撮影画像を HTTP POST で送信
 */
Blockly.Blocks['camera_send_http'] = {
  init: function() {
    this.appendValueInput('URL')
        .setCheck('String')
        .appendField('📷 ' + (Blockly.Msg.BLOCKS_CAM_SENDHTTP || 'Camera Send HTTP'));
    this.setOutput(true, 'Boolean');
    this.setColour(CAM_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAM_SENDHTTPTOOLTIP || 'Send captured image via HTTP POST to a URL. Call camera_capture first. WiFi connection required. Returns true if sent successfully.');
  }
};

generator.forBlock['camera_send_http'] = function(block: Blockly.Block) {
  const url = javascriptGenerator.valueToCode(block, 'URL', 0) || '"http://192.168.1.100/upload"';
  generator.definitions_['include_camera'] = CAM_GLOBALS;
  generator.definitions_['include_httpclient'] = '#include <HTTPClient.h>';
  return [`([&](){
  if (!camFb) return false;
  HTTPClient http;
  http.begin(${url});
  http.addHeader("Content-Type", "image/jpeg");
  int code = http.POST(camFb->buf, camFb->len);
  http.end();
  esp_camera_fb_return(camFb);
  camFb = nullptr;
  return code == 200;
})()`, 0];
};

/**
 * camera_stream_start - MJPEG ストリームサーバー開始（WiFi 必須）
 */
Blockly.Blocks['camera_stream_start'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📷 ' + (Blockly.Msg.BLOCKS_CAM_STREAM || 'Camera Stream Start'))
        .appendField(Blockly.Msg.BLOCKS_CAM_PORT || 'port')
        .appendField(new Blockly.FieldNumber(81, 1, 65535), 'PORT');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(CAM_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAM_STREAMTOOLTIP || 'Start MJPEG streaming server on the specified port. WiFi required. View in browser: http://<ESP32-IP>:<port>/stream');
  }
};

generator.forBlock['camera_stream_start'] = function(block: Blockly.Block) {
  const port = block.getFieldValue('PORT');
  generator.definitions_['include_camera'] = CAM_GLOBALS;
  generator.definitions_['include_webserver'] = '#include <WebServer.h>';
  // case 19 axis 2 (Session 120): first-wins guard for streaming server port.
  // 2 個目の camera_stream_start (異 port) で silent overwrite を防ぐ。
  if (!generator.definitions_['cam_stream_server']) {
    generator.definitions_['cam_stream_server'] = `WebServer camStreamServer(${port});`;
  }
  // post-Phase 4-4 commit 12 fix (case_0500):
  // 旧実装は JS template literal で `\r\n` をそのまま記述、JS が \r/\n を
  // 実改行に展開して C++ 出力に literal newline 混入 → C++ string literal
  // は改行禁止のため切断、後続 `Content-Type:` が C++ identifier として
  // parse され `found ':' in nested-name-specifier, expected '::'` で fail。
  // Fix: JS 側で `\\r\\n` (double-escape) → C++ 出力に literal `\r\n`
  // (escape sequence) として残し HTTP CRLF を維持。
  // emits: include_camera + include_webserver + cam_stream_server +
  //        cam_stream_handler / requires: WiFi connected (user setup),
  //        camera initialized (via camera_init).
  generator.definitions_['cam_stream_handler'] = `
void handleCamStream() {
  WiFiClient client = camStreamServer.client();
  String resp = "HTTP/1.1 200 OK\\r\\nContent-Type: multipart/x-mixed-replace; boundary=frame\\r\\n\\r\\n";
  client.print(resp);
  while (client.connected()) {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) continue;
    client.printf("--frame\\r\\nContent-Type: image/jpeg\\r\\nContent-Length: %u\\r\\n\\r\\n", fb->len);
    client.write(fb->buf, fb->len);
    client.print("\\r\\n");
    esp_camera_fb_return(fb);
    delay(30);
  }
}`;
  return `  camStreamServer.on("/stream", handleCamStream);\n  camStreamServer.begin();\n`;
};

console.log('Camera blocks loaded');
