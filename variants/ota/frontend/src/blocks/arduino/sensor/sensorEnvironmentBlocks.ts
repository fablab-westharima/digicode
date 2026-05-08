/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * 環境センサーブロック (BP5-2, 2026-04-20)
 *
 * BME280: 温度・湿度・気圧（Adafruit BME280 Library）
 * BMP280: 温度・気圧・高度（Adafruit BMP280 Library）
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const ENV_COLOR = '#4CAF50';

/**
 * bme280_init - BME280 初期化
 */
Blockly.Blocks['bme280_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_BME280_INIT || 'BME280 Init'))
        .appendField('I2C addr')
        .appendField(new Blockly.FieldDropdown([
          ['0x76', '0x76'],
          ['0x77', '0x77'],
        ]), 'ADDR');
    this.setOutput(true, 'Boolean');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BME280_INITTOOLTIP || 'Initialize BME280 sensor via I2C. Returns true if found. Default address 0x76, use 0x77 if SDO pin is HIGH.');
  }
};

generator.forBlock['bme280_init'] = function(block: Blockly.Block) {
  const addr = block.getFieldValue('ADDR');
  generator.definitions_['include_bme280'] = `
#include <Adafruit_BME280.h>
Adafruit_BME280 bme280;`;
  return [`bme280.begin(${addr})`, 0];
};

/**
 * bme280_read - BME280 値取得（温度/湿度/気圧）
 */
Blockly.Blocks['bme280_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_BME280_READ || 'BME280 Read'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ENV_TEMPERATURE || 'temperature (°C)', 'temp'],
          [Blockly.Msg.BLOCKS_ENV_HUMIDITY || 'humidity (%)', 'hum'],
          [Blockly.Msg.BLOCKS_ENV_PRESSURE || 'pressure (hPa)', 'pres'],
        ]), 'TYPE');
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BME280_READTOOLTIP || 'Read a value from BME280 sensor (temperature °C, humidity %, or pressure hPa).');
  }
};

generator.forBlock['bme280_read'] = function(block: Blockly.Block) {
  const type = block.getFieldValue('TYPE');
  generator.definitions_['include_bme280'] = `
#include <Adafruit_BME280.h>
Adafruit_BME280 bme280;`;
  const methodMap: Record<string, string> = {
    temp: 'bme280.readTemperature()',
    hum: 'bme280.readHumidity()',
    pres: 'bme280.readPressure() / 100.0',
  };
  return [methodMap[type] || 'bme280.readTemperature()', 0];
};

/**
 * bmp280_init - BMP280 初期化
 */
Blockly.Blocks['bmp280_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_BMP280_INIT || 'BMP280 Init'))
        .appendField('I2C addr')
        .appendField(new Blockly.FieldDropdown([
          ['0x76', '0x76'],
          ['0x77', '0x77'],
        ]), 'ADDR');
    this.setOutput(true, 'Boolean');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BMP280_INITTOOLTIP || 'Initialize BMP280 sensor via I2C. Returns true if found. Note: BMP280 has no humidity sensor.');
  }
};

generator.forBlock['bmp280_init'] = function(block: Blockly.Block) {
  const addr = block.getFieldValue('ADDR');
  generator.definitions_['include_bmp280'] = `
#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp280;`;
  return [`bmp280.begin(${addr})`, 0];
};

/**
 * bmp280_read - BMP280 値取得（温度/気圧/高度）
 */
Blockly.Blocks['bmp280_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_BMP280_READ || 'BMP280 Read'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ENV_TEMPERATURE || 'temperature (°C)', 'temp'],
          [Blockly.Msg.BLOCKS_ENV_PRESSURE || 'pressure (hPa)', 'pres'],
        ]), 'TYPE');
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BMP280_READTOOLTIP || 'Read temperature (°C) or pressure (hPa) from BMP280 sensor.');
  }
};

