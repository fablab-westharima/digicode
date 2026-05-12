/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * TFT ディスプレイブロック (BP6-4, 2026-04-20)
 *
 * Adafruit ILI9341 / Adafruit ST7735 and ST7789 Library 使用
 * Adafruit_GFX ベースクラスのポインタで ILI9341/ST7789/ST7735 を統一管理
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const TFT_COLOR = '#9C27B0';

// 定番色の RGB565 値
const TFT_COLORS: [string, string][] = [
  ['BLACK', '0x0000'],
  ['WHITE', '0xFFFF'],
  ['RED', '0xF800'],
  ['GREEN', '0x07E0'],
  ['BLUE', '0x001F'],
  ['YELLOW', '0xFFE0'],
  ['CYAN', '0x07FF'],
  ['MAGENTA', '0xF81F'],
  ['ORANGE', '0xFD20'],
  ['PURPLE', '0x8010'],
  ['GRAY', '0x8410'],
];

const TFT_COLOR_DROPDOWN = TFT_COLORS.map(([name, val]) => [name, val]) as [string, string][];

const TFT_INCLUDES = `
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>
#include <Adafruit_ST7789.h>
#include <Adafruit_ST7735.h>
Adafruit_GFX* tft = nullptr;`;

/**
 * tft_init - TFT 初期化（driver 選択）
 */
Blockly.Blocks['tft_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_INIT || 'TFT Init'))
        .appendField(new Blockly.FieldDropdown([
          ['ILI9341 (320x240)', 'ILI9341'],
          ['ST7789 (240x240/320)', 'ST7789'],
          ['ST7735 (128x160)', 'ST7735'],
        ]), 'DRIVER');
    this.appendDummyInput()
        .appendField('CS')
        .appendField(new Blockly.FieldNumber(5, 0, 39), 'CS')
        .appendField('DC')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'DC')
        .appendField('RST')
        .appendField(new Blockly.FieldNumber(4, 0, 39), 'RST');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_INITTOOLTIP || 'Initialize TFT display. Select your driver (ILI9341/ST7789/ST7735) and set CS/DC/RST pins. Uses hardware SPI.');
  }
};

generator.forBlock['tft_init'] = function(block: Blockly.Block) {
  const driver = block.getFieldValue('DRIVER');
  const cs = block.getFieldValue('CS');
  const dc = block.getFieldValue('DC');
  const rst = block.getFieldValue('RST');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  // Init method differs per driver and is *not* virtual on Adafruit_GFX:
  //   ILI9341 uses begin() with no args
  //   ST7789  uses init(w, h)        (e.g., 240x240 default)
  //   ST7735  uses initR(INITR_BLACKTAB)
  // We construct the concrete subclass, call its specific init, then store
  // through the Adafruit_GFX* pointer for shared draw operations (fillScreen,
  // drawLine, ... are virtual on the base).
  const driverCode: Record<string, string> = {
    ILI9341: `{ Adafruit_ILI9341* _drv = new Adafruit_ILI9341(${cs}, ${dc}, ${rst}); _drv->begin(); tft = _drv; }`,
    ST7789:  `{ Adafruit_ST7789* _drv = new Adafruit_ST7789(${cs}, ${dc}, ${rst}); _drv->init(240, 240); tft = _drv; }`,
    ST7735:  `{ Adafruit_ST7735* _drv = new Adafruit_ST7735(${cs}, ${dc}, ${rst}); _drv->initR(INITR_BLACKTAB); tft = _drv; }`,
  };
  return `  ${driverCode[driver] || driverCode['ILI9341']}\n`;
};

/**
 * tft_fill_screen - 全画面塗りつぶし
 */
Blockly.Blocks['tft_fill_screen'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_FILLSCREEN || 'TFT Fill Screen'))
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_FILLSCREENTOOLTIP || 'Fill the entire screen with one color.');
  }
};

generator.forBlock['tft_fill_screen'] = function(block: Blockly.Block) {
  const color = block.getFieldValue('COLOR');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) tft->fillScreen(${color});\n`;
};

/**
 * tft_draw_pixel - ピクセル描画
 */
Blockly.Blocks['tft_draw_pixel'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_PIXEL || 'TFT Pixel'));
    this.appendValueInput('X').appendField('X');
    this.appendValueInput('Y').appendField('Y');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_PIXELTOOLTIP || 'Draw a single pixel at (X, Y).');
  }
};

generator.forBlock['tft_draw_pixel'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  const color = block.getFieldValue('COLOR');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) tft->drawPixel(String(${x}).toInt(), String(${y}).toInt(), ${color});\n`;
};

/**
 * tft_draw_line - 直線描画
 */
Blockly.Blocks['tft_draw_line'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_LINE || 'TFT Line'));
    this.appendValueInput('X1').appendField('X1');
    this.appendValueInput('Y1').appendField('Y1');
    this.appendValueInput('X2').appendField('X2');
    this.appendValueInput('Y2').appendField('Y2');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_LINETOOLTIP || 'Draw a line from (X1,Y1) to (X2,Y2).');
  }
};

