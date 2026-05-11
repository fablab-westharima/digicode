/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// ===== 基本ブロック（5個）- 無料 =====

// 1. arduino_setup - セットアップ
Blockly.Blocks['arduino_setup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ARDUINO_SETUP_LABEL || 'Setup');
    this.appendStatementInput('SETUP')
        .setCheck(null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_ARDUINO_SETUP_TOOLTIP || 'Runs once when the program starts');
  }
};

javascriptGenerator.forBlock['arduino_setup'] = function(block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, 'SETUP');
  return `void setup() {\n${statements}}\n\n`;
};

// 2. arduino_loop - ループ
Blockly.Blocks['arduino_loop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ARDUINO_LOOP_LABEL || 'Loop');
    this.appendStatementInput('LOOP')
        .setCheck(null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_ARDUINO_LOOP_TOOLTIP || 'Runs repeatedly while the program is running');
  }
};

javascriptGenerator.forBlock['arduino_loop'] = function(block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, 'LOOP');
  return `void loop() {\n${statements}}\n`;
};

// 3. esp32_pin_mode - ピンモード設定
Blockly.Blocks['esp32_pin_mode'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_PINMODE_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_PINMODE_TO || ' ')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ESP32_PINMODE_OUTPUT || 'OUTPUT', 'OUTPUT'],
          [Blockly.Msg.BLOCKS_ESP32_PINMODE_INPUT || 'INPUT', 'INPUT'],
          [Blockly.Msg.BLOCKS_ESP32_PINMODE_INPUTPULLUP || 'INPUT_PULLUP', 'INPUT_PULLUP']
        ]), 'MODE')
        .appendField(Blockly.Msg.BLOCKS_ESP32_PINMODE_SET || 'set to');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_PINMODE_TOOLTIP || 'Configure GPIO pin mode');
  }
};

javascriptGenerator.forBlock['esp32_pin_mode'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  return `  pinMode(${pin}, ${mode});\n`;
};

// 4. esp32_digital_write - デジタル出力
Blockly.Blocks['esp32_digital_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_TO || ' ')
        .appendField(new Blockly.FieldDropdown([
          ['HIGH', 'HIGH'],
          ['LOW', 'LOW']
        ]), 'VALUE')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_OUTPUT || 'output');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_TOOLTIP || 'Write HIGH or LOW to digital pin');
  }
};

javascriptGenerator.forBlock['esp32_digital_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return `  digitalWrite(${pin}, ${value});\n`;
};

// 5. esp32_digital_read - デジタル入力
Blockly.Blocks['esp32_digital_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALREAD_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALREAD_INPUT || 'read');
    // BUG-070: digitalRead returns int 0/1 — accept both Number and Boolean
    // sockets so connections like ha_binary_sensor_update.VALUE (Boolean)
    // don't get silently rejected by the Blockly type checker, leaving the
    // block as an orphan top block whose scrubNakedValue emits
    // `digitalRead(N);` at file scope.
    this.setOutput(true, ['Number', 'Boolean']);
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_DIGITALREAD_TOOLTIP || 'Read digital pin state');
  }
};

javascriptGenerator.forBlock['esp32_digital_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return [`digitalRead(${pin})`, Order.FUNCTION_CALL];
};

// ===== 拡張ブロック（10個）- 無料 =====

// 6. esp32_analog_read - アナログ入力
Blockly.Blocks['esp32_analog_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGREAD_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGREAD_INPUT || 'analog read');
    this.setOutput(true, 'Number');
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_ANALOGREAD_TOOLTIP || 'Read analog pin (0-4095)');
  }
};

javascriptGenerator.forBlock['esp32_analog_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, Order.FUNCTION_CALL];
};

// 7. esp32_analog_write - PWM出力
Blockly.Blocks['esp32_analog_write'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGWRITE_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGWRITE_PWM || 'PWM output');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_ANALOGWRITE_TOOLTIP || 'Output PWM (0-255)');
  }
};

javascriptGenerator.forBlock['esp32_analog_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  return `  analogWrite(${pin}, ${value});\n`;
};

// 8. esp32_delay - 遅延
Blockly.Blocks['esp32_delay'] = {
  init: function() {
    this.appendValueInput('TIME')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DELAY_WAIT || 'Wait');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_DELAY_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_DELAY_TOOLTIP || 'Pause for specified milliseconds');
  }
};

