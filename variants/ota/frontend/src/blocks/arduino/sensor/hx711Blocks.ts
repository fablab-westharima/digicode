/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * HX711 ロードセルブロック (51.md Phase A+B、第79回 commit #10 / 2026-05-04)
 *
 * 6 ブロック構成 (Fab Academy Final Project 装備):
 *   - hx711_init        (DOUT/SCK pin fields)
 *   - hx711_read_raw    (Number output、生 ADC 値)
 *   - hx711_read_weight (Number output、g、calibrate 後)
 *   - hx711_calibrate   (KNOWN_WEIGHT input、内蔵 calibrate_scale 利用)
 *   - hx711_tare        (statement、ゼロ点リセット)
 *   - hx711_set_scale   (SCALE input、手動スケール設定)
 *
 * 内部 lib: `robtillaart/HX711@^0.6.3` (commit #2 で追加済、calibrate_scale 内蔵で実装簡素)
 * boardRequires: null (GPIO 全 board 対応)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const HX711_COLOR = '#795548';

const HX711_INCLUDE = `
#include <HX711.h>
HX711 hx711Scale;`;

Blockly.Blocks['hx711_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚖️ ' + (Blockly.Msg.BLOCKS_HX711_INIT || 'HX711 を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HX711_DOUT || 'DOUT ピン')
        .appendField(new Blockly.FieldNumber(16, 0, 39, 1), 'DOUT');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_HX711_SCK || 'SCK ピン')
        .appendField(new Blockly.FieldNumber(17, 0, 39, 1), 'SCK');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HX711_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HX711_INIT_TOOLTIP || 'HX711 ロードセル ADC を初期化します。DOUT (data out) と SCK (clock) ピンを指定。robtillaart/HX711 lib 使用。');
  }
};

generator.forBlock['hx711_init'] = function(block: Blockly.Block) {
  const dout = block.getFieldValue('DOUT');
  const sck = block.getFieldValue('SCK');
  generator.definitions_['include_hx711'] = HX711_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  // case 19 axis 2 (Session 120): first-wins guard for HX711 DOUT/SCK pins.
  if (!generator.setups_['hx711_begin']) {
    generator.setups_['hx711_begin'] = `hx711Scale.begin(${dout}, ${sck});`;
  }
  return '';
};

Blockly.Blocks['hx711_read_raw'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚖️ ' + (Blockly.Msg.BLOCKS_HX711_READ_RAW || 'HX711 生値'));
    this.setOutput(true, 'Number');
    this.setColour(HX711_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HX711_READ_RAW_TOOLTIP || 'HX711 から生 ADC 値を読み取ります (offset/scale 未適用)。事前に hx711_init が必要。');
  }
};

generator.forBlock['hx711_read_raw'] = function() {
  generator.definitions_['include_hx711'] = HX711_INCLUDE;
  return ['hx711Scale.read()', Order.FUNCTION_CALL];
};

Blockly.Blocks['hx711_read_weight'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚖️ ' + (Blockly.Msg.BLOCKS_HX711_READ_WEIGHT || 'HX711 重量 (g)'));
    this.setOutput(true, 'Number');
    this.setColour(HX711_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HX711_READ_WEIGHT_TOOLTIP || 'HX711 から重量を読み取ります (g、平均 10 サンプル)。事前に hx711_init + hx711_calibrate (or set_scale) が必要。');
  }
};

generator.forBlock['hx711_read_weight'] = function() {
  generator.definitions_['include_hx711'] = HX711_INCLUDE;
  return ['hx711Scale.get_units(10)', Order.FUNCTION_CALL];
};

Blockly.Blocks['hx711_calibrate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚖️ ' + (Blockly.Msg.BLOCKS_HX711_CALIBRATE || 'HX711 校正'));
    this.appendValueInput('KNOWN_WEIGHT')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_HX711_KNOWN_WEIGHT || '既知重量 (g)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HX711_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HX711_CALIBRATE_TOOLTIP || 'HX711 を既知重量で校正します。事前に tare() でゼロ点合わせ → 既知重量を載せて本ブロック呼出 → calibrate_scale 内蔵関数でスケール係数を自動算出。');
  }
};

generator.forBlock['hx711_calibrate'] = function(block: Blockly.Block) {
  const w = generator.valueToCode(block, 'KNOWN_WEIGHT', Order.ATOMIC) || '100';
  generator.definitions_['include_hx711'] = HX711_INCLUDE;
  return `hx711Scale.calibrate_scale((float)(${w}), 10);\n`;
};

Blockly.Blocks['hx711_tare'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚖️ ' + (Blockly.Msg.BLOCKS_HX711_TARE || 'HX711 ゼロ点リセット'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HX711_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HX711_TARE_TOOLTIP || 'HX711 のゼロ点を現在の値で reset (tare、平均 10 サンプル)。何も載せずに呼び出します。');
  }
};

generator.forBlock['hx711_tare'] = function() {
  generator.definitions_['include_hx711'] = HX711_INCLUDE;
  return 'hx711Scale.tare(10);\n';
};

Blockly.Blocks['hx711_set_scale'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚖️ ' + (Blockly.Msg.BLOCKS_HX711_SET_SCALE || 'HX711 スケール設定'));
    this.appendValueInput('SCALE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_HX711_SCALE || 'スケール係数');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HX711_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HX711_SET_SCALE_TOOLTIP || 'HX711 のスケール係数を手動設定します。calibrate_scale を使わず既知の係数 (例: 420.5) を直接設定する場合。');
  }
};

generator.forBlock['hx711_set_scale'] = function(block: Blockly.Block) {
  const s = generator.valueToCode(block, 'SCALE', Order.ATOMIC) || '1.0';
  generator.definitions_['include_hx711'] = HX711_INCLUDE;
  return `hx711Scale.set_scale((float)(${s}));\n`;
};

console.log('HX711 load cell blocks loaded');