generator.forBlock['bmp280_read'] = function(block: Blockly.Block) {
  const type = block.getFieldValue('TYPE');
  generator.definitions_['include_bmp280'] = `
#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp280;`;
  const methodMap: Record<string, string> = {
    temp: 'bmp280.readTemperature()',
    pres: 'bmp280.readPressure() / 100.0',
  };
  return [methodMap[type] || 'bmp280.readTemperature()', 0];
};

/**
 * bmp280_read_altitude - 気圧から高度計算
 */
Blockly.Blocks['bmp280_read_altitude'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_BMP280_ALTITUDE || 'BMP280 Altitude (m)'));
    this.appendValueInput('SEA_LEVEL')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_BMP280_SEALEVEL || 'sea level pressure (hPa)');
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BMP280_ALTITUDETOOLTIP || 'Calculate altitude in meters from current pressure vs sea level pressure. Standard sea level = 1013.25 hPa.');
  }
};

generator.forBlock['bmp280_read_altitude'] = function(block: Blockly.Block) {
  const seaLevel = javascriptGenerator.valueToCode(block, 'SEA_LEVEL', 0) || '1013.25';
  generator.definitions_['include_bmp280'] = `
#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp280;`;
  return [`bmp280.readAltitude(${seaLevel})`, 0];
};

// ============================================================================
// 51.md Phase A+B commit #6-A (2026-05-04 第79回): SHT30 3 ブロック
// — Sensirion I2C SHT3x lib (`sensirion/Sensirion I2C SHT3x@^1.0.1`、commit #2 で追加済)
// 既存 BME280/BMP280 と独立、stand-alone SHT30 デバイス対応 (Fab Academy 自作回路向け)
// ============================================================================

const SHT30_INCLUDE = `
#include <SensirionI2cSht3x.h>
SensirionI2cSht3x sht30;`;

const SHT30_READ_HELPER = `
// 51.md commit #6-A: SHT30 共有測定バッファ (temp/humidity 両 read で 1 回の I2C 通信)
static float _sht30LastTemp = 0.0f;
static float _sht30LastHumidity = 0.0f;
static bool _sht30Measure() {
  int16_t err = sht30.measureSingleShot(REPEATABILITY_MEDIUM, false, _sht30LastTemp, _sht30LastHumidity);
  return err == 0;
}`;

/**
 * sht30_init — SHT30 初期化 (I2C 0x44、Wire bus 前提)
 */
Blockly.Blocks['sht30_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_SHT30_INIT || 'SHT30 を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SHT30_INIT_TOOLTIP || 'SHT30 温湿度センサ (Sensirion) を I2C アドレス 0x44 で初期化します。Wire (SDA/SCL pin はボード既定) で通信します。');
  }
};

generator.forBlock['sht30_init'] = function() {
  generator.definitions_['include_sht30'] = SHT30_INCLUDE;
  generator.definitions_['sht30_helper'] = SHT30_READ_HELPER;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['sht30_begin'] = 'Wire.begin();\n  sht30.begin(Wire, SHT30_I2C_ADDR_44);';
  return '';
};

/**
 * sht30_read_temperature — SHT30 温度 (°C、Number output)
 */
Blockly.Blocks['sht30_read_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_SHT30_READ_TEMPERATURE || 'SHT30 温度 (°C)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SHT30_READ_TEMPERATURE_TOOLTIP || 'SHT30 から温度を読み取ります (°C)。事前に sht30_init が必要です。エラー時は 0 を返します。');
  }
};

generator.forBlock['sht30_read_temperature'] = function() {
  generator.definitions_['include_sht30'] = SHT30_INCLUDE;
  generator.definitions_['sht30_helper'] = SHT30_READ_HELPER;
  return ['(_sht30Measure() ? _sht30LastTemp : 0.0f)', 0];
};

/**
 * sht30_read_humidity — SHT30 湿度 (%、Number output)
 */
Blockly.Blocks['sht30_read_humidity'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_SHT30_READ_HUMIDITY || 'SHT30 湿度 (%)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SHT30_READ_HUMIDITY_TOOLTIP || 'SHT30 から湿度を読み取ります (%)。事前に sht30_init が必要です。エラー時は 0 を返します。');
  }
};