javascriptGenerator.forBlock['esp32_delay'] = function(block: Blockly.Block) {
  const time = javascriptGenerator.valueToCode(block, 'TIME', Order.ATOMIC) || '1000';
  return `  delay(${time});\n`;
};

// 9. esp32_millis - 経過時間
Blockly.Blocks['esp32_millis'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_MILLIS_LABEL || 'Elapsed time (ms)');
    this.setOutput(true, 'Number');
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_MILLIS_TOOLTIP || 'Returns elapsed time since start');
  }
};

javascriptGenerator.forBlock['esp32_millis'] = function() {
  return ['millis()', Order.FUNCTION_CALL];
};

// 10. esp32_serial_begin - シリアル通信開始
Blockly.Blocks['esp32_serial_begin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERIALBEGIN_LABEL || 'Serial begin')
        .appendField(new Blockly.FieldDropdown([
          ['9600', '9600'],
          ['115200', '115200'],
          ['57600', '57600'],
          ['38400', '38400']
        ]), 'BAUD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_SERIALBEGIN_TOOLTIP || 'Start serial communication');
  }
};

javascriptGenerator.forBlock['esp32_serial_begin'] = function(block: Blockly.Block) {
  const baud = block.getFieldValue('BAUD');
  return `  Serial.begin(${baud});\n`;
};

// 11. esp32_serial_print - シリアル出力
Blockly.Blocks['esp32_serial_print'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERIALPRINT_LABEL || 'Serial print');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_SERIALPRINT_TOOLTIP || 'Output to serial monitor (no newline)');
  }
};

javascriptGenerator.forBlock['esp32_serial_print'] = function(block: Blockly.Block) {
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""';
  return `  Serial.print(${value});\n`;
};

// 12. esp32_serial_println - シリアル出力（改行）
Blockly.Blocks['esp32_serial_println'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck(['Number', 'String', 'Boolean'])
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERIALPRINTLN_LABEL || 'Serial println');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_SERIALPRINTLN_TOOLTIP || 'Output to serial monitor with newline');
  }
};

javascriptGenerator.forBlock['esp32_serial_println'] = function(block: Blockly.Block) {
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""';
  return `  Serial.println(${value});\n`;
};

// 13. esp32_builtin_led_on - LED ON
Blockly.Blocks['esp32_builtin_led_on'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDON_LABEL || 'Built-in LED ON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDON_TOOLTIP || 'Turn on built-in LED (GPIO 2)');
  }
};

javascriptGenerator.forBlock['esp32_builtin_led_on'] = function() {
  return '  digitalWrite(2, HIGH);\n';
};

// 14. esp32_builtin_led_off - LED OFF
Blockly.Blocks['esp32_builtin_led_off'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDOFF_LABEL || 'Built-in LED OFF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDOFF_TOOLTIP || 'Turn off built-in LED (GPIO 2)');
  }
};

javascriptGenerator.forBlock['esp32_builtin_led_off'] = function() {
  return '  digitalWrite(2, LOW);\n';
};

// math_map - 範囲変換（Arduino map() 関数）
Blockly.Blocks['math_map'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_MATH_MAP || 'map');
    this.appendValueInput('FROM_LOW')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_MATH_MAPFROM || 'from');
    this.appendValueInput('FROM_HIGH')
        .setCheck('Number')
        .appendField('~');
    this.appendValueInput('TO_LOW')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_MATH_MAPTO || 'to');
    this.appendValueInput('TO_HIGH')
        .setCheck('Number')
        .appendField('~');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setColour('#3b82f6');
    this.setTooltip(Blockly.Msg.BLOCKS_MATH_MAPTOOLTIP || 'Re-maps a number from one range to another (Arduino map function)');
  }
};

javascriptGenerator.forBlock['math_map'] = function(block: Blockly.Block) {
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  const fromLow = javascriptGenerator.valueToCode(block, 'FROM_LOW', Order.ATOMIC) || '0';
  const fromHigh = javascriptGenerator.valueToCode(block, 'FROM_HIGH', Order.ATOMIC) || '1023';
  const toLow = javascriptGenerator.valueToCode(block, 'TO_LOW', Order.ATOMIC) || '0';
  const toHigh = javascriptGenerator.valueToCode(block, 'TO_HIGH', Order.ATOMIC) || '255';
  return [`map(${value}, ${fromLow}, ${fromHigh}, ${toLow}, ${toHigh})`, Order.FUNCTION_CALL];
};

// Arduino C++ブロックの初期化完了
console.log('ESP32 Arduino C++ blocks loaded');
