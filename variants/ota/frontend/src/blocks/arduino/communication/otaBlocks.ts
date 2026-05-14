/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * OTA（Over-The-Air）アップデートブロック
 * ArduinoOTAライブラリを使用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// 型アサーション用のヘルパー
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

// ===== OTA基本設定 =====

/**
 * ota_setup - OTA設定
 */
Blockly.Blocks['ota_setup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_OTA_SETUP || 'OTA Setup'));
    this.appendDummyInput()
        .appendField('WiFi SSID')
        .appendField(new Blockly.FieldTextInput('your_ssid'), 'SSID');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WIFI_PASSWORD || 'WiFi Password')
        .appendField(new Blockly.FieldTextInput('your_password'), 'WIFI_PASS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_OTA_HOSTNAME || 'Hostname')
        .appendField(new Blockly.FieldTextInput('esp32-ota'), 'HOSTNAME');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_OTA_PASSWORD || 'OTA Password')
        .appendField(new Blockly.FieldTextInput(''), 'OTA_PASS')
        .appendField(Blockly.Msg.BLOCKS_OTA_EMPTYNOAUTH || '(empty for no auth)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_OTA_SETUPTOOLTIP || 'Setup OTA for firmware updates over WiFi');
  }
};

javascriptGenerator.forBlock['ota_setup'] = function(block: Blockly.Block) {
  const ssid = block.getFieldValue('SSID');
  const wifiPass = block.getFieldValue('WIFI_PASS');
  const hostname = block.getFieldValue('HOSTNAME');
  const otaPass = block.getFieldValue('OTA_PASS');

  generator.definitions_['include_wifi'] = '#include <WiFi.h>';
  generator.definitions_['include_arduinoota'] = '#include <ArduinoOTA.h>';
  // case 19 axis 2 (Session 119 G17): ota_setup singleton、二重 init で SSID/password/
  // connect 関数の silent 上書きを first-wins で防御。
  if (!generator.definitions_['ota_ssid']) {
    generator.definitions_['ota_ssid'] = `const char* ota_ssid = "${ssid}";`;
  }
  if (!generator.definitions_['ota_wifi_pass']) {
    generator.definitions_['ota_wifi_pass'] = `const char* ota_wifi_pass = "${wifiPass}";`;
  }

  if (!generator.definitions_['ota_wifi_connect']) {
    generator.definitions_['ota_wifi_connect'] = `
void otaWifiConnect() {
  Serial.print("WiFi connecting to ");
  Serial.println(ota_ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ota_ssid, ota_wifi_pass);
  while (WiFi.waitForConnectResult() != WL_CONNECTED) {
    Serial.println("WiFi Connection Failed! Rebooting...");
    delay(5000);
    ESP.restart();
  }
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}`;
  }

  let otaSetup = `  // OTA Setup
  otaWifiConnect();
  ArduinoOTA.setHostname("${hostname}");
`;

  if (otaPass && otaPass.length > 0) {
    otaSetup += `  ArduinoOTA.setPassword("${otaPass}");\n`;
  }

  otaSetup += `
  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH) {
      type = "sketch";
    } else {
      type = "filesystem";
    }
    Serial.println("OTA Start: " + type);
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\\nOTA End");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("OTA Progress: %u%%\\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("OTA Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });
  ArduinoOTA.begin();
  Serial.println("OTA Ready");
`;

  return otaSetup;
};

/**
 * ota_setup_simple - 簡易OTA設定
 */
Blockly.Blocks['ota_setup_simple'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_OTA_SETUPSIMPLE || 'Simple OTA Setup'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_OTA_HOSTNAME || 'Hostname')
        .appendField(new Blockly.FieldTextInput('esp32-ota'), 'HOSTNAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_OTA_SETUPSIMPLETOOLTIP || 'Enable OTA when WiFi is already connected (use after mqtt_setup or ha_device_init)');
  }
};

