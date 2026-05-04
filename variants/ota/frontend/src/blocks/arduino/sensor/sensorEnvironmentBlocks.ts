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

console.log('Environment sensor (BME280/BMP280/SHT30/SHT40) blocks loaded');
