/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * NeoMatrix (NeoPixel 2D) ブロック (52.md 中推奨、第80回 commit #16 / 2026-05-04)
 *
 * 4 ブロック構成 (Q-H 確定、Adafruit_GFX 互換、既存 NeoPixel(6) は strip のみ):
 *   - neomatrix_init      (PIN/W/H、8x8 default)
 *   - neomatrix_set_pixel (X/Y/COLOR、hex 文字列 #RRGGBB)
 *   - neomatrix_clear     (fillScreen 0)
 *   - neomatrix_show      (buffer → LED 反映)
 *
 * 内部 lib: `adafruit/Adafruit NeoMatrix@^1.3.3` (commit #2 で追加済) + 既存 NeoPixel + GFX
 * boardRequires: null (汎用 GPIO 全 board 対応、ただし NeoPixel 信号 timing 厳格)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const NEOMATRIX_COLOR = '#9C27B0';

const NEOMATRIX_INCLUDE = `
#include <Adafruit_GFX.h>
#include <Adafruit_NeoMatrix.h>
#include <Adafruit_NeoPixel.h>
Adafruit_NeoMatrix* nmDisplay = nullptr;
// hex 文字列 "#RRGGBB" or "RRGGBB" → 24-bit RGB → matrix.Color()
static uint16_t _nmParseColor(const String& hex) {
  String s = hex; s.trim();
  if (s.startsWith("#")) s = s.substring(1);
  if (s.length() < 6) return 0;
  long val = strtol(s.c_str(), NULL, 16);
  uint8_t r = (val >> 16) & 0xFF;
  uint8_t g = (val >> 8) & 0xFF;
  uint8_t b = val & 0xFF;
  return ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);  // RGB565
}`;

Blockly.Blocks['neomatrix_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_NEOMATRIX_INIT || 'NeoMatrix を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NEOMATRIX_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(6, 0, 39, 1), 'PIN');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NEOMATRIX_W || '幅')
        .appendField(new Blockly.FieldNumber(8, 1, 64, 1), 'W');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_NEOMATRIX_H || '高さ')
        .appendField(new Blockly.FieldNumber(8, 1, 64, 1), 'H');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOMATRIX_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOMATRIX_INIT_TOOLTIP || 'NeoMatrix (NeoPixel 2D) を初期化します。デフォルト 8x8、TOP+LEFT+ROWS+PROGRESSIVE 配線。WS2812B / SK6812 互換。');
  }
};

generator.forBlock['neomatrix_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const w = block.getFieldValue('W');
  const h = block.getFieldValue('H');
  generator.definitions_['include_neomatrix'] = NEOMATRIX_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  // case 19 axis 2 (Session 120): first-wins guard for NeoMatrix w/h/pin.
  if (!generator.setups_['neomatrix_init']) {
    generator.setups_['neomatrix_init'] = `if (!nmDisplay) {
    nmDisplay = new Adafruit_NeoMatrix(${w}, ${h}, ${pin},
      NEO_MATRIX_TOP + NEO_MATRIX_LEFT + NEO_MATRIX_ROWS + NEO_MATRIX_PROGRESSIVE,
      NEO_GRB + NEO_KHZ800);
    nmDisplay->begin();
    nmDisplay->setBrightness(50);
    nmDisplay->fillScreen(0);
    nmDisplay->show();
  }`;
  }
  return '';
};

Blockly.Blocks['neomatrix_set_pixel'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_NEOMATRIX_SET_PIXEL || 'NeoMatrix ピクセル'));
    this.appendValueInput('X')
        .setCheck('Number')
        .appendField('X');
    this.appendValueInput('Y')
        .setCheck('Number')
        .appendField('Y');
    this.appendValueInput('COLOR')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_NEOMATRIX_COLOR || '色');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOMATRIX_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOMATRIX_SET_PIXEL_TOOLTIP || 'NeoMatrix のピクセルに色を設定します。色は hex 文字列 "#FF0000" 形式。show で反映。');
  }
};

generator.forBlock['neomatrix_set_pixel'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  const color = generator.valueToCode(block, 'COLOR', Order.ATOMIC) || '"#FF0000"';
  generator.definitions_['include_neomatrix'] = generator.definitions_['include_neomatrix'] || NEOMATRIX_INCLUDE;
  return `if (nmDisplay) nmDisplay->drawPixel((int16_t)(${x}), (int16_t)(${y}), _nmParseColor(String(${color})));\n`;
};

Blockly.Blocks['neomatrix_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_NEOMATRIX_CLEAR || 'NeoMatrix クリア'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOMATRIX_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOMATRIX_CLEAR_TOOLTIP || 'NeoMatrix を全消灯します (buffer reset、show で反映)。');
  }
};

generator.forBlock['neomatrix_clear'] = function() {
  generator.definitions_['include_neomatrix'] = generator.definitions_['include_neomatrix'] || NEOMATRIX_INCLUDE;
  return 'if (nmDisplay) nmDisplay->fillScreen(0);\n';
};

Blockly.Blocks['neomatrix_show'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🌈 ' + (Blockly.Msg.BLOCKS_NEOMATRIX_SHOW || 'NeoMatrix 描画反映'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NEOMATRIX_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_NEOMATRIX_SHOW_TOOLTIP || 'NeoMatrix buffer の内容を物理 LED に反映します。set_pixel 後に必須。');
  }
};

generator.forBlock['neomatrix_show'] = function() {
  generator.definitions_['include_neomatrix'] = generator.definitions_['include_neomatrix'] || NEOMATRIX_INCLUDE;
  return 'if (nmDisplay) nmDisplay->show();\n';
};

console.log('NeoMatrix blocks loaded');
