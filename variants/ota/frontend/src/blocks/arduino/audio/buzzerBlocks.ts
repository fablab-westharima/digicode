/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiBuzzer Blockly Blocks — Phase B-2 (Session 146、D-new-1 D5)
 *
 * Robot lib から独立した汎用 buzzer module、任意 ESP32 board で使用可能。
 * 16 sound preset (`BEEP_<intent>`) は OttoDIYLib `S_xxx` 命名規則を一切持ち込まない (E5 + case 23 incident E)、
 * 周波数 sequence は意図ベース命名 (§1-7.3 candidate、 Phase E user 主観評価で fine-tune iteration、D-new-1b)。
 *
 * 3 block: play_preset / play_tone / play_bend_tone
 *
 * 60.md spec deviation #10 (Session 146 B-2 発覚): spec は 4 block (stop 含む) を verbatim 指定だが、
 * 既存 audio/audioBlocks.ts:99 `buzzer_stop` (noTone(pin) 直接 emit) が同名で先行存在。新 DigiBuzzer 経由
 * stop は本 commit では追加せず、既存 buzzer_stop block で代用 (機能等価: noTone は tone()/playTone() 全ての停止に有効)。
 * post-Phase 別 session で audioBlocks.ts buzzer 系を rename or 統合する別 task 候補、本 deviation は 60.md §1 B-2
 * 本文 update 対象。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getPinFromPreset } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const BUZZER_COLOR = '#E91E63';

function ensureBuzzerDecl(): void {
  // singleton declaration pattern (case 19 axis 2 G-style)
  generator.definitions_['include_digibuzzer'] = '#include <sound/IBuzzer.h>';
  generator.definitions_['digibuzzer_instance'] = 'DigiBuzzer buzzer;';
}

// ===== buzzer_play_preset (16 BEEP_<intent>、D-new-1b 全件仮実装) =====
Blockly.Blocks['buzzer_play_preset'] = {
  init: function() {
    const pin = getPinFromPreset('humanoidBuzzer');
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_BUZZER_PLAY_PRESET_LABEL || 'Buzzer Preset'))
        .appendField(Blockly.Msg.BLOCKS_COMMON_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(pin, 0, 39), 'PIN')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_SHORT_HIGH || 'Short High', 'BEEP_SHORT_HIGH'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_SHORT_LOW || 'Short Low', 'BEEP_SHORT_LOW'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_TWO_HIGH || 'Two High', 'BEEP_TWO_HIGH'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_TWO_LOW || 'Two Low', 'BEEP_TWO_LOW'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_RISING_PAIR || 'Rising Pair', 'BEEP_RISING_PAIR'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_FALLING_PAIR || 'Falling Pair', 'BEEP_FALLING_PAIR'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_RISING_FAST || 'Rising Fast', 'BEEP_RISING_FAST'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_FALLING_SLOW || 'Falling Slow', 'BEEP_FALLING_SLOW'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_QUERY_PAIR || 'Query Pair', 'BEEP_QUERY_PAIR'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_QUERY_RISING || 'Query Rising', 'BEEP_QUERY_RISING'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_FANFARE || 'Fanfare', 'BEEP_FANFARE'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_OK_SHORT || 'OK Short', 'BEEP_OK_SHORT'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_ERROR_DESCENDING || 'Error Descending', 'BEEP_ERROR_DESCENDING'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_HIGH_SHORT || 'High Short', 'BEEP_HIGH_SHORT'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_STARTUP || 'Startup', 'BEEP_STARTUP'],
          [Blockly.Msg.BLOCKS_BUZZER_PRESET_SHUTDOWN || 'Shutdown', 'BEEP_SHUTDOWN']
        ]), 'PRESET');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BUZZER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BUZZER_PLAY_PRESET_TOOLTIP || 'Play DigiCode sound preset (intent-based naming, no OttoDIYLib derivation)');
  }
};
javascriptGenerator.forBlock['buzzer_play_preset'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const preset = block.getFieldValue('PRESET');
  ensureBuzzerDecl();
  return `  buzzer.attach(${pin});\n  buzzer.playPreset(${preset});\n`;
};

// ===== buzzer_play_tone (raw freq + duration) =====
Blockly.Blocks['buzzer_play_tone'] = {
  init: function() {
    const pin = getPinFromPreset('humanoidBuzzer');
    this.appendDummyInput()
        .appendField('🎵 ' + (Blockly.Msg.BLOCKS_BUZZER_PLAY_TONE_LABEL || 'Buzzer Tone'))
        .appendField(Blockly.Msg.BLOCKS_COMMON_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(pin, 0, 39), 'PIN');
    this.appendValueInput('FREQ')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_BUZZER_FREQ || 'Hz');
    this.appendValueInput('DURATION')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_BUZZER_DURATION || 'ms');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BUZZER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BUZZER_PLAY_TONE_TOOLTIP || 'Play raw tone at frequency for duration (blocking via delay)');
  }
};
javascriptGenerator.forBlock['buzzer_play_tone'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const freq = generator.valueToCode(block, 'FREQ', generator.ORDER_ATOMIC) || '440';
  const duration = generator.valueToCode(block, 'DURATION', generator.ORDER_ATOMIC) || '200';
  ensureBuzzerDecl();
  return `  buzzer.attach(${pin});\n  buzzer.playTone(String(${freq}).toInt(), String(${duration}).toInt());\n`;
};

// ===== buzzer_play_bend_tone (sweep freq) =====
Blockly.Blocks['buzzer_play_bend_tone'] = {
  init: function() {
    const pin = getPinFromPreset('humanoidBuzzer');
    this.appendDummyInput()
        .appendField('🎶 ' + (Blockly.Msg.BLOCKS_BUZZER_PLAY_BEND_LABEL || 'Buzzer Bend Tone'))
        .appendField(Blockly.Msg.BLOCKS_COMMON_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(pin, 0, 39), 'PIN');
    this.appendValueInput('INIT_FREQ')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_BUZZER_FROM || 'from');
    this.appendValueInput('END_FREQ')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_BUZZER_TO || 'to');
    this.appendValueInput('DURATION')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_BUZZER_DURATION || 'ms');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BUZZER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BUZZER_PLAY_BEND_TOOLTIP || 'Sweep frequency from init to end over duration ms');
  }
};
javascriptGenerator.forBlock['buzzer_play_bend_tone'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const initFreq = generator.valueToCode(block, 'INIT_FREQ', generator.ORDER_ATOMIC) || '400';
  const endFreq = generator.valueToCode(block, 'END_FREQ', generator.ORDER_ATOMIC) || '1200';
  const duration = generator.valueToCode(block, 'DURATION', generator.ORDER_ATOMIC) || '500';
  ensureBuzzerDecl();
  return `  buzzer.attach(${pin});\n  buzzer.playBendTone(String(${initFreq}).toInt(), String(${endFreq}).toInt(), String(${duration}).toInt());\n`;
};

// buzzer_stop block は audio/audioBlocks.ts 既存 (deviation #10 参照、上記 doc comment)。
// 機能等価 (noTone(pin)) のため新規追加せず、既存 block を引き続き使用。

export {};
