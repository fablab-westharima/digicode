/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * 圧電素子 (piezo) 振動検知ブロック (52.md Phase D、第80回 commit #9 / 2026-05-04)
 *
 * 2 ブロック構成 (Phase D 仕様書 §7.4 + 52.md §4.7):
 *   - piezo_read_vibration    (PIN Number、raw analogRead 値)
 *   - piezo_threshold_detect  (PIN/THRESHOLD、Boolean、振動検知判定)
 *
 * 内部 lib: なし (analogRead のみ、ESP32 Arduino core 組込み)
 * boardRequires: null (ADC 全 board 対応)
 *
 * 圧電素子 (PZT) を analog input に接続し、振動による電圧パルスを ADC で検出。
 * 衝撃センサ、ノック検知、タッチセンサ等の用途に利用。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const PIEZO_COLOR = '#9E9E9E';

Blockly.Blocks['piezo_read_vibration'] = {
  init: function() {
    this.appendValueInput('PIN')
        .setCheck('Number')
        .appendField('🪗 ' + (Blockly.Msg.BLOCKS_PIEZO_READ_VIBRATION || '圧電素子 振動 (raw) ピン'));
    this.setOutput(true, 'Number');
    this.setColour(PIEZO_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PIEZO_READ_VIBRATION_TOOLTIP || '圧電素子 (PZT) の振動を ADC で読み取ります (0-4095、ESP32 12-bit)。値が大きいほど強い振動。');
  }
};

generator.forBlock['piezo_read_vibration'] = function(block: Blockly.Block) {
  const pin = generator.valueToCode(block, 'PIN', Order.ATOMIC) || '34';
  return [`analogRead((int)(${pin}))`, Order.FUNCTION_CALL];
};

Blockly.Blocks['piezo_threshold_detect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🪗 ' + (Blockly.Msg.BLOCKS_PIEZO_THRESHOLD || '圧電素子 振動検知'));
    this.appendValueInput('PIN')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_PIEZO_PIN || 'ピン');
    this.appendValueInput('THRESHOLD')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_PIEZO_THRESHOLD_VAL || 'しきい値');
    this.setInputsInline(true);
    this.setOutput(true, 'Boolean');
    this.setColour(PIEZO_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PIEZO_THRESHOLD_TOOLTIP || '圧電素子の振動値が指定しきい値を超えたら true を返します (typical threshold = 1000、調整推奨)。');
  }
};

generator.forBlock['piezo_threshold_detect'] = function(block: Blockly.Block) {
  const pin = generator.valueToCode(block, 'PIN', Order.ATOMIC) || '34';
  const threshold = generator.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '1000';
  return [`(analogRead((int)(${pin})) > (int)(${threshold}))`, Order.RELATIONAL];
};

console.log('Piezo vibration blocks loaded');
