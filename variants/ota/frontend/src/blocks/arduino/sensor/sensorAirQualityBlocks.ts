/**
 * 空気質センサ ブロック (52.md 中推奨、第80回 commit #15 / 2026-05-04)
 *
 * 7 ブロック構成 (CO2 SCD30 + PM2.5 PMS5003):
 *   - scd30_init               (I2C、ambient pressure compensation OFF)
 *   - scd30_read_co2           (Number、ppm)
 *   - scd30_read_temperature   (Number、℃)
 *   - scd30_read_humidity      (Number、%)
 *   - pms5003_init             (RX/TX、UART2)
 *   - pms5003_read_pm25        (Number、μg/m³)
 *   - pms5003_read_pm10        (Number、μg/m³)
 *
 * 内部 lib: `sensirion/Sensirion I2C SCD30@^1.1.1` + `avaldebe/PMSerial@^1.2.0` (commit #2 で追加済)
 * boardRequires: null (I2C / UART 全 board 対応)
 *
 * 統合カテゴリ採用 (D-6 確定): Factory IoT 空気質モニタリングの一括 UX (CO2 + PM)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const AIR_QUALITY_COLOR = '#00897B';

const SCD30_INCLUDE = `
#include <SensirionI2cScd30.h>
SensirionI2cScd30 scd30Sensor;
float _scd30Co2 = 0, _scd30Temp = 0, _scd30Humidity = 0;
unsigned long _scd30LastUpdate = 0;`;

const PMS5003_INCLUDE = `
#include <PMserial.h>
SerialPM* pms5003Sensor = nullptr;`;

Blockly.Blocks['scd30_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌫️ ' + (Blockly.Msg.BLOCKS_SCD30_INIT || 'SCD30 (CO2 + 温湿度) を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AIR_QUALITY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SCD30_INIT_TOOLTIP || 'SCD30 NDIR CO2 + 温湿度センサを初期化します (I2C 0x61、Sensirion 公式 lib)。startPeriodicMeasurement で 2 秒周期計測開始。');
  }
};

generator.forBlock['scd30_init'] = function() {
  generator.definitions_['include_scd30'] = SCD30_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['scd30_init'] = `Wire.begin();
  scd30Sensor.begin(Wire, SCD30_I2C_ADDR_61);
  scd30Sensor.startPeriodicMeasurement(0);  // 0 = ambient pressure compensation OFF`;
  // データ更新を loopPre_ で 1 秒ごとに行う (高速 polling 不要)
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['scd30_update'] = `
  if (millis() - _scd30LastUpdate > 1000) {
    uint16_t _scd30Ready = 0;
    scd30Sensor.getDataReady(_scd30Ready);
    if (_scd30Ready) {
      scd30Sensor.readMeasurementData(_scd30Co2, _scd30Temp, _scd30Humidity);
    }
    _scd30LastUpdate = millis();
  }`;
  return '';
};

Blockly.Blocks['scd30_read_co2'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌫️ ' + (Blockly.Msg.BLOCKS_SCD30_READ_CO2 || 'SCD30 CO2 (ppm)'));
    this.setOutput(true, 'Number');
    this.setColour(AIR_QUALITY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SCD30_READ_CO2_TOOLTIP || 'SCD30 の CO2 濃度を ppm で返します (range 400-10000、典型 outdoor 420、indoor 600-1500、警報 1000+)。');
  }
};

generator.forBlock['scd30_read_co2'] = function() {
  generator.definitions_['include_scd30'] = generator.definitions_['include_scd30'] || SCD30_INCLUDE;
  return ['_scd30Co2', Order.ATOMIC];
};

Blockly.Blocks['scd30_read_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌫️ ' + (Blockly.Msg.BLOCKS_SCD30_READ_TEMP || 'SCD30 温度 (℃)'));
    this.setOutput(true, 'Number');
    this.setColour(AIR_QUALITY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SCD30_READ_TEMP_TOOLTIP || 'SCD30 の温度を ℃ で返します。NDIR 内部発熱補正済。');
  }
};

generator.forBlock['scd30_read_temperature'] = function() {
  generator.definitions_['include_scd30'] = generator.definitions_['include_scd30'] || SCD30_INCLUDE;
  return ['_scd30Temp', Order.ATOMIC];
};

Blockly.Blocks['scd30_read_humidity'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌫️ ' + (Blockly.Msg.BLOCKS_SCD30_READ_HUMIDITY || 'SCD30 湿度 (%)'));
    this.setOutput(true, 'Number');
    this.setColour(AIR_QUALITY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SCD30_READ_HUMIDITY_TOOLTIP || 'SCD30 の相対湿度を % で返します。');
  }
};

generator.forBlock['scd30_read_humidity'] = function() {
  generator.definitions_['include_scd30'] = generator.definitions_['include_scd30'] || SCD30_INCLUDE;
  return ['_scd30Humidity', Order.ATOMIC];
};

Blockly.Blocks['pms5003_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌫️ ' + (Blockly.Msg.BLOCKS_PMS5003_INIT || 'PMS5003 (PM2.5) を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_PMS5003_RX || 'RX')
        .appendField(new Blockly.FieldNumber(16, 0, 39, 1), 'RX');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_PMS5003_TX || 'TX')
        .appendField(new Blockly.FieldNumber(17, 0, 39, 1), 'TX');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(AIR_QUALITY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PMS5003_INIT_TOOLTIP || 'PMS5003 PM2.5/PM10 粉塵センサを初期化します (UART 9600 baud)。read() を 1 秒ごとに呼んでデータ更新。');
  }
};

generator.forBlock['pms5003_init'] = function(block: Blockly.Block) {
  const rx = block.getFieldValue('RX');
  const tx = block.getFieldValue('TX');
  generator.definitions_['include_pms5003'] = PMS5003_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['pms5003_init'] = `if (!pms5003Sensor) pms5003Sensor = new SerialPM(PMSx003, ${rx}, ${tx});
  pms5003Sensor->init();`;
  return '';
};

Blockly.Blocks['pms5003_read_pm25'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌫️ ' + (Blockly.Msg.BLOCKS_PMS5003_READ_PM25 || 'PMS5003 PM2.5 (μg/m³)'));
    this.setOutput(true, 'Number');
    this.setColour(AIR_QUALITY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PMS5003_READ_PM25_TOOLTIP || 'PM2.5 (粒径 ≤ 2.5μm) 濃度を返します。WHO 24h ガイドライン 15 μg/m³、日本環境基準 35 μg/m³。');
  }
};

generator.forBlock['pms5003_read_pm25'] = function() {
  generator.definitions_['include_pms5003'] = generator.definitions_['include_pms5003'] || PMS5003_INCLUDE;
  return ['(pms5003Sensor && (pms5003Sensor->read(), (bool)*pms5003Sensor) ? (int)pms5003Sensor->pm25 : 0)', Order.CONDITIONAL];
};

Blockly.Blocks['pms5003_read_pm10'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌫️ ' + (Blockly.Msg.BLOCKS_PMS5003_READ_PM10 || 'PMS5003 PM10 (μg/m³)'));
    this.setOutput(true, 'Number');
    this.setColour(AIR_QUALITY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PMS5003_READ_PM10_TOOLTIP || 'PM10 (粒径 ≤ 10μm) 濃度を返します。WHO 24h ガイドライン 45 μg/m³。');
  }
};

generator.forBlock['pms5003_read_pm10'] = function() {
  generator.definitions_['include_pms5003'] = generator.definitions_['include_pms5003'] || PMS5003_INCLUDE;
  return ['(pms5003Sensor && (pms5003Sensor->read(), (bool)*pms5003Sensor) ? (int)pms5003Sensor->pm10 : 0)', Order.CONDITIONAL];
};

console.log('Sensor air quality (SCD30 + PMS5003) blocks loaded');