generator.forBlock['sht30_read_humidity'] = function() {
  generator.definitions_['include_sht30'] = SHT30_INCLUDE;
  generator.definitions_['sht30_helper'] = SHT30_READ_HELPER;
  return ['(_sht30Measure() ? _sht30LastHumidity : 0.0f)', 0];
};

// ============================================================================
// 51.md Phase A+B commit #6-B (2026-05-04 第79回): SHT40 3 ブロック
// — Adafruit SHT4x lib (`adafruit/Adafruit SHT4x Library@^1.0.5`、commit #2 で追加済)
// SHT30 と独立 (上位互換 chip、Fab Academy 自作回路 + 後継チップ対応)
// ============================================================================

const SHT40_INCLUDE = `
#include <Adafruit_SHT4x.h>
Adafruit_SHT4x sht40;`;

const SHT40_READ_HELPER = `
// 51.md commit #6-B: SHT40 共有測定バッファ (temp/humidity 両 read で 1 回の I2C 通信)
static float _sht40LastTemp = 0.0f;
static float _sht40LastHumidity = 0.0f;
static bool _sht40Measure() {
  sensors_event_t hum, tmp;
  if (!sht40.getEvent(&hum, &tmp)) return false;
  _sht40LastTemp = tmp.temperature;
  _sht40LastHumidity = hum.relative_humidity;
  return true;
}`;

Blockly.Blocks['sht40_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_SHT40_INIT || 'SHT40 を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SHT40_INIT_TOOLTIP || 'SHT40 温湿度センサ (Sensirion 後継、Adafruit 経由) を I2C アドレス 0x44 で初期化します。Wire (SDA/SCL pin はボード既定) で通信します。');
  }
};

generator.forBlock['sht40_init'] = function() {
  generator.definitions_['include_sht40'] = SHT40_INCLUDE;
  generator.definitions_['sht40_helper'] = SHT40_READ_HELPER;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['sht40_begin'] = 'Wire.begin();\n  sht40.begin(&Wire);';
  return '';
};

Blockly.Blocks['sht40_read_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_SHT40_READ_TEMPERATURE || 'SHT40 温度 (°C)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SHT40_READ_TEMPERATURE_TOOLTIP || 'SHT40 から温度を読み取ります (°C)。事前に sht40_init が必要です。エラー時は 0 を返します。');
  }
};

generator.forBlock['sht40_read_temperature'] = function() {
  generator.definitions_['include_sht40'] = SHT40_INCLUDE;
  generator.definitions_['sht40_helper'] = SHT40_READ_HELPER;
  return ['(_sht40Measure() ? _sht40LastTemp : 0.0f)', 0];
};

Blockly.Blocks['sht40_read_humidity'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_SHT40_READ_HUMIDITY || 'SHT40 湿度 (%)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SHT40_READ_HUMIDITY_TOOLTIP || 'SHT40 から湿度を読み取ります (%)。事前に sht40_init が必要です。エラー時は 0 を返します。');
  }
};

generator.forBlock['sht40_read_humidity'] = function() {
  generator.definitions_['include_sht40'] = SHT40_INCLUDE;
  generator.definitions_['sht40_helper'] = SHT40_READ_HELPER;
  return ['(_sht40Measure() ? _sht40LastHumidity : 0.0f)', 0];
};

// ============================================================================
// 51.md Phase A+B commit #6-C (2026-05-04 第79回): QMP6988 2 ブロック
// — M5Unit-ENV lib (`m5stack/M5Unit-ENV@^1.3.2`、commit #2 で追加済) の QMP6988.h class
// stand-alone QMP6988 気圧センサ対応 (Fab Academy 自作回路 + ENV III ユニット内蔵チップ単独使用)
// ============================================================================

const QMP6988_INCLUDE = `
#include <QMP6988.h>
QMP6988 qmp6988;`;