javascriptGenerator.forBlock['ota_setup_simple'] = function(block: Blockly.Block) {
  const hostname = block.getFieldValue('HOSTNAME');

  generator.definitions_['include_arduinoota'] = '#include <ArduinoOTA.h>';

  return `  // OTA Setup (Simple)
  ArduinoOTA.setHostname("${hostname}");
  ArduinoOTA.onStart([]() {
    Serial.println("OTA Start");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\\nOTA End");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("OTA Progress: %u%%\\r", (progress / (total / 100)));
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("OTA Error[%u]\\n", error);
  });
  ArduinoOTA.begin();
  Serial.println("OTA Ready");
`;
};

/**
 * ota_loop - OTAループ処理
 */
Blockly.Blocks['ota_loop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_OTA_LOOP || 'OTA Loop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_OTA_LOOPTOOLTIP || 'Check for OTA updates. Call in loop().');
  }
};

javascriptGenerator.forBlock['ota_loop'] = function() {
  // post-Phase 4-4 commit 2-10 fix (case_0370):
  // Standalone `ota_loop` (without ota_setup or ota_setup_simple) failed with
  // "'ArduinoOTA' was not declared in this scope" — the ArduinoOTA singleton
  // is declared in <ArduinoOTA.h>, so any block that touches it must emit the
  // include. ota_get_hostname (line 184) already does this; ota_loop now
  // matches that parallel structure. emits: include_arduinoota.
  // requires: ArduinoOTA.begin() (provided by ota_setup / ota_setup_simple at
  // runtime — combo strategy auto-prepends one of them via INIT_DEPENDENCIES).
  generator.definitions_['include_arduinoota'] = '#include <ArduinoOTA.h>';
  return `  /* requires: ArduinoOTA (include_arduinoota) */ ArduinoOTA.handle();\n`;
};

// ===== OTA状態 =====

/**
 * ota_get_hostname - OTAホスト名取得
 */
Blockly.Blocks['ota_get_hostname'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_OTA_GETHOSTNAME || 'OTA Hostname'));
    this.setOutput(true, 'String');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_OTA_GETHOSTNAMETOOLTIP || 'Get the configured OTA hostname');
  }
};

javascriptGenerator.forBlock['ota_get_hostname'] = function() {
  generator.definitions_['include_arduinoota'] = '#include <ArduinoOTA.h>';
  return ['ArduinoOTA.getHostname()', Order.FUNCTION_CALL];
};

// ===== ESP再起動 =====

/**
 * esp_restart - ESP32再起動
 */
Blockly.Blocks['esp_restart'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + (Blockly.Msg.BLOCKS_ESP_RESTART || 'Restart ESP32'));
    this.setPreviousStatement(true, null);
    this.setColour('#f44336');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_RESTARTTOOLTIP || 'Restart the ESP32');
  }
};

javascriptGenerator.forBlock['esp_restart'] = function() {
  return `  ESP.restart();\n`;
};

/**
 * esp_deep_sleep - ディープスリープ
 */
Blockly.Blocks['esp_deep_sleep'] = {
  init: function() {
    this.appendValueInput('SECONDS')
        .setCheck('Number')
        .appendField('😴 ' + (Blockly.Msg.BLOCKS_ESP_DEEPSLEEP || 'Deep Sleep'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_UNIT_SECONDS || 'seconds');
    this.setPreviousStatement(true, null);
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_DEEPSLEEPTOOLTIP || 'Enter deep sleep for the specified seconds (power saving mode)');
  }
};

javascriptGenerator.forBlock['esp_deep_sleep'] = function(block: Blockly.Block) {
  const seconds = javascriptGenerator.valueToCode(block, 'SECONDS', Order.ATOMIC) || '60';

  return `  esp_sleep_enable_timer_wakeup(${seconds} * 1000000ULL);
  esp_deep_sleep_start();
`;
};

/**
 * esp_light_sleep - ライトスリープ
 */
