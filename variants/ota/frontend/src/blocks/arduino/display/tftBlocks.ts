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
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_INIT || 'TFT Init'))
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
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_INITTOOLTIP || 'Initialize TFT display. Select your driver (ILI9341/ST7789/ST7735) and set CS/DC/RST pins. Uses hardware SPI.');
  }
};

generator.forBlock['tft_init'] = function(block: Blockly.Block) {
  const driver = block.getFieldValue('DRIVER');
  const cs = block.getFieldValue('CS');
  const dc = block.getFieldValue('DC');
  const rst = block.getFieldValue('RST');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  const driverCode: Record<string, string> = {
    ILI9341: `tft = new Adafruit_ILI9341(${cs}, ${dc}, ${rst});`,
    ST7789: `tft = new Adafruit_ST7789(${cs}, ${dc}, ${rst});`,
    ST7735: `tft = new Adafruit_ST7735(${cs}, ${dc}, ${rst});`,
  };
  return `  ${driverCode[driver] || driverCode['ILI9341']}\n  tft->begin();\n`;
};

/**
 * tft_fill_screen - 全画面塗りつぶし
 */
Blockly.Blocks['tft_fill_screen'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_FILLSCREEN || 'TFT Fill Screen'))
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_FILLSCREENTOOLTIP || 'Fill the entire screen with one color.');
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
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_PIXEL || 'TFT Pixel'))
        .appendField('X').appendField(new Blockly.FieldNumber(0, 0, 319), 'X')
        .appendField('Y').appendField(new Blockly.FieldNumber(0, 0, 239), 'Y')
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_PIXELTOOLTIP || 'Draw a single pixel at (X, Y).');
  }
};

generator.forBlock['tft_draw_pixel'] = function(block: Blockly.Block) {
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const color = block.getFieldValue('COLOR');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) tft->drawPixel(${x}, ${y}, ${color});\n`;
};

/**
 * tft_draw_line - 直線描画
 */
Blockly.Blocks['tft_draw_line'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_LINE || 'TFT Line'))
        .appendField('X1').appendField(new Blockly.FieldNumber(0, 0, 319), 'X1')
        .appendField('Y1').appendField(new Blockly.FieldNumber(0, 0, 239), 'Y1')
        .appendField('X2').appendField(new Blockly.FieldNumber(100, 0, 319), 'X2')
        .appendField('Y2').appendField(new Blockly.FieldNumber(100, 0, 239), 'Y2')
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_LINETOOLTIP || 'Draw a line from (X1,Y1) to (X2,Y2).');
  }
};

generator.forBlock['tft_draw_line'] = function(block: Blockly.Block) {
  const x1 = block.getFieldValue('X1');
  const y1 = block.getFieldValue('Y1');
  const x2 = block.getFieldValue('X2');
  const y2 = block.getFieldValue('Y2');
  const color = block.getFieldValue('COLOR');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) tft->drawLine(${x1}, ${y1}, ${x2}, ${y2}, ${color});\n`;
};

/**
 * tft_draw_rect - 矩形描画（枠 or 塗りつぶし）
 */
Blockly.Blocks['tft_draw_rect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_RECT || 'TFT Rect'))
        .appendField('X').appendField(new Blockly.FieldNumber(10, 0, 319), 'X')
        .appendField('Y').appendField(new Blockly.FieldNumber(10, 0, 239), 'Y')
        .appendField('W').appendField(new Blockly.FieldNumber(100, 1, 320), 'W')
        .appendField('H').appendField(new Blockly.FieldNumber(50, 1, 240), 'H');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR')
        .appendField((Blockly.Msg as any).BLOCKS_TFT_FILL || 'fill')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'FILL');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_RECTTOOLTIP || 'Draw a rectangle. Uncheck fill for outline only, check fill for solid rectangle.');
  }
};

