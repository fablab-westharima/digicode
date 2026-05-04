/**
 * MAX7219 LEDマトリクスブロック (52.md Phase C、第80回 commit #4 / 2026-05-04)
 *
 * 6 ブロック構成 (Fab Academy 頻出デバイス):
 *   - max7219_init           (DIN/CS/CLK pin + N modules、最大 8 連結)
 *   - max7219_set_pixel      (X/Y/STATE、buffer に書込み、show で反映)
 *   - max7219_clear          (全モジュール消灯 buffer + 即時反映)
 *   - max7219_scroll_text    (TEXT/SPEED ms、5x7 font 利用)
 *   - max7219_set_brightness (LEVEL 0-15)
 *   - max7219_show           (buffer → 物理 LED 反映)
 *
 * 内部 lib: なし (inline SPI-based driver、教育用途で完結、~150 LOC)
 *           htcw_max7219 lib は lib_deps に残置 (無害、template-heavy で本実装では未使用)
 * boardRequires: null (SPI 全 board 対応)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const MAX7219_COLOR = '#E91E63';

const MAX7219_INCLUDE = `
#include <SPI.h>
// MAX7219 register addresses
#define MAX7219_REG_NOOP        0x00
#define MAX7219_REG_DIGIT0      0x01
#define MAX7219_REG_DECODE_MODE 0x09
#define MAX7219_REG_INTENSITY   0x0A
#define MAX7219_REG_SCAN_LIMIT  0x0B
#define MAX7219_REG_SHUTDOWN    0x0C
#define MAX7219_REG_DISPLAY_TEST 0x0F

#define MAX7219_MAX_MODULES 8
struct Max7219State {
  uint8_t din;
  uint8_t cs;
  uint8_t clk;
  uint8_t n;
  uint8_t buffer[MAX7219_MAX_MODULES * 8];  // [module * 8 + row] = 8-bit row
  bool inited;
};
static Max7219State _max7219State = {23, 5, 18, 1, {0}, false};

static void _max7219SendRow(uint8_t addr, const uint8_t* data) {
  digitalWrite(_max7219State.cs, LOW);
  for (int8_t m = (int8_t)_max7219State.n - 1; m >= 0; m--) {
    SPI.transfer(addr);
    SPI.transfer(data[m]);
  }
  digitalWrite(_max7219State.cs, HIGH);
}
static void _max7219SendCmdAll(uint8_t addr, uint8_t data) {
  digitalWrite(_max7219State.cs, LOW);
  for (uint8_t m = 0; m < _max7219State.n; m++) {
    SPI.transfer(addr);
    SPI.transfer(data);
  }
  digitalWrite(_max7219State.cs, HIGH);
}

static void max7219Init(uint8_t din, uint8_t cs, uint8_t clk, uint8_t n) {
  if (n > MAX7219_MAX_MODULES) n = MAX7219_MAX_MODULES;
  _max7219State.din = din;
  _max7219State.cs = cs;
  _max7219State.clk = clk;
  _max7219State.n = n;
  pinMode(cs, OUTPUT);
  digitalWrite(cs, HIGH);
  // MAX7219 uses MSBFIRST + SPI mode 0、ESP32 default SPI で OK
  SPI.begin();
  _max7219SendCmdAll(MAX7219_REG_DECODE_MODE, 0x00);   // no decode (raw segment)
  _max7219SendCmdAll(MAX7219_REG_SCAN_LIMIT, 0x07);    // scan all 8 digits
  _max7219SendCmdAll(MAX7219_REG_INTENSITY, 0x08);     // half brightness
  _max7219SendCmdAll(MAX7219_REG_DISPLAY_TEST, 0x00);  // disable test
  _max7219SendCmdAll(MAX7219_REG_SHUTDOWN, 0x01);      // exit shutdown
  memset(_max7219State.buffer, 0, sizeof(_max7219State.buffer));
  _max7219State.inited = true;
}

static void max7219SetPixel(int x, int y, bool state) {
  if (!_max7219State.inited) return;
  if (x < 0 || y < 0 || y > 7) return;
  uint8_t module = (uint8_t)(x / 8);
  if (module >= _max7219State.n) return;
  uint8_t bit = (uint8_t)(7 - (x % 8));
  uint8_t* row = &_max7219State.buffer[module * 8 + y];
  if (state) *row |= (1 << bit); else *row &= ~(1 << bit);
}

static void max7219Show() {
  if (!_max7219State.inited) return;
  uint8_t rowData[MAX7219_MAX_MODULES];
  for (uint8_t y = 0; y < 8; y++) {
    for (uint8_t m = 0; m < _max7219State.n; m++) {
      rowData[m] = _max7219State.buffer[m * 8 + y];
    }
    _max7219SendRow(MAX7219_REG_DIGIT0 + y, rowData);
  }
}

static void max7219Clear() {
  if (!_max7219State.inited) return;
  memset(_max7219State.buffer, 0, sizeof(_max7219State.buffer));
  max7219Show();
}

static void max7219SetBrightness(uint8_t level) {
  if (!_max7219State.inited) return;
  if (level > 15) level = 15;
  _max7219SendCmdAll(MAX7219_REG_INTENSITY, level);
}

// Minimal 5x7 font for ASCII 0x20-0x7F (compact、5 columns/char)
static const uint8_t MAX7219_FONT[][5] PROGMEM = {
  {0x00,0x00,0x00,0x00,0x00}, // space
  {0x00,0x00,0x5F,0x00,0x00}, // !
  {0x00,0x07,0x00,0x07,0x00}, // "
  {0x14,0x7F,0x14,0x7F,0x14}, // #
  {0x24,0x2A,0x7F,0x2A,0x12}, // $
  {0x23,0x13,0x08,0x64,0x62}, // %
  {0x36,0x49,0x55,0x22,0x50}, // &
  {0x00,0x05,0x03,0x00,0x00}, // '
  {0x00,0x1C,0x22,0x41,0x00}, // (
  {0x00,0x41,0x22,0x1C,0x00}, // )
  {0x14,0x08,0x3E,0x08,0x14}, // *
  {0x08,0x08,0x3E,0x08,0x08}, // +
  {0x00,0x50,0x30,0x00,0x00}, // ,
  {0x08,0x08,0x08,0x08,0x08}, // -
  {0x00,0x60,0x60,0x00,0x00}, // .
  {0x20,0x10,0x08,0x04,0x02}, // /
  {0x3E,0x51,0x49,0x45,0x3E}, // 0
  {0x00,0x42,0x7F,0x40,0x00}, // 1
  {0x42,0x61,0x51,0x49,0x46}, // 2
  {0x21,0x41,0x45,0x4B,0x31}, // 3
  {0x18,0x14,0x12,0x7F,0x10}, // 4
  {0x27,0x45,0x45,0x45,0x39}, // 5
  {0x3C,0x4A,0x49,0x49,0x30}, // 6
  {0x01,0x71,0x09,0x05,0x03}, // 7
  {0x36,0x49,0x49,0x49,0x36}, // 8
  {0x06,0x49,0x49,0x29,0x1E}, // 9
  {0x00,0x36,0x36,0x00,0x00}, // :
  {0x00,0x56,0x36,0x00,0x00}, // ;
  {0x00,0x08,0x14,0x22,0x41}, // <
  {0x14,0x14,0x14,0x14,0x14}, // =
  {0x41,0x22,0x14,0x08,0x00}, // >
  {0x02,0x01,0x51,0x09,0x06}, // ?
  {0x32,0x49,0x79,0x41,0x3E}, // @
  {0x7E,0x11,0x11,0x11,0x7E}, // A
  {0x7F,0x49,0x49,0x49,0x36}, // B
  {0x3E,0x41,0x41,0x41,0x22}, // C
  {0x7F,0x41,0x41,0x22,0x1C}, // D
  {0x7F,0x49,0x49,0x49,0x41}, // E
  {0x7F,0x09,0x09,0x09,0x01}, // F
  {0x3E,0x41,0x49,0x49,0x7A}, // G
  {0x7F,0x08,0x08,0x08,0x7F}, // H
  {0x00,0x41,0x7F,0x41,0x00}, // I
  {0x20,0x40,0x41,0x3F,0x01}, // J
  {0x7F,0x08,0x14,0x22,0x41}, // K
  {0x7F,0x40,0x40,0x40,0x40}, // L
  {0x7F,0x02,0x0C,0x02,0x7F}, // M
  {0x7F,0x04,0x08,0x10,0x7F}, // N
  {0x3E,0x41,0x41,0x41,0x3E}, // O
  {0x7F,0x09,0x09,0x09,0x06}, // P
  {0x3E,0x41,0x51,0x21,0x5E}, // Q
  {0x7F,0x09,0x19,0x29,0x46}, // R
  {0x46,0x49,0x49,0x49,0x31}, // S
  {0x01,0x01,0x7F,0x01,0x01}, // T
  {0x3F,0x40,0x40,0x40,0x3F}, // U
  {0x1F,0x20,0x40,0x20,0x1F}, // V
  {0x3F,0x40,0x38,0x40,0x3F}, // W
  {0x63,0x14,0x08,0x14,0x63}, // X
  {0x07,0x08,0x70,0x08,0x07}, // Y
  {0x61,0x51,0x49,0x45,0x43}  // Z
};

static void max7219ScrollText(const char* text, uint16_t speedMs) {
  if (!_max7219State.inited) return;
  size_t len = strlen(text);
  uint8_t totalCols = (uint8_t)(_max7219State.n * 8);
  // For each scroll position s (column offset of text), render columns
  for (size_t s = 0; s < len * 6 + totalCols; s++) {
    memset(_max7219State.buffer, 0, sizeof(_max7219State.buffer));
    for (uint8_t col = 0; col < totalCols; col++) {
      int textCol = (int)(s + col) - (int)totalCols;
      if (textCol < 0) continue;
      size_t charIdx = (size_t)(textCol / 6);
      uint8_t inChar = (uint8_t)(textCol % 6);
      if (charIdx >= len) continue;
      uint8_t ch = (uint8_t)text[charIdx];
      if (ch < 0x20 || ch > 0x5A) ch = 0x20;
      if (inChar == 5) continue;  // gap
      uint8_t bits = pgm_read_byte(&MAX7219_FONT[ch - 0x20][inChar]);
      uint8_t module = (uint8_t)(col / 8);
      uint8_t bitInModule = (uint8_t)(7 - (col % 8));
      for (uint8_t y = 0; y < 7; y++) {
        if (bits & (1 << y)) {
          _max7219State.buffer[module * 8 + y] |= (1 << bitInModule);
        }
      }
    }
    max7219Show();
    delay(speedMs);
  }
}`;

Blockly.Blocks['max7219_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔲 ' + (Blockly.Msg.BLOCKS_MAX7219_INIT || 'MAX7219 を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MAX7219_DIN || 'DIN ピン')
        .appendField(new Blockly.FieldNumber(23, 0, 39, 1), 'DIN');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MAX7219_CS || 'CS ピン')
        .appendField(new Blockly.FieldNumber(5, 0, 39, 1), 'CS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MAX7219_CLK || 'CLK ピン')
        .appendField(new Blockly.FieldNumber(18, 0, 39, 1), 'CLK');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MAX7219_N || 'モジュール数')
        .appendField(new Blockly.FieldNumber(1, 1, 8, 1), 'N');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MAX7219_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX7219_INIT_TOOLTIP || 'MAX7219 8x8 LED マトリクスを初期化します。N モジュール (最大 8) を daisy-chain 接続。SPI 経由、inline driver。');
  }
};

generator.forBlock['max7219_init'] = function(block: Blockly.Block) {
  const din = block.getFieldValue('DIN');
  const cs = block.getFieldValue('CS');
  const clk = block.getFieldValue('CLK');
  const n = block.getFieldValue('N');
  generator.definitions_['include_max7219'] = MAX7219_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['max7219_init'] = `max7219Init(${din}, ${cs}, ${clk}, ${n});`;
  return '';
};

Blockly.Blocks['max7219_set_pixel'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔲 ' + (Blockly.Msg.BLOCKS_MAX7219_SET_PIXEL || 'MAX7219 ピクセル'));
    this.appendValueInput('X')
        .setCheck('Number')
        .appendField('X');
    this.appendValueInput('Y')
        .setCheck('Number')
        .appendField('Y');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ['ON', 'true'],
          ['OFF', 'false'],
        ]), 'STATE');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MAX7219_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX7219_SET_PIXEL_TOOLTIP || 'MAX7219 マトリクスの指定ピクセルを ON/OFF します。buffer に書込み、show で反映。');
  }
};

generator.forBlock['max7219_set_pixel'] = function(block: Blockly.Block) {
  const x = generator.valueToCode(block, 'X', Order.ATOMIC) || '0';
  const y = generator.valueToCode(block, 'Y', Order.ATOMIC) || '0';
  const state = block.getFieldValue('STATE');
  generator.definitions_['include_max7219'] = MAX7219_INCLUDE;
  return `max7219SetPixel((int)(${x}), (int)(${y}), ${state});\n`;
};

Blockly.Blocks['max7219_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔲 ' + (Blockly.Msg.BLOCKS_MAX7219_CLEAR || 'MAX7219 クリア'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MAX7219_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX7219_CLEAR_TOOLTIP || 'MAX7219 マトリクスを全消灯します (buffer reset + 即時反映)。');
  }
};

generator.forBlock['max7219_clear'] = function() {
  generator.definitions_['include_max7219'] = MAX7219_INCLUDE;
  return 'max7219Clear();\n';
};

Blockly.Blocks['max7219_scroll_text'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔲 ' + (Blockly.Msg.BLOCKS_MAX7219_SCROLL_TEXT || 'MAX7219 文字スクロール'));
    this.appendValueInput('TEXT')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_MAX7219_TEXT || '文字列');
    this.appendValueInput('SPEED')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_MAX7219_SPEED || '速度 (ms)');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MAX7219_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX7219_SCROLL_TEXT_TOOLTIP || 'MAX7219 マトリクスに文字列を左へスクロール表示します (5x7 font、ASCII 0x20-0x5A)。速度 (ms) は 1 列移動の delay。');
  }
};

generator.forBlock['max7219_scroll_text'] = function(block: Blockly.Block) {
  const text = generator.valueToCode(block, 'TEXT', Order.ATOMIC) || '"HELLO"';
  const speed = generator.valueToCode(block, 'SPEED', Order.ATOMIC) || '100';
  generator.definitions_['include_max7219'] = MAX7219_INCLUDE;
  return `max7219ScrollText(String(${text}).c_str(), (uint16_t)(${speed}));\n`;
};

Blockly.Blocks['max7219_set_brightness'] = {
  init: function() {
    this.appendValueInput('LEVEL')
        .setCheck('Number')
        .appendField('🔲 ' + (Blockly.Msg.BLOCKS_MAX7219_SET_BRIGHTNESS || 'MAX7219 輝度'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MAX7219_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX7219_SET_BRIGHTNESS_TOOLTIP || 'MAX7219 マトリクスの輝度を 0 (最暗) 〜 15 (最明) で設定します。');
  }
};

generator.forBlock['max7219_set_brightness'] = function(block: Blockly.Block) {
  const level = generator.valueToCode(block, 'LEVEL', Order.ATOMIC) || '8';
  generator.definitions_['include_max7219'] = MAX7219_INCLUDE;
  return `max7219SetBrightness((uint8_t)(${level}));\n`;
};

Blockly.Blocks['max7219_show'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔲 ' + (Blockly.Msg.BLOCKS_MAX7219_SHOW || 'MAX7219 描画反映'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MAX7219_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX7219_SHOW_TOOLTIP || 'MAX7219 buffer の内容を物理 LED に反映します。set_pixel 後に必須。');
  }
};

generator.forBlock['max7219_show'] = function() {
  generator.definitions_['include_max7219'] = MAX7219_INCLUDE;
  return 'max7219Show();\n';
};

console.log('MAX7219 LED matrix blocks loaded');
