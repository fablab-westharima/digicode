/**
 * TM1637 4桁7セグメントディスプレイブロック (52.md Phase C、第80回 commit #3 / 2026-05-04)
 *
 * 5 ブロック構成 (Fab Academy 頻出デバイス):
 *   - tm1637_init             (CLK/DIO pins、akj7/TM1637 Driver、4-digit + colon)
 *   - tm1637_show_number      (VALUE Number、整数表示)
 *   - tm1637_show_with_colon  (HH/MM Number、時刻表示、template colon 利用)
 *   - tm1637_set_brightness   (LEVEL 0-7)
 *   - tm1637_clear            (全桁消灯)
 *
 * 内部 lib: `akj7/TM1637 Driver@^2.2.1` (commit #2 で追加済、blink/scroll/animation 内蔵)
 * boardRequires: null (GPIO 全 board 対応)
 * 制約: 1 プログラムにつき 1 モジュールのみ (compile-time pin 固定、教育用途では十分)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const TM1637_COLOR = '#9C27B0';

function buildTm1637Include(clk: string | number, dio: string | number): string {
  return `
#include <TM1637.h>
TM1637<4, 1> tm1637Display(${clk}, ${dio});`;
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
    this.setTooltip(Blockly.Msg.BLOCKS_TM1637_INIT_TOOLTIP || 'TM1637 4桁7セグメントディスプレイを初期化します。akj7/TM1637 Driver lib 使用、template <4, 1> で 4 桁 + index 1 にコロン。');
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