generator.forBlock['tft_draw_line'] = function(block: Blockly.Block) {
  const x1 = generator.valueToCode(block, 'X1', generator.ORDER_ATOMIC) || '0';
  const y1 = generator.valueToCode(block, 'Y1', generator.ORDER_ATOMIC) || '0';
  const x2 = generator.valueToCode(block, 'X2', generator.ORDER_ATOMIC) || '100';
  const y2 = generator.valueToCode(block, 'Y2', generator.ORDER_ATOMIC) || '100';
  const color = block.getFieldValue('COLOR');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) tft->drawLine(String(${x1}).toInt(), String(${y1}).toInt(), String(${x2}).toInt(), String(${y2}).toInt(), ${color});\n`;
};

/**
 * tft_draw_rect - 矩形描画（枠 or 塗りつぶし）
 */
Blockly.Blocks['tft_draw_rect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_RECT || 'TFT Rect'));
    this.appendValueInput('X').appendField('X');
    this.appendValueInput('Y').appendField('Y');
    this.appendValueInput('W').appendField('W');
    this.appendValueInput('H').appendField('H');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR')
        .appendField(Blockly.Msg.BLOCKS_TFT_FILL || 'fill')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'FILL');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_RECTTOOLTIP || 'Draw a rectangle. Uncheck fill for outline only, check fill for solid rectangle.');
  }
};

generator.forBlock['tft_draw_rect'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '10';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '10';
  const w = generator.valueToCode(block, 'W', generator.ORDER_ATOMIC) || '100';
  const h = generator.valueToCode(block, 'H', generator.ORDER_ATOMIC) || '50';
  const color = block.getFieldValue('COLOR');
  const fill = block.getFieldValue('FILL') === 'TRUE';
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  const method = fill ? 'fillRect' : 'drawRect';
  return `  if (tft) tft->${method}(String(${x}).toInt(), String(${y}).toInt(), String(${w}).toInt(), String(${h}).toInt(), ${color});\n`;
};

/**
 * tft_draw_circle - 円描画（枠 or 塗りつぶし）
 */
Blockly.Blocks['tft_draw_circle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_CIRCLE || 'TFT Circle'));
    this.appendValueInput('X').appendField('X');
    this.appendValueInput('Y').appendField('Y');
    this.appendValueInput('R').appendField('R');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR')
        .appendField(Blockly.Msg.BLOCKS_TFT_FILL || 'fill')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'FILL');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_CIRCLETOOLTIP || 'Draw a circle centered at (X,Y) with radius R. Uncheck fill for outline only.');
  }
};

generator.forBlock['tft_draw_circle'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '60';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '60';
  const r = generator.valueToCode(block, 'R', generator.ORDER_ATOMIC) || '30';
  const color = block.getFieldValue('COLOR');
  const fill = block.getFieldValue('FILL') === 'TRUE';
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  const method = fill ? 'fillCircle' : 'drawCircle';
  return `  if (tft) tft->${method}(String(${x}).toInt(), String(${y}).toInt(), String(${r}).toInt(), ${color});\n`;
};

/**
 * tft_set_cursor - 文字カーソル位置・サイズ・色設定
 */
Blockly.Blocks['tft_set_cursor'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_SETCURSOR || 'TFT Set Cursor'));
    this.appendValueInput('X').appendField('X');
    this.appendValueInput('Y').appendField('Y');
    this.appendValueInput('SIZE').appendField(Blockly.Msg.BLOCKS_TFT_SIZE || 'size');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_SETCURSORTOOLTIP || 'Set text cursor position, size and color. Call before tft_print. Size 1=6x8px, size 2=12x16px etc.');
  }
};

generator.forBlock['tft_set_cursor'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', generator.ORDER_ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', generator.ORDER_ATOMIC) || '0';
  const size = generator.valueToCode(block, 'SIZE', generator.ORDER_ATOMIC) || '2';
  const color = block.getFieldValue('COLOR');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) { tft->setCursor(String(${x}).toInt(), String(${y}).toInt()); tft->setTextSize(String(${size}).toInt()); tft->setTextColor(${color}); }\n`;
};

/**
 * tft_print - 現在カーソル位置に文字列出力
 */
Blockly.Blocks['tft_print'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_PRINT || 'TFT Print'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_PRINTTOOLTIP || 'Print text at the current cursor position. Call tft_set_cursor first to set position, size and color.');
  }
};

generator.forBlock['tft_print'] = function(block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', 0) || '""';
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) tft->println(${text});\n`;
};

/**
 * tft_color_rgb - RGB 値から RGB565 色コードを生成（ヘルパー）
 */
Blockly.Blocks['tft_color_rgb'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + (Blockly.Msg.BLOCKS_TFT_COLORRGB || 'TFT Color RGB'));
    this.appendValueInput('R').appendField('R');
    this.appendValueInput('G').appendField('G');
    this.appendValueInput('B').appendField('B');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour(TFT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TFT_COLORRGBTOOLTIP || 'Convert RGB values (0-255 each) to a 16-bit RGB565 color code for use with TFT drawing blocks.');
  }
};

generator.forBlock['tft_color_rgb'] = function(block: Blockly.Block) {
  const r = generator.valueToCode(block, 'R', generator.ORDER_ATOMIC) || '255';
  const g = generator.valueToCode(block, 'G', generator.ORDER_ATOMIC) || '0';
  const b = generator.valueToCode(block, 'B', generator.ORDER_ATOMIC) || '0';
  return [`(uint16_t)(((String(${r}).toInt() & 0xF8) << 8) | ((String(${g}).toInt() & 0xFC) << 3) | ((String(${b}).toInt() & 0xF8) >> 3))`, 0];
};

console.log('TFT display blocks loaded');
