/**
 * TM1637 4桁7セグメントディスプレイブロック (52.md Phase C、第80回 commit #3 / 2026-05-04)
 *
 * 5 ブロック構成 (Fab Academy 頻出デバイス):
 *   - tm1637_init             (CLK/DIO pins、akj7/TM1637 Driver、4-digit + colon)
 *   - tm1637_show_number      (VALUE Number、整数表示)
 *   - tm1637_show_with_colon  (HH/MM Number、時刻表示、colonOn() で colon 制御)
 *   - tm1637_set_brightness   (LEVEL 0-7)
 *   - tm1637_clear            (全桁消灯)
 *
 * 内部 lib: `akj7/TM1637 Driver@^2.2.1` (commit #2 で追加済、blink/scroll/animation 内蔵)
 * boardRequires: null (GPIO 全 board 対応)
 * 制約: 1 プログラムにつき 1 モジュールのみ (compile-time pin 固定、教育用途では十分)
 *
 * post-Phase 4-4 commit 8 fix (case_0470-0474, 2026-05-06):
 * 旧実装は `TM1637<4, 1> tm1637Display(${clk}, ${dio});` を emit、これは
 * template syntax の誤用で `'TM1637' is not a template` で全 5 block fail。
 * 真の lib API は (ML30 内 v2.2.1 ヘッダ直接 grep で確証):
 *   - `class TM1637 { ... };` (NOT a template、line 130)
 *   - constructor `TM1637(uint8_t clkPin, uint8_t dataPin) noexcept` (line 141、2 args)
 *   - `static constexpr uint8_t TOTAL_DIGITS = 4;` (固定、template parameter ではない)
 *   - methods: `begin()` / `display(value)` / `colonOn()` / `colonOff()` /
 *     `setBrightness(uint8_t)` / `changeBrightness(uint8_t)` / `clearScreen()`
 * 第80回 commit ca2b789 で TM1637 5 block 追加時、generator 設計時の lib API
 * 確認漏れによる systematic 設計欠陥 (rules/digicode/03-block-workflow.md
 * 「lib API 実 grep 確証」追記候補)。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const TM1637_COLOR = '#9C27B0';

function buildTm1637Include(clk: string | number, dio: string | number): string {
  // emits: include_tm1637 (header + tm1637Display global、constructor 2 args)
  // requires: nothing (file-scope declaration)
  return `
#include <TM1637.h>
TM1637 tm1637Display(${clk}, ${dio});`;
}

Blockly.Blocks['tm1637_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_TM1637_INIT || 'TM1637 を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_TM1637_CLK || 'CLK ピン')
        .appendField(new Blockly.FieldNumber(26, 0, 39, 1), 'CLK');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_TM1637_DIO || 'DIO ピン')
        .appendField(new Blockly.FieldNumber(25, 0, 39, 1), 'DIO');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TM1637_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TM1637_INIT_TOOLTIP || 'TM1637 4桁7セグメントディスプレイを初期化します。akj7/TM1637 Driver lib 使用、4 桁固定 (TOTAL_DIGITS=4)、コロンは colonOn()/colonOff() で制御。');
  }
};

generator.forBlock['tm1637_init'] = function(block: Blockly.Block) {
  const clk = block.getFieldValue('CLK');
  const dio = block.getFieldValue('DIO');
  generator.definitions_['include_tm1637'] = buildTm1637Include(clk, dio);
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['tm1637_begin'] = 'tm1637Display.begin();';
  return '';
};

Blockly.Blocks['tm1637_show_number'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_TM1637_SHOW_NUMBER || 'TM1637 数値表示'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TM1637_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TM1637_SHOW_NUMBER_TOOLTIP || 'TM1637 に整数を表示します (-999〜9999、コロン off)。事前に tm1637_init が必要。');
  }
};

generator.forBlock['tm1637_show_number'] = function(block: Blockly.Block) {
  const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  generator.definitions_['include_tm1637'] = generator.definitions_['include_tm1637'] || buildTm1637Include(26, 25);
  return `tm1637Display.colonOff();\ntm1637Display.display((int16_t)(${value}));\n`;
};

Blockly.Blocks['tm1637_show_with_colon'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_TM1637_SHOW_TIME || 'TM1637 時刻表示'));
    this.appendValueInput('HH')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_TM1637_HH || '時');
    this.appendValueInput('MM')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_TM1637_MM || '分');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TM1637_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TM1637_SHOW_TIME_TOOLTIP || 'TM1637 に時刻を HH:MM 形式で表示します (コロン on)。事前に tm1637_init が必要。');
  }
};

generator.forBlock['tm1637_show_with_colon'] = function(block: Blockly.Block) {
  const hh = generator.valueToCode(block, 'HH', Order.ATOMIC) || '0';
  const mm = generator.valueToCode(block, 'MM', Order.ATOMIC) || '0';
  generator.definitions_['include_tm1637'] = generator.definitions_['include_tm1637'] || buildTm1637Include(26, 25);
  return `tm1637Display.colonOn();\ntm1637Display.display((int16_t)(((${hh}) * 100) + (${mm})));\n`;
};

Blockly.Blocks['tm1637_set_brightness'] = {
  init: function() {
    this.appendValueInput('LEVEL')
        .setCheck('Number')
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_TM1637_SET_BRIGHTNESS || 'TM1637 輝度'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TM1637_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TM1637_SET_BRIGHTNESS_TOOLTIP || 'TM1637 の輝度を 0 (最暗) 〜 7 (最明) で設定します。');
  }
};

generator.forBlock['tm1637_set_brightness'] = function(block: Blockly.Block) {
  const level = generator.valueToCode(block, 'LEVEL', Order.ATOMIC) || '4';
  generator.definitions_['include_tm1637'] = generator.definitions_['include_tm1637'] || buildTm1637Include(26, 25);
  return `tm1637Display.changeBrightness((uint8_t)(${level}));\n`;
};

Blockly.Blocks['tm1637_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💡 ' + (Blockly.Msg.BLOCKS_TM1637_CLEAR || 'TM1637 クリア'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TM1637_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TM1637_CLEAR_TOOLTIP || 'TM1637 の全桁を消灯します。');
  }
};

generator.forBlock['tm1637_clear'] = function() {
  generator.definitions_['include_tm1637'] = generator.definitions_['include_tm1637'] || buildTm1637Include(26, 25);
  return 'tm1637Display.colonOff();\ntm1637Display.clearScreen();\n';
};

console.log('TM1637 7-segment display blocks loaded');
