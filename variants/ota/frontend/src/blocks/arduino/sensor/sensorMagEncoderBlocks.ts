/**
 * 磁気エンコーダブロック (BP5-5, 2026-04-20)
 *
 * AS5600: RobTillaart AS5600 ライブラリ使用（I2C 固定アドレス 0x36）
 * 既存の `encoder`（パルスエンコーダ）とは別カテゴリ
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const MAG_COLOR = '#880E4F';

const AS5600_INCLUDE = `
#include <Wire.h>
#include <AS5600.h>
AS5600 as5600;`;

/**
 * as5600_init - AS5600 初期化
 */
Blockly.Blocks['as5600_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🧲 ' + (Blockly.Msg.BLOCKS_AS5600_INIT || 'AS5600 Init'));
    this.setOutput(true, 'Boolean');
    this.setColour(MAG_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AS5600_INITTOOLTIP || 'Initialize AS5600 magnetic encoder via I2C (address 0x36). Returns true if magnet is detected. Requires Seeed_Arduino_AS5600 library.');
  }
};

generator.forBlock['as5600_init'] = function() {
  generator.definitions_['include_as5600'] = AS5600_INCLUDE;
  return ['([&](){ Wire.begin(); as5600.begin(); return as5600.isConnected(); })()', 0];
};

/**
 * as5600_read_angle - 絶対角度（0〜360°）
 */
Blockly.Blocks['as5600_read_angle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🧲 ' + (Blockly.Msg.BLOCKS_AS5600_ANGLE || 'AS5600 Angle (°)'));
    this.setOutput(true, 'Number');
    this.setColour(MAG_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AS5600_ANGLETOOLTIP || 'Read absolute angle (0-360°) from AS5600 magnetic encoder. Provides 12-bit resolution (0.088°/step).');
  }
};

generator.forBlock['as5600_read_angle'] = function() {
  generator.definitions_['include_as5600'] = AS5600_INCLUDE;
  return ['(as5600.rawAngle() * 360.0 / 4096.0)', 0];
};

/**
 * as5600_read_raw - 生値（0〜4095）
 */
Blockly.Blocks['as5600_read_raw'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🧲 ' + (Blockly.Msg.BLOCKS_AS5600_RAW || 'AS5600 Raw (0-4095)'));
    this.setOutput(true, 'Number');
    this.setColour(MAG_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AS5600_RAWTOOLTIP || 'Read raw 12-bit encoder value (0-4095) from AS5600. Full rotation = 4096 steps.');
  }
};

generator.forBlock['as5600_read_raw'] = function() {
  generator.definitions_['include_as5600'] = AS5600_INCLUDE;
  return ['as5600.rawAngle()', 0];
};

console.log('Magnetic encoder (AS5600) blocks loaded');
