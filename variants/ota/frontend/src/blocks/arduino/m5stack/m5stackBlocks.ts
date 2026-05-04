/**
 * M5Stack 本体ブロック (51.md Phase B、第79回 commit #12 / 2026-05-04)
 *
 * 15 ブロック構成 (M5Stack 系 9 boards 専用、`category=='m5stack'` フィルタ activate):
 *   #12-A (本コミット): begin / update / button_a/b/c_pressed (5)
 *   #12-B: button_a/b/c_held (3)
 *   #12-C: lcd_print / lcd_print_at / lcd_clear / lcd_set_text_size (4)
 *   #12-D: speaker_tone / battery_level / battery_voltage (3)
 *
 * 内部 lib: `m5stack/M5Unified@^0.2.14` (commit #2 で追加済、S-2 smoke で検証済)
 * boardRequires: `category=m5stack` (commit #3 で軸新設、本 commit でカテゴリ activate)
 * 配置: 独立トップレベル「📱 M5Stack」(D-20、Q-4 user 確定、display/robot 配下ではない)
 *
 * 注: catalog 生成器は `Blockly.Blocks['xxx']` リテラル形式しか拾わないため、
 * helper 関数で動的 block 定義する pattern は使用不可 (audit fail "isStatement+hasOutput 両 true")。
 * 全ブロックを明示的に宣言する。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const M5STACK_COLOR = '#FF0000';

const M5STACK_INCLUDE = `#include <M5Unified.h>`;

Blockly.Blocks['m5stack_begin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_BEGIN || 'M5Stack を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_BEGIN_TOOLTIP || 'M5Stack 系ボード本体 (LCD/ボタン/スピーカー/バッテリー) を初期化します。M5Unified lib 使用、9 機種共通 API。arduino_setup の中に配置してください。');
  }
};

generator.forBlock['m5stack_begin'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['m5stack_begin'] = 'auto cfg = M5.config();\n  M5.begin(cfg);';
  return '';
};

Blockly.Blocks['m5stack_update'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_UPDATE || 'M5 状態を更新'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_UPDATE_TOOLTIP || 'M5Stack のボタン/タッチ状態を更新します。loop の冒頭で呼出必須 (押下検出が機能しなくなります)。');
  }
};

generator.forBlock['m5stack_update'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  return 'M5.update();\n';
};

Blockly.Blocks['m5stack_button_a_pressed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_BUTTON_A_PRESSED || 'ボタン A が押された'));
    this.setOutput(true, 'Boolean');
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_BUTTON_A_PRESSED_TOOLTIP || 'ボタン A がこの loop 周期内で押された場合 true を返します (wasPressed)。事前に m5stack_begin + loop 冒頭で m5stack_update が必要。');
  }
};

generator.forBlock['m5stack_button_a_pressed'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  return ['M5.BtnA.wasPressed()', Order.FUNCTION_CALL];
};

Blockly.Blocks['m5stack_button_b_pressed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_BUTTON_B_PRESSED || 'ボタン B が押された'));
    this.setOutput(true, 'Boolean');
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_BUTTON_B_PRESSED_TOOLTIP || 'ボタン B がこの loop 周期内で押された場合 true を返します。');
  }
};

generator.forBlock['m5stack_button_b_pressed'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  return ['M5.BtnB.wasPressed()', Order.FUNCTION_CALL];
};

Blockly.Blocks['m5stack_button_c_pressed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_BUTTON_C_PRESSED || 'ボタン C が押された'));
    this.setOutput(true, 'Boolean');
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_BUTTON_C_PRESSED_TOOLTIP || 'ボタン C がこの loop 周期内で押された場合 true を返します。');
  }
};

generator.forBlock['m5stack_button_c_pressed'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  return ['M5.BtnC.wasPressed()', Order.FUNCTION_CALL];
};

// ============================================================================
// 51.md commit #12-B (2026-05-04 第79回): button_a/b/c_held (3、長押し検出)
// pressedFor(1000) returns true while held > 1000ms (一定間隔で繰り返し true 返却)
// ============================================================================

Blockly.Blocks['m5stack_button_a_held'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_BUTTON_A_HELD || 'ボタン A が長押しされている'));
    this.setOutput(true, 'Boolean');
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_BUTTON_A_HELD_TOOLTIP || 'ボタン A が 1 秒以上長押しされている場合 true を返します (pressedFor(1000))。事前に m5stack_begin + m5stack_update が必要。');
  }
};

generator.forBlock['m5stack_button_a_held'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  return ['M5.BtnA.pressedFor(1000)', Order.FUNCTION_CALL];
};

Blockly.Blocks['m5stack_button_b_held'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_BUTTON_B_HELD || 'ボタン B が長押しされている'));
    this.setOutput(true, 'Boolean');
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_BUTTON_B_HELD_TOOLTIP || 'ボタン B が 1 秒以上長押しされている場合 true を返します。');
  }
};

generator.forBlock['m5stack_button_b_held'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  return ['M5.BtnB.pressedFor(1000)', Order.FUNCTION_CALL];
};

Blockly.Blocks['m5stack_button_c_held'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📱 ' + (Blockly.Msg.BLOCKS_M5STACK_BUTTON_C_HELD || 'ボタン C が長押しされている'));
    this.setOutput(true, 'Boolean');
    this.setColour(M5STACK_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_M5STACK_BUTTON_C_HELD_TOOLTIP || 'ボタン C が 1 秒以上長押しされている場合 true を返します。');
  }
};

generator.forBlock['m5stack_button_c_held'] = function() {
  generator.definitions_['include_m5unified'] = M5STACK_INCLUDE;
  return ['M5.BtnC.pressedFor(1000)', Order.FUNCTION_CALL];
};

console.log('M5Stack body blocks loaded (sub-2/4: buttons held)');