generator.forBlock['tft_draw_rect'] = function(block: Blockly.Block) {
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const w = block.getFieldValue('W');
  const h = block.getFieldValue('H');
  const color = block.getFieldValue('COLOR');
  const fill = block.getFieldValue('FILL') === 'TRUE';
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  const method = fill ? 'fillRect' : 'drawRect';
  return `  if (tft) tft->${method}(${x}, ${y}, ${w}, ${h}, ${color});\n`;
};

/**
 * tft_draw_circle - 円描画（枠 or 塗りつぶし）
 */
Blockly.Blocks['tft_draw_circle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_CIRCLE || 'TFT Circle'))
        .appendField('X').appendField(new Blockly.FieldNumber(60, 0, 319), 'X')
        .appendField('Y').appendField(new Blockly.FieldNumber(60, 0, 239), 'Y')
        .appendField('R').appendField(new Blockly.FieldNumber(30, 1, 160), 'R');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR')
        .appendField((Blockly.Msg as any).BLOCKS_TFT_FILL || 'fill')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'FILL');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_CIRCLETOOLTIP || 'Draw a circle centered at (X,Y) with radius R. Uncheck fill for outline only.');
  }
};

generator.forBlock['tft_draw_circle'] = function(block: Blockly.Block) {
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const r = block.getFieldValue('R');
  const color = block.getFieldValue('COLOR');
  const fill = block.getFieldValue('FILL') === 'TRUE';
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  const method = fill ? 'fillCircle' : 'drawCircle';
  return `  if (tft) tft->${method}(${x}, ${y}, ${r}, ${color});\n`;
};

/**
 * tft_set_cursor - 文字カーソル位置・サイズ・色設定
 */
Blockly.Blocks['tft_set_cursor'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_SETCURSOR || 'TFT Set Cursor'))
        .appendField('X').appendField(new Blockly.FieldNumber(0, 0, 319), 'X')
        .appendField('Y').appendField(new Blockly.FieldNumber(0, 0, 239), 'Y');
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_TFT_SIZE || 'size')
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'SIZE')
        .appendField(new Blockly.FieldDropdown(TFT_COLOR_DROPDOWN), 'COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_SETCURSORTOOLTIP || 'Set text cursor position, size and color. Call before tft_print. Size 1=6x8px, size 2=12x16px etc.');
  }
};

generator.forBlock['tft_set_cursor'] = function(block: Blockly.Block) {
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const size = block.getFieldValue('SIZE');
  const color = block.getFieldValue('COLOR');
  generator.definitions_['include_tft'] = TFT_INCLUDES;
  return `  if (tft) { tft->setCursor(${x}, ${y}); tft->setTextSize(${size}); tft->setTextColor(${color}); }\n`;
};

/**
 * tft_print - 現在カーソル位置に文字列出力
 */
Blockly.Blocks['tft_print'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck(null)
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_PRINT || 'TFT Print'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_PRINTTOOLTIP || 'Print text at the current cursor position. Call tft_set_cursor first to set position, size and color.');
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
        .appendField('🖼️ ' + ((Blockly.Msg as any).BLOCKS_TFT_COLORRGB || 'TFT Color RGB'))
        .appendField('R').appendField(new Blockly.FieldNumber(255, 0, 255), 'R')
        .appendField('G').appendField(new Blockly.FieldNumber(0, 0, 255), 'G')
        .appendField('B').appendField(new Blockly.FieldNumber(0, 0, 255), 'B');
    this.setOutput(true, 'Number');
    this.setColour(TFT_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_TFT_COLORRGBTOOLTIP || 'Convert RGB values (0-255 each) to a 16-bit RGB565 color code for use with TFT drawing blocks.');
  }
};

generator.forBlock['tft_color_rgb'] = function(block: Blockly.Block) {
  const r = block.getFieldValue('R');
  const g = block.getFieldValue('G');
  const b = block.getFieldValue('B');
  return [`(uint16_t)(((${r} & 0xF8) << 8) | ((${g} & 0xFC) << 3) | ((${b} & 0xF8) >> 3))`, 0];
};

console.log('TFT display blocks loaded');