Blockly.Blocks['qmp6988_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_QMP6988_INIT || 'QMP6988 を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_QMP6988_INIT_TOOLTIP || 'QMP6988 気圧センサ (M5 ENV III 内蔵 / stand-alone) を I2C で初期化します。M5Unit-ENV lib 使用。');
  }
};

generator.forBlock['qmp6988_init'] = function() {
  generator.definitions_['include_qmp6988'] = QMP6988_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['qmp6988_begin'] = 'Wire.begin();\n  qmp6988.begin();';
  return '';
};

Blockly.Blocks['qmp6988_read_pressure'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_QMP6988_READ_PRESSURE || 'QMP6988 気圧 (hPa)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_QMP6988_READ_PRESSURE_TOOLTIP || 'QMP6988 から気圧を読み取ります (hPa)。事前に qmp6988_init が必要です。');
  }
};

generator.forBlock['qmp6988_read_pressure'] = function() {
  generator.definitions_['include_qmp6988'] = QMP6988_INCLUDE;
  // calcPressure() は Pa 単位、hPa に変換
  return ['(qmp6988.calcPressure() / 100.0f)', 0];
};

// ============================================================================
// 51.md Phase A+B commit #6-D (2026-05-04 第79回): ENV III/IV 統合 5 ブロック
// — M5Unit-ENV lib の chip 別 class を統合的に扱う wrapper。
// D-15 (Q-1 user 確定): env4_init のみ追加、env4_read は既存 sht40_* + bmp280_* で代替。
// env3 = SHT30 (M5Unit-ENV SHT3X.h) + QMP6988 統合。
// env4 = SHT40 (Adafruit_SHT4x = sht40_init globals) + BMP280 (Adafruit_BMP280 = bmp280_init globals)。
// ============================================================================

// post-Phase 4-4 commit 7 fix (case_0406-0409):
// Previously `ENV3_INCLUDE` bundled SHT3X + QMP6988 + both globals in a single
// definitions_ literal (key `include_env3`). `qmp6988_init` (line ~330) and
// `env3_init` both touched the QMP6988 type, but they used DIFFERENT keys
// (`include_qmp6988` vs `include_env3`) — definitions_ dedupes by key, not by
// content, so the file ended up with TWO declarations of `QMP6988 qmp6988;`
// → `redefinition of 'QMP6988 qmp6988'`. Worse, env3_init alone failed
// (case_0406) because it emitted BOTH literals itself, so the conflict
// occurred without qmp6988_init being present.
//
// Split the include into two key-aligned literals:
//   - `include_qmp6988` (line 313)             → QMP6988 header + qmp6988
//   - `include_sht3x_env3` (this block, below) → SHT3X header + env3Sht3x
//
// Operation blocks emit only what they need:
//   - env3_init             → both (init begins both peripherals)
//   - env3_read_temperature → SHT3X only (SHT30 channel)
//   - env3_read_humidity    → SHT3X only (SHT30 channel)
//   - env3_read_pressure    → QMP6988 only (barometer channel)
//
// Now `qmp6988_init + env3_init` in the same case dedupe correctly via the
// shared `include_qmp6988` key, and env3_init alone declares each global
// exactly once.
const SHT3X_ENV3_INCLUDE = `
#include <SHT3X.h>
SHT3X env3Sht3x;`;

Blockly.Blocks['env3_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_ENV3_INIT || 'ENV III を初期化 (SHT30+QMP6988)'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ENV3_INIT_TOOLTIP || 'M5Stack ENV III ユニット (SHT30 温湿度 + QMP6988 気圧) を I2C で初期化します。FS 講座 IoT 温度計の標準デバイス。');
  }
};

generator.forBlock['env3_init'] = function() {
  // emits: SHT3X global (env3Sht3x) + QMP6988 global (qmp6988、shares
  // include_qmp6988 key with qmp6988_init for dedupe). begins both in setup.
  generator.definitions_['include_sht3x_env3'] = SHT3X_ENV3_INCLUDE;
  generator.definitions_['include_qmp6988'] = QMP6988_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['env3_begin'] = 'Wire.begin();\n  env3Sht3x.begin(&Wire);\n  qmp6988.begin();';
  return '';
};

