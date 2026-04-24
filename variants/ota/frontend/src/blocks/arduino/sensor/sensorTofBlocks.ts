/**
 * ToF 距離センサーブロック (BP5-4, 2026-04-20)
 *
 * VL53L0X: Adafruit VL53L0X ライブラリ使用（I2C 固定アドレス 0x29）
 * 範囲外エラー（8190mm）は 0 に正規化
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const TOF_COLOR = '#795548';

/**
 * vl53l0x_init - VL53L0X 初期化
 */
Blockly.Blocks['vl53l0x_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📏 ' + (Blockly.Msg.BLOCKS_VL53L0X_INIT || 'VL53L0X Init'));
    this.setOutput(true, 'Boolean');
    this.setColour(TOF_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_VL53L0X_INITTOOLTIP || 'Initialize VL53L0X ToF distance sensor via I2C (address 0x29). Returns true if found. Requires Adafruit VL53L0X library.');
  }
};

generator.forBlock['vl53l0x_init'] = function() {
  generator.definitions_['include_vl53l0x'] = `
#include <Adafruit_VL53L0X.h>
Adafruit_VL53L0X vl53l0x;`;
  return ['vl53l0x.begin()', 0];
};

/**
 * vl53l0x_read_distance_mm - 距離取得（mm）
 * 範囲外 / エラー時は 0 を返す
 */
Blockly.Blocks['vl53l0x_read_distance_mm'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📏 ' + (Blockly.Msg.BLOCKS_VL53L0X_DISTANCE || 'VL53L0X Distance (mm)'));
    this.setOutput(true, 'Number');
    this.setColour(TOF_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_VL53L0X_DISTANCETOOLTIP || 'Read distance in mm from VL53L0X. Returns 0 if out of range or error. Effective range: 30-1200mm.');
  }
};

generator.forBlock['vl53l0x_read_distance_mm'] = function() {
  generator.definitions_['include_vl53l0x'] = `
#include <Adafruit_VL53L0X.h>
Adafruit_VL53L0X vl53l0x;`;
  generator.definitions_['vl53l0x_read_func'] = `
int vl53l0xReadMm() {
  VL53L0X_RangingMeasurementData_t m;
  vl53l0x.rangingTest(&m, false);
  if (m.RangeStatus == 4) return 0;
  return (int)m.RangeMilliMeter;
}`;
  return ['vl53l0xReadMm()', 0];
};

console.log('ToF sensor (VL53L0X) blocks loaded');
