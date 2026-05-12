/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * UART 2（Serial2）ブロック (BP6-3, 2026-04-20)
 *
 * ESP32 の HardwareSerial UART2（Serial2）を使用
 * GPIO ピン指定で任意のピンに remap 可能 (DigiCode は ESP32 系 16 boards 専用)。
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const UART2_COLOR = '#607D8B';

// arduino-esp32 v3.x ships Serial2 as a definition in
// cores/esp32/HardwareSerial.cpp:49 (HardwareSerial Serial2(2);). Declaring it
// again here would cause `multiple definition of 'Serial2'` at link time.
// We keep the definitions_['include_uart2'] key for idempotent emit but the
// payload is comment-only — the framework's Serial2 is used directly. (BUG-067)
const UART2_INCLUDE = `
// Serial2 is provided by arduino-esp32 framework (BUG-067).`;

/**
 * serial2_begin - Serial2 初期化（ボーレート + ピン指定）
 */
Blockly.Blocks['serial2_begin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📠 ' + (Blockly.Msg.BLOCKS_UART2_BEGIN || 'Serial2 Begin'))
        .appendField(Blockly.Msg.BLOCKS_UART2_BAUD || 'baud')
        .appendField(new Blockly.FieldDropdown([
          ['9600', '9600'],
          ['19200', '19200'],
          ['38400', '38400'],
          ['57600', '57600'],
          ['115200', '115200'],
        ]), 'BAUD');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_UART2_RX || 'RX pin')
        .appendField(new Blockly.FieldNumber(16, 0, 39), 'RX')
        .appendField(Blockly.Msg.BLOCKS_UART2_TX || 'TX pin')
        .appendField(new Blockly.FieldNumber(17, 0, 39), 'TX');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(UART2_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_UART2_BEGINTOOLTIP || 'Initialize Serial2 (UART2) with specified baud rate and GPIO pins. Default: RX=16, TX=17.');
  }
};

generator.forBlock['serial2_begin'] = function(block: Blockly.Block) {
  const baud = block.getFieldValue('BAUD');
  const rx = block.getFieldValue('RX');
  const tx = block.getFieldValue('TX');
  generator.definitions_['include_uart2'] = UART2_INCLUDE;
  return `  Serial2.begin(${baud}, SERIAL_8N1, ${rx}, ${tx});\n`;
};

/**
 * serial2_print - 改行なし出力
 */
Blockly.Blocks['serial2_print'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField('📠 ' + (Blockly.Msg.BLOCKS_UART2_PRINT || 'Serial2 Print'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(UART2_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_UART2_PRINTTOOLTIP || 'Send data via Serial2 without newline.');
  }
};

generator.forBlock['serial2_print'] = function(block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', 0) || '""';
  generator.definitions_['include_uart2'] = UART2_INCLUDE;
  return `  Serial2.print(${text});\n`;
};

/**
 * serial2_println - 改行あり出力
 */
Blockly.Blocks['serial2_println'] = {
  init: function() {
    this.appendValueInput('TEXT')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField('📠 ' + (Blockly.Msg.BLOCKS_UART2_PRINTLN || 'Serial2 Println'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(UART2_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_UART2_PRINTLNTOOLTIP || 'Send data via Serial2 with newline at the end.');
  }
};

generator.forBlock['serial2_println'] = function(block: Blockly.Block) {
  const text = javascriptGenerator.valueToCode(block, 'TEXT', 0) || '""';
  generator.definitions_['include_uart2'] = UART2_INCLUDE;
  return `  Serial2.println(${text});\n`;
};

/**
 * serial2_read - 1 バイト読み取り
 */
Blockly.Blocks['serial2_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📠 ' + (Blockly.Msg.BLOCKS_UART2_READ || 'Serial2 Read'));
    this.setOutput(true, 'Number');
    this.setColour(UART2_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_UART2_READTOOLTIP || 'Read one byte from Serial2. Returns -1 if no data available.');
  }
};

generator.forBlock['serial2_read'] = function() {
  generator.definitions_['include_uart2'] = UART2_INCLUDE;
  return ['Serial2.read()', 0];
};

/**
 * serial2_read_string_until - 終端文字まで読み取り
 */
Blockly.Blocks['serial2_read_string_until'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📠 ' + (Blockly.Msg.BLOCKS_UART2_READUNTIL || 'Serial2 Read Until'))
        .appendField(Blockly.Msg.BLOCKS_UART2_TERMINATOR || 'terminator')
        .appendField(new Blockly.FieldTextInput('\\n'), 'TERM');
    this.setOutput(true, 'String');
    this.setColour(UART2_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_UART2_READUNTILTOOLTIP || 'Read from Serial2 until the terminator character. Returns the received string (without terminator).');
  }
};

generator.forBlock['serial2_read_string_until'] = function(block: Blockly.Block) {
  const term = block.getFieldValue('TERM');
  generator.definitions_['include_uart2'] = UART2_INCLUDE;
  return [`Serial2.readStringUntil('${term}')`, 0];
};

/**
 * serial2_available - 受信バッファのバイト数
 */
Blockly.Blocks['serial2_available'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📠 ' + (Blockly.Msg.BLOCKS_UART2_AVAILABLE || 'Serial2 Available'));
    this.setOutput(true, 'Number');
    this.setColour(UART2_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_UART2_AVAILABLETOOLTIP || 'Returns the number of bytes available to read from Serial2.');
  }
};

generator.forBlock['serial2_available'] = function() {
  generator.definitions_['include_uart2'] = UART2_INCLUDE;
  return ['Serial2.available()', 0];
};

console.log('UART2 (Serial2) blocks loaded');