Blockly.Blocks['esp_light_sleep'] = {
  init: function() {
    this.appendValueInput('SECONDS')
        .setCheck('Number')
        .appendField('💤 ' + (Blockly.Msg.BLOCKS_ESP_LIGHTSLEEP || 'Light Sleep'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_UNIT_SECONDS || 'seconds');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_LIGHTSLEEPTOOLTIP || 'Enter light sleep for the specified seconds (continues execution after waking)');
  }
};

javascriptGenerator.forBlock['esp_light_sleep'] = function(block: Blockly.Block) {
  const seconds = javascriptGenerator.valueToCode(block, 'SECONDS', Order.ATOMIC) || '60';

  return `  esp_sleep_enable_timer_wakeup(${seconds} * 1000000ULL);
  esp_light_sleep_start();
`;
};

// ===== ウォッチドッグ (commit 5、汎用 ESP32 reliability) =====

/**
 * watchdog_enable - ウォッチドッグタイマー有効化 (commit 5)
 *
 * ESP32 task watchdog timer (TWDT) を有効化、loop ハングアップを検出して
 * panic + 自動再起動。汎用 ESP32 reliability 機能で HA とは独立 (HA 不使用
 * project / BLE / WiFi 単独 user にも採用可)。
 *
 * ESP-IDF v5.x 新 signature `esp_task_wdt_init(const esp_task_wdt_config_t*)`
 * 確定 (TQ-4 resolved、commit 0 smoke 3a 成功 + smoke 3b で旧 v4 signature
 * `(uint32_t, bool)` の compile fail 実証)。compat shim 不在のため新 form
 * のみ採用。詳細 = `prompt/maintenance/HA-impl-commit0-smoke-results-2026-05-09.md`
 *
 * 設計 (D-5.3): trigger_panic = true 固定 (graceful no-panic handler は polish phase)。
 * idle_core_mask = 0 = 全 core 監視 (loop task は esp_task_wdt_add(NULL) で
 * 明示登録、loopPre_ の esp_task_wdt_reset() で毎 iter tick)。
 *
 * Loop reset emission via loopPre_ (rule 03 "Loop-side dedupe"、placement-
 * independent、複数 watchdog_enable 配置でも reset 1 回のみ inject)。
 */
Blockly.Blocks['watchdog_enable'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛡️ ' + (Blockly.Msg.BLOCKS_WATCHDOG_ENABLE || 'Watchdog Enable'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_WATCHDOG_TIMEOUTSEC || 'Timeout (s)')
        .appendField(new Blockly.FieldNumber(60, 1, 3600), 'TIMEOUT_SEC');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_WATCHDOG_ENABLETOOLTIP || 'Enable ESP32 task watchdog timer. If loop() blocks longer than the timeout, the ESP32 panics and auto-restarts. Place inside arduino_setup. Set the timeout above your longest expected loop iteration; long blocking calls (HTTP, OTA download) should be split or call esp_task_wdt_reset() manually.');
  }
};

javascriptGenerator.forBlock['watchdog_enable'] = function(block: Blockly.Block) {
  const timeoutRaw = parseInt(block.getFieldValue('TIMEOUT_SEC') || '60', 10);
  const timeout = Number.isFinite(timeoutRaw) && timeoutRaw >= 1 ? timeoutRaw : 60;

  generator.definitions_['include_esp_task_wdt'] = '#include <esp_task_wdt.h>';

  // loopPre_ via rule 03 "Loop-side dedupe": placement-independent, single
  // injection regardless of how many watchdog_enable blocks are placed.
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['watchdog_reset'] = '  esp_task_wdt_reset();';

  return `  // Watchdog enable (panic on ${timeout}s timeout)
  esp_task_wdt_config_t _wdtConfig = {
    .timeout_ms = ${timeout * 1000}UL,
    .idle_core_mask = 0,
    .trigger_panic = true
  };
  esp_task_wdt_init(&_wdtConfig);
  esp_task_wdt_add(NULL);
`;
};

