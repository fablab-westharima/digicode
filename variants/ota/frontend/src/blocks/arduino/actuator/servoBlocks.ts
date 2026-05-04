/*
 * DigiCode Servo Blocks
 *
 * Generic servo control blocks for ESP32/Arduino.
 * Supports both 180° and 360° continuous rotation servos.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getServoPins, getServoPulseWidth } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

// definitions_オブジェクトを初期化
if (!generator.definitions_) {
  generator.definitions_ = {};
}
if (!pyGen.definitions_) {
  pyGen.definitions_ = {};
}

const SERVO_COLOR = '#FF5722';

// ===== Servo Attach =====
Blockly.Blocks['servo_attach'] = {
  init: function() {
    const pins = getServoPins();
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_ATTACH || 'Attach Servo')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_ATTACHTOOLTIP || 'Attach servo to specified pin');
  }
};

javascriptGenerator.forBlock['servo_attach'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const pinNum = parseInt(pin, 10);
  const pulseWidth = getServoPulseWidth(isNaN(pinNum) ? undefined : pinNum);

  // DigiCode は ESP32 系 16 boards 専用 (56.md 2026-05-05、RP2040 削除)。
  // ESP32Servo の attach(pin, min, max) / write(angle) API を固定使用。
  generator.definitions_['include_servo'] = '#include <ESP32Servo.h>';
  generator.definitions_[`servo_${pin}_instance`] = `Servo servo${pin};`;
  return `  servo${pin}.attach(${pin}, ${pulseWidth.min}, ${pulseWidth.max});\n`;
};

pythonGenerator.forBlock['servo_attach'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  pyGen.definitions_['import_servo'] = 'from machine import Pin, PWM';
  pyGen.definitions_[`servo_${pin}_instance`] = `servo${pin} = PWM(Pin(${pin}), freq=50)`;
  return '';
};

// ===== Servo Write Angle =====
// ANGLE is a value input (with default shadow math_number 90) so users can
// drive the servo from variables, BLE-received values, math expressions, etc.
// Legacy XML using `<field name="ANGLE">N</field>` loads with empty input;
// generator falls back to '90' to preserve compile success (sunset: 2027-05-03).
Blockly.Blocks['servo_write'] = {
  init: function() {
    const pins = getServoPins();
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_WRITE || 'Servo Angle')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN');
    this.appendValueInput('ANGLE')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_ANGLE || 'angle');
    this.appendDummyInput()
        .appendField('°');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_WRITETOOLTIP || 'Move servo to specified angle');
  }
};

javascriptGenerator.forBlock['servo_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';
  // Wrap in `String(${expr}).toInt()` so any input type compiles in Arduino:
  //   - numeric literal `90`         → `String(90).toInt()` → 90
  //   - String (e.g. ble_received_value) → `String(bleMessage).toInt()` → parsed int
  //   - boolean / variable           → coerced through String() constructor
  // Necessary because servo.write() takes an int, but value-input slots accept
  // any block (setCheck removed in c531097 to support BLE-driven angles).
  return `  servo${pin}.write(String(${angle}).toInt());\n`;
};

pythonGenerator.forBlock['servo_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = pyGen.valueToCode(block, 'ANGLE', pyGen.ORDER_ATOMIC) || '90';
  return `servo${pin}.duty(int(40 + (${angle} / 180) * 115))\n`;
};

// Legacy alias: servo_write_value → servo_write (sunset: 2027-05-03)
//
// servo_write was upgraded to a permissive value input in commits b0b004f
// (FieldAngle → value input + shadow) and c531097 (setCheck removal),
// making servo_write_value functionally identical and a confusing duplicate
// in the toolbox (ja.json had `write` and `writeValue` both rendering as
// "サーボ角度" — visually indistinguishable).
//
// Aliasing preserves backward compat for any saved XML that still references
// `<block type="servo_write_value">` — Blockly.Blocks lookup resolves to the
// same definition + generator, so old projects load and compile unchanged.
//
// The catalog generator only scans `Blockly.Blocks['xxx'] = { init: ... }`
// patterns, so this alias is not exposed in block-catalog.json. The toolbox
// entry was also removed in this commit. i18n keys `servo.writeValue` /
// `writeValueTooltip` are now orphaned across 5 langs — leaving them in place
// for now; sunset cleanup removes them on 2027-05-03.
Blockly.Blocks['servo_write_value'] = Blockly.Blocks['servo_write'];
javascriptGenerator.forBlock['servo_write_value'] = javascriptGenerator.forBlock['servo_write'];
pythonGenerator.forBlock['servo_write_value'] = pythonGenerator.forBlock['servo_write'];

// ===== Servo Detach =====
Blockly.Blocks['servo_detach'] = {
  init: function() {
    const pins = getServoPins();
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_DETACH || 'Detach Servo')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_DETACHTOOLTIP || 'Detach servo (power saving)');
  }
};

javascriptGenerator.forBlock['servo_detach'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return `  servo${pin}.detach();\n`;
};

pythonGenerator.forBlock['servo_detach'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return `servo${pin}.deinit()\n`;
};

// ===== Servo Sweep =====
// START/END/SPEED are value inputs (default shadows math_number 0/180/15) so
// users can drive the sweep with variables, sensor reads, etc. The cpp
// generator computes direction at runtime (s/e may be variables) — previous
// codegen-time `start < end ? '<=' : '>='` would not work for dynamic values.
// Legacy XML field-style loads with empty inputs; fallback defaults preserve
// compile success (sunset: 2027-05-03).
Blockly.Blocks['servo_sweep'] = {
  init: function() {
    const pins = getServoPins();
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_SWEEP || 'Servo Sweep')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN');
    this.appendValueInput('START')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_START || 'start');
    this.appendValueInput('END')
        .appendField('° ' + (Blockly.Msg.BLOCKS_ACTUATOR_SERVO_END || 'end'));
    this.appendValueInput('SPEED')
        .appendField('° ' + (Blockly.Msg.BLOCKS_ACTUATOR_SERVO_SPEED || 'speed'));
    this.appendDummyInput()
        .appendField('ms');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_SERVO_SWEEPTOOLTIP || 'Move servo from start angle to end angle');
  }
};

javascriptGenerator.forBlock['servo_sweep'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const start = generator.valueToCode(block, 'START', generator.ORDER_ATOMIC) || '0';
  const end = generator.valueToCode(block, 'END', generator.ORDER_ATOMIC) || '180';
  const speed = generator.valueToCode(block, 'SPEED', generator.ORDER_ATOMIC) || '15';

  // String(${expr}).toInt() wrap: see servo_write generator note (handles
  // numeric, String, boolean, variable inputs uniformly so BLE-driven values
  // compile cleanly).
  const code = `  {
    int _sweepStart = String(${start}).toInt();
    int _sweepEnd = String(${end}).toInt();
    int _sweepStep = (_sweepStart <= _sweepEnd) ? 1 : -1;
    for (int angle = _sweepStart; (_sweepStep > 0) ? angle <= _sweepEnd : angle >= _sweepEnd; angle += _sweepStep) {
      servo${pin}.write(angle);
      delay(String(${speed}).toInt());
    }
  }
`;
  return code;
};

pythonGenerator.forBlock['servo_sweep'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const start = pyGen.valueToCode(block, 'START', pyGen.ORDER_ATOMIC) || '0';
  const end = pyGen.valueToCode(block, 'END', pyGen.ORDER_ATOMIC) || '180';
  const speed = pyGen.valueToCode(block, 'SPEED', pyGen.ORDER_ATOMIC) || '15';

  pyGen.definitions_['import_time'] = 'import time';

  // Direction (start vs end) is computed at runtime so variables/expressions work.
  return `_sweepStart = ${start}
_sweepEnd = ${end}
_sweepStep = 1 if _sweepStart <= _sweepEnd else -1
for angle in range(_sweepStart, _sweepEnd + _sweepStep, _sweepStep):
    servo${pin}.duty(int(40 + (angle / 180) * 115))
    time.sleep_ms(${speed})
`;
};

export {}; // Make this a module
