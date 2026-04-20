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
        .appendField('🌡️ ' + ((Blockly.Msg as any).BLOCKS_BME280_INIT || 'BME280 Init'))
        .appendField('I2C addr')
        .appendField(new Blockly.FieldDropdown([
          ['0x76', '0x76'],
          ['0x77', '0x77'],
        ]), 'ADDR');
    this.setOutput(true, 'Boolean');
    this.setColour(ENV_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BME280_INITTOOLTIP || 'Initialize BME280 sensor via I2C. Returns true if found. Default address 0x76, use 0x77 if SDO pin is HIGH.');
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
        .appendField('🌡️ ' + ((Blockly.Msg as any).BLOCKS_BME280_READ || 'BME280 Read'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_ENV_TEMPERATURE || 'temperature (°C)', 'temp'],
          [(Blockly.Msg as any).BLOCKS_ENV_HUMIDITY || 'humidity (%)', 'hum'],
          [(Blockly.Msg as any).BLOCKS_ENV_PRESSURE || 'pressure (hPa)', 'pres'],
        ]), 'TYPE');
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BME280_READTOOLTIP || 'Read a value from BME280 sensor (temperature °C, humidity %, or pressure hPa).');
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
        .appendField('🌡️ ' + ((Blockly.Msg as any).BLOCKS_BMP280_INIT || 'BMP280 Init'))
        .appendField('I2C addr')
        .appendField(new Blockly.FieldDropdown([
          ['0x76', '0x76'],
          ['0x77', '0x77'],
        ]), 'ADDR');
    this.setOutput(true, 'Boolean');
    this.setColour(ENV_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BMP280_INITTOOLTIP || 'Initialize BMP280 sensor via I2C. Returns true if found. Note: BMP280 has no humidity sensor.');
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
        .appendField('🌡️ ' + ((Blockly.Msg as any).BLOCKS_BMP280_READ || 'BMP280 Read'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_ENV_TEMPERATURE || 'temperature (°C)', 'temp'],
          [(Blockly.Msg as any).BLOCKS_ENV_PRESSURE || 'pressure (hPa)', 'pres'],
        ]), 'TYPE');
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BMP280_READTOOLTIP || 'Read temperature (°C) or pressure (hPa) from BMP280 sensor.');
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
        .appendField('🌡️ ' + ((Blockly.Msg as any).BLOCKS_BMP280_ALTITUDE || 'BMP280 Altitude (m)'));
    this.appendValueInput('SEA_LEVEL')
        .setCheck('Number')
        .appendField((Blockly.Msg as any).BLOCKS_BMP280_SEALEVEL || 'sea level pressure (hPa)');
    this.setOutput(true, 'Number');
    this.setColour(ENV_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BMP280_ALTITUDETOOLTIP || 'Calculate altitude in meters from current pressure vs sea level pressure. Standard sea level = 1013.25 hPa.');
  }
};

generator.forBlock['bmp280_read_altitude'] = function(block: Blockly.Block) {
  const seaLevel = javascriptGenerator.valueToCode(block, 'SEA_LEVEL', 0) || '1013.25';
  generator.definitions_['include_bmp280'] = `
#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp280;`;
  return [`bmp280.readAltitude(${seaLevel})`, 0];
};

console.log('Environment sensor (BME280/BMP280) blocks loaded');
