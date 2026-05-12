/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * LCD I2C キャラクタ表示ブロック (BP5-3, 2026-04-20)
 *
 * LiquidCrystal_I2C ライブラリ（Frank de Brabander）使用
 * 16x2 / 20x4 等の I2C 接続 LCD モジュール対応
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const LCD_COLOR = '#1976D2';

const LCD_INCLUDE = `
#include <LiquidCrystal_I2C.h>`;

/**
 * lcd_init - LCD 初期化
 */
Blockly.Blocks['lcd_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📟 ' + (Blockly.Msg.BLOCKS_LCD_INIT || 'LCD Init'))
        .appendField(Blockly.Msg.BLOCKS_LCD_COLS || 'cols')
        .appendField(new Blockly.FieldNumber(16, 8, 40), 'COLS')
        .appendField(Blockly.Msg.BLOCKS_LCD_ROWS || 'rows')
        .appendField(new Blockly.FieldNumber(2, 1, 4), 'ROWS');
    this.appendDummyInput()
        .appendField('I2C addr')
        .appendField(new Blockly.FieldDropdown([
          ['0x27', '0x27'],
          ['0x3F', '0x3F'],
        ]), 'ADDR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LCD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LCD_INITTOOLTIP || 'Initialize LCD display via I2C. Common addresses: 0x27 (PCF8574) or 0x3F (PCF8574A). Use I2C scanner to find your address.');
  }
};

generator.forBlock['lcd_init'] = function(block: Blockly.Block) {
  const cols = block.getFieldValue('COLS');
  const rows = block.getFieldValue('ROWS');
  const addr = block.getFieldValue('ADDR');
  generator.definitions_['include_lcd'] = LCD_INCLUDE;
  generator.definitions_['lcd_instance'] = `LiquidCrystal_I2C lcd(${addr}, ${cols}, ${rows});`;
  return `  lcd.init();\n  lcd.backlight();\n`;
};

/**
 * lcd_print - 現在カーソル位置に出力
 */
Blockly.Blocks['lcd_print'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField('📟 ' + (Blockly.Msg.BLOCKS_LCD_PRINT || 'LCD Print'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LCD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LCD_PRINTTOOLTIP || 'Print text at the current cursor position on the LCD.');
  }
};

generator.forBlock['lcd_print'] = function(block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', 0) || '""';
  generator.definitions_['include_lcd'] = LCD_INCLUDE;
  return `  lcd.print(${text});\n`;
};

/**
 * lcd_print_at - 座標指定で出力
 */
Blockly.Blocks['lcd_print_at'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📟 ' + (Blockly.Msg.BLOCKS_LCD_PRINTAT || 'LCD Print At'));
    this.appendValueInput('X').setCheck('Number').appendField(Blockly.Msg.BLOCKS_LCD_COL || 'col');
    this.appendValueInput('Y').setCheck('Number').appendField(Blockly.Msg.BLOCKS_LCD_ROW || 'row');
    this.appendValueInput('TEXT')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_LCD_TEXT || 'text');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LCD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LCD_PRINTATTOOLTIP || 'Move cursor to (col, row) and print text. Col 0 = leftmost, Row 0 = top row.');
  }
};

generator.forBlock['lcd_print_at'] = function(block: Blockly.Block) {
  const x = javascriptGenerator.valueToCode(block, 'X', 0) || '0';
  const y = javascriptGenerator.valueToCode(block, 'Y', 0) || '0';
  const text = javascriptGenerator.valueToCode(block, 'TEXT', 0) || '""';
  generator.definitions_['include_lcd'] = LCD_INCLUDE;
  return `  lcd.setCursor(String(${x}).toInt(), String(${y}).toInt());\n  lcd.print(${text});\n`;
};

/**
 * lcd_clear - 画面クリア
 */
Blockly.Blocks['lcd_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📟 ' + (Blockly.Msg.BLOCKS_LCD_CLEAR || 'LCD Clear'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LCD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LCD_CLEARTOOLTIP || 'Clear all text on the LCD and move cursor to home position (0, 0).');
  }
};

generator.forBlock['lcd_clear'] = function() {
  generator.definitions_['include_lcd'] = LCD_INCLUDE;
  return '  lcd.clear();\n';
};

/**
 * lcd_backlight - バックライト ON/OFF
 */
Blockly.Blocks['lcd_backlight'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📟 ' + (Blockly.Msg.BLOCKS_LCD_BACKLIGHT || 'LCD Backlight'))
        .appendField(new Blockly.FieldCheckbox('TRUE'), 'ON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LCD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LCD_BACKLIGHTTOOLTIP || 'Turn the LCD backlight on or off.');
  }
};

generator.forBlock['lcd_backlight'] = function(block: Blockly.Block) {
  const on = block.getFieldValue('ON') === 'TRUE';
  generator.definitions_['include_lcd'] = LCD_INCLUDE;
  return on ? '  lcd.backlight();\n' : '  lcd.noBacklight();\n';
};

console.log('LCD blocks loaded');
