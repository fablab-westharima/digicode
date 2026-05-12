/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * OLED SSD1306 ブロック (51.md Phase A+B、第79回 commit #11 / 2026-05-04)
 *
 * 10 ブロック構成 (Fab Academy Final Project + FS 講座メーター表示):
 *   - oled_ssd1306_init           (ADDR=0x3C hex, WIDTH=128, HEIGHT=64)
 *   - oled_ssd1306_clear          / display              (frame buffer 操作)
 *   - oled_ssd1306_print          (TEXT, X, Y)
 *   - oled_ssd1306_draw_pixel / draw_line / draw_rect / draw_circle  (図形描画)
 *   - oled_ssd1306_set_text_size / invert
 *
 * 内部 lib: `adafruit/Adafruit SSD1306` + `adafruit/Adafruit GFX Library` (既存 ✅)
 * boardRequires: null (I²C 全 board 対応)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const OLED_COLOR = '#37474F';

const OLED_INCLUDE = `
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
Adafruit_SSD1306 oledDisplay(128, 64, &Wire, -1);`;

Blockly.Blocks['oled_ssd1306_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_INIT || 'OLED (SSD1306) を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_OLED_SSD1306_ADDR || 'I2C アドレス')
        .appendField(new Blockly.FieldDropdown([
          ['0x3C', '0x3C'],
          ['0x3D', '0x3D'],
        ]), 'ADDR');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_OLED_SSD1306_WIDTH || '幅')
        .appendField(new Blockly.FieldNumber(128, 1, 256, 1), 'WIDTH');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_OLED_SSD1306_HEIGHT || '高さ')
        .appendField(new Blockly.FieldNumber(64, 1, 256, 1), 'HEIGHT');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_INIT_TOOLTIP || 'SSD1306 OLED ディスプレイを I2C で初期化します。一般的な default は 128x64 / 0x3C。Adafruit SSD1306 lib 使用。');
  }
};

generator.forBlock['oled_ssd1306_init'] = function(block: Blockly.Block) {
  const addr = block.getFieldValue('ADDR');
  // Note: WIDTH/HEIGHT は Adafruit_SSD1306 constructor 引数。global 宣言を上書きするため
  // 128x64 以外を使う場合は OLED_INCLUDE の constructor を変更する必要があるが、
  // Adafruit lib は constructor 値しか効かないので runtime field は無視 (info 用に保持)。
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['oled_ssd1306_begin'] = `Wire.begin();
  oledDisplay.begin(SSD1306_SWITCHCAPVCC, ${addr});
  oledDisplay.clearDisplay();
  oledDisplay.setTextSize(1);
  oledDisplay.setTextColor(SSD1306_WHITE);
  oledDisplay.display();`;
  return '';
};

Blockly.Blocks['oled_ssd1306_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_CLEAR || 'OLED クリア'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_CLEAR_TOOLTIP || 'OLED フレームバッファをクリアします。oled_ssd1306_display で実画面に反映。');
  }
};

generator.forBlock['oled_ssd1306_clear'] = function() {
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return 'oledDisplay.clearDisplay();\n';
};

Blockly.Blocks['oled_ssd1306_print'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_PRINT || 'OLED に表示'));
    this.appendValueInput('TEXT')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_OLED_SSD1306_TEXT || 'テキスト');
    this.appendValueInput('X')
        .setCheck('Number')
        .appendField('X');
    this.appendValueInput('Y')
        .setCheck('Number')
        .appendField('Y');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_PRINT_TOOLTIP || '指定座標 (X,Y) からテキストを表示します。フレームバッファに描画、oled_ssd1306_display で反映。');
  }
};

generator.forBlock['oled_ssd1306_print'] = function(block: Blockly.Block) {
  const text = generator.valueToCode(block, 'TEXT', Order.ATOMIC) || '""';
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return `oledDisplay.setCursor(${x}, ${y});\n  oledDisplay.print(String(${text}));\n`;
};

Blockly.Blocks['oled_ssd1306_draw_pixel'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_PIXEL || 'OLED ピクセル描画'));
    this.appendValueInput('X').setCheck('Number').appendField('X');
    this.appendValueInput('Y').setCheck('Number').appendField('Y');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_PIXEL_TOOLTIP || 'OLED の (X,Y) に 1 ピクセル描画します。');
  }
};

generator.forBlock['oled_ssd1306_draw_pixel'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return `oledDisplay.drawPixel(${x}, ${y}, SSD1306_WHITE);\n`;
};