// ===== ESP情報取得 =====

/**
 * esp_get_free_heap - 空きヒープメモリ取得
 */
Blockly.Blocks['esp_get_free_heap'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📊 ' + (Blockly.Msg.BLOCKS_ESP_GETFREEHEAP || 'Free Memory (bytes)'));
    this.setOutput(true, 'Number');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_GETFREEHEAPTOOLTIP || 'Get free heap memory in bytes');
  }
};

javascriptGenerator.forBlock['esp_get_free_heap'] = function() {
  return ['ESP.getFreeHeap()', Order.FUNCTION_CALL];
};

/**
 * esp_get_chip_id - チップID取得
 */
Blockly.Blocks['esp_get_chip_id'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔖 ' + (Blockly.Msg.BLOCKS_ESP_GETCHIPID || 'ESP Chip ID'));
    this.setOutput(true, 'String');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_GETCHIPIDTOOLTIP || 'Get the unique chip ID of the ESP32');
  }
};

javascriptGenerator.forBlock['esp_get_chip_id'] = function() {
  generator.definitions_['esp_chip_id_func'] = `
String getChipId() {
  uint64_t chipid = ESP.getEfuseMac();
  char chipIdStr[17];
  sprintf(chipIdStr, "%04X%08X", (uint16_t)(chipid >> 32), (uint32_t)chipid);
  return String(chipIdStr);
}`;

  return ['getChipId()', Order.FUNCTION_CALL];
};

/**
 * esp_get_cpu_freq - CPU周波数取得
 */
Blockly.Blocks['esp_get_cpu_freq'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_ESP_GETCPUFREQ || 'CPU Frequency (MHz)'));
    this.setOutput(true, 'Number');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_GETCPUFREQTOOLTIP || 'Get CPU frequency in MHz');
  }
};

javascriptGenerator.forBlock['esp_get_cpu_freq'] = function() {
  return ['ESP.getCpuFreqMHz()', Order.FUNCTION_CALL];
};

/**
 * esp_get_flash_size - フラッシュサイズ取得
 */
Blockly.Blocks['esp_get_flash_size'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💾 ' + (Blockly.Msg.BLOCKS_ESP_GETFLASHSIZE || 'Flash Size (bytes)'));
    this.setOutput(true, 'Number');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_GETFLASHSIZETOOLTIP || 'Get flash memory size in bytes');
  }
};

javascriptGenerator.forBlock['esp_get_flash_size'] = function() {
  return ['ESP.getFlashChipSize()', Order.FUNCTION_CALL];
};

/**
 * esp_get_sketch_size - スケッチサイズ取得
 */
Blockly.Blocks['esp_get_sketch_size'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📏 ' + (Blockly.Msg.BLOCKS_ESP_GETSKETCHSIZE || 'Sketch Size (bytes)'));
    this.setOutput(true, 'Number');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_GETSKETCHSIZETOOLTIP || 'Get current sketch size in bytes');
  }
};

javascriptGenerator.forBlock['esp_get_sketch_size'] = function() {
  return ['ESP.getSketchSize()', Order.FUNCTION_CALL];
};

/**
 * esp_get_free_sketch_space - 空きスケッチスペース取得
 */
Blockly.Blocks['esp_get_free_sketch_space'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📏 ' + (Blockly.Msg.BLOCKS_ESP_GETFREESKETCHSPACE || 'Free Sketch Space (bytes)'));
    this.setOutput(true, 'Number');
    this.setColour('#607D8B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP_GETFREESKETCHSPACETOOLTIP || 'Get free sketch space for OTA in bytes');
  }
};

javascriptGenerator.forBlock['esp_get_free_sketch_space'] = function() {
  return ['ESP.getFreeSketchSpace()', Order.FUNCTION_CALL];
};

console.log('OTA blocks loaded');