Blockly.Blocks['env3_read_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_ENV3_READ_TEMPERATURE || 'ENV III 温度 (°C)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ENV3_READ_TEMPERATURE_TOOLTIP || 'ENV III の SHT30 から温度を読み取ります (°C)。事前に env3_init が必要です。');
  }
};

generator.forBlock['env3_read_temperature'] = function() {
  // requires: env3Sht3x (declared by env3_init via include_sht3x_env3).
  // emits: include_sht3x_env3 only (no QMP6988 dependency).
  generator.definitions_['include_sht3x_env3'] = SHT3X_ENV3_INCLUDE;
  return ['/* requires: env3Sht3x */ (env3Sht3x.update() ? env3Sht3x.cTemp : 0.0f)', 0];
};

Blockly.Blocks['env3_read_humidity'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_ENV3_READ_HUMIDITY || 'ENV III 湿度 (%)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ENV3_READ_HUMIDITY_TOOLTIP || 'ENV III の SHT30 から湿度を読み取ります (%)。事前に env3_init が必要です。');
  }
};

generator.forBlock['env3_read_humidity'] = function() {
  // requires: env3Sht3x. emits: include_sht3x_env3 only.
  generator.definitions_['include_sht3x_env3'] = SHT3X_ENV3_INCLUDE;
  return ['/* requires: env3Sht3x */ (env3Sht3x.update() ? env3Sht3x.humidity : 0.0f)', 0];
};

Blockly.Blocks['env3_read_pressure'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_ENV3_READ_PRESSURE || 'ENV III 気圧 (hPa)'));
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ENV3_READ_PRESSURE_TOOLTIP || 'ENV III の QMP6988 から気圧を読み取ります (hPa)。事前に env3_init が必要です。');
  }
};

generator.forBlock['env3_read_pressure'] = function() {
  // requires: qmp6988 (declared by env3_init via include_qmp6988, shared key
  // with qmp6988_init). emits: include_qmp6988 only (no SHT3X dependency).
  generator.definitions_['include_qmp6988'] = QMP6988_INCLUDE;
  return ['/* requires: qmp6988 */ (qmp6988.calcPressure() / 100.0f)', 0];
};

/**
 * env4_init — ENV IV 初期化 (SHT40 + BMP280)
 * D-15 (Q-1 user 確定): env4_read 個別ブロックは追加せず、既存 sht40_read_xxx と bmp280_read で代替。
 * SHT40 = Adafruit_SHT4x (sht40_init 経由 globals)、BMP280 = Adafruit_BMP280 (bmp280_init 経由 globals) を一括 begin。
 */
Blockly.Blocks['env4_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌡️ ' + (Blockly.Msg.BLOCKS_ENV4_INIT || 'ENV IV を初期化 (SHT40+BMP280)'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ENV_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ENV4_INIT_TOOLTIP || 'M5Stack ENV IV ユニット (SHT40 温湿度 + BMP280 気圧) を I2C で初期化します。値の読み取りは sht40_read_temperature / sht40_read_humidity / bmp280_read で行ってください。');
  }
};

generator.forBlock['env4_init'] = function() {
  // SHT40 (Adafruit_SHT4x) + BMP280 (Adafruit_BMP280) の両 globals を emit (sht40_init / bmp280_init と同 key で dedupe)
  generator.definitions_['include_sht40'] = SHT40_INCLUDE;
  generator.definitions_['sht40_helper'] = SHT40_READ_HELPER;
  generator.definitions_['include_bmp280'] = `
#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp280;`;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['env4_begin'] = 'Wire.begin();\n  sht40.begin(&Wire);\n  bmp280.begin(0x76);';
  return '';
};

console.log('Environment sensor (BME280/BMP280/SHT30/SHT40/QMP6988/ENV-III/ENV-IV) blocks loaded');