Blockly.Blocks['oled_ssd1306_draw_line'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_LINE || 'OLED 線描画'));
    this.appendValueInput('X1').setCheck('Number').appendField('X1');
    this.appendValueInput('Y1').setCheck('Number').appendField('Y1');
    this.appendValueInput('X2').setCheck('Number').appendField('X2');
    this.appendValueInput('Y2').setCheck('Number').appendField('Y2');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_LINE_TOOLTIP || 'OLED の (X1,Y1) から (X2,Y2) まで直線を描画します。');
  }
};

generator.forBlock['oled_ssd1306_draw_line'] = function(block: Blockly.Block) {
  const x1 = generator.valueToCode(block, 'X1', Order.ATOMIC) || '0';
  const y1 = generator.valueToCode(block, 'Y1', Order.ATOMIC) || '0';
  const x2 = generator.valueToCode(block, 'X2', Order.ATOMIC) || '0';
  const y2 = generator.valueToCode(block, 'Y2', Order.ATOMIC) || '0';
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return `oledDisplay.drawLine(${x1}, ${y1}, ${x2}, ${y2}, SSD1306_WHITE);\n`;
};

Blockly.Blocks['oled_ssd1306_draw_rect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_RECT || 'OLED 矩形描画'));
    this.appendValueInput('X').setCheck('Number').appendField('X');
    this.appendValueInput('Y').setCheck('Number').appendField('Y');
    this.appendValueInput('W').setCheck('Number').appendField('W');
    this.appendValueInput('H').setCheck('Number').appendField('H');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_RECT_TOOLTIP || 'OLED に矩形を描画します (X,Y は左上、W=幅, H=高さ)。');
  }
};

generator.forBlock['oled_ssd1306_draw_rect'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  const w = generator.valueToCode(block, 'W', Order.ATOMIC) || '10';
  const h = generator.valueToCode(block, 'H', Order.ATOMIC) || '10';
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return `oledDisplay.drawRect(${x}, ${y}, ${w}, ${h}, SSD1306_WHITE);\n`;
};

Blockly.Blocks['oled_ssd1306_draw_circle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_CIRCLE || 'OLED 円描画'));
    this.appendValueInput('X').setCheck('Number').appendField('X');
    this.appendValueInput('Y').setCheck('Number').appendField('Y');
    this.appendValueInput('R').setCheck('Number').appendField('R');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_DRAW_CIRCLE_TOOLTIP || 'OLED に円を描画します (X,Y=中心, R=半径)。');
  }
};

generator.forBlock['oled_ssd1306_draw_circle'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  const r = generator.valueToCode(block, 'R', Order.ATOMIC) || '5';
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return `oledDisplay.drawCircle(${x}, ${y}, ${r}, SSD1306_WHITE);\n`;
};

Blockly.Blocks['oled_ssd1306_set_text_size'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_SET_TEXT_SIZE || 'OLED テキストサイズ'));
    this.appendValueInput('SIZE').setCheck('Number').appendField(Blockly.Msg.BLOCKS_OLED_SSD1306_SIZE || 'サイズ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_SET_TEXT_SIZE_TOOLTIP || 'OLED のテキストサイズを設定します (1 = 6x8 px、2 = 12x16 px、...)');
  }
};

generator.forBlock['oled_ssd1306_set_text_size'] = function(block: Blockly.Block) {
  const size = generator.valueToCode(block, 'SIZE', Order.ATOMIC) || '1';
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return `oledDisplay.setTextSize(${size});\n`;
};

Blockly.Blocks['oled_ssd1306_invert'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_INVERT || 'OLED 反転'));
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_OLED_SSD1306_INVERT_ON || 'ON', 'true'],
          [Blockly.Msg.BLOCKS_OLED_SSD1306_INVERT_OFF || 'OFF', 'false'],
        ]), 'INVERT');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_INVERT_TOOLTIP || 'OLED 表示の白黒を反転します。');
  }
};

generator.forBlock['oled_ssd1306_invert'] = function(block: Blockly.Block) {
  const inv = block.getFieldValue('INVERT');
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return `oledDisplay.invertDisplay(${inv});\n`;
};

Blockly.Blocks['oled_ssd1306_display'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖥️ ' + (Blockly.Msg.BLOCKS_OLED_SSD1306_DISPLAY || 'OLED 描画反映'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OLED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_OLED_SSD1306_DISPLAY_TOOLTIP || 'OLED フレームバッファを実画面に反映します。clear/print/draw_* の後に必ず呼出してください。');
  }
};

generator.forBlock['oled_ssd1306_display'] = function() {
  generator.definitions_['include_oled_ssd1306'] = OLED_INCLUDE;
  return 'oledDisplay.display();\n';
};

console.log('OLED SSD1306 blocks loaded');
