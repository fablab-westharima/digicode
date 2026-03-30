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
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_ATTACH || 'Attach Servo')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_ATTACHTOOLTIP || 'Attach servo to specified pin');
  }
};

javascriptGenerator.forBlock['servo_attach'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const pinNum = parseInt(pin, 10);
  const pulseWidth = getServoPulseWidth(isNaN(pinNum) ? undefined : pinNum);

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
Blockly.Blocks['servo_write'] = {
  init: function() {
    const pins = getServoPins();
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_WRITE || 'Servo Angle')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_ANGLE || 'angle')
        .appendField(new Blockly.FieldAngle(90), 'ANGLE')
        .appendField('°');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_WRITETOOLTIP || 'Move servo to specified angle');
  }
};

javascriptGenerator.forBlock['servo_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = block.getFieldValue('ANGLE');
  return `  servo${pin}.write(${angle});\n`;
};

pythonGenerator.forBlock['servo_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = block.getFieldValue('ANGLE');
  return `servo${pin}.duty(int(40 + (${angle} / 180) * 115))\n`;
};

// ===== Servo Write with Value Input =====
Blockly.Blocks['servo_write_value'] = {
  init: function() {
    const pins = getServoPins();
    this.appendValueInput('ANGLE')
        .setCheck('Number')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_WRITEVALUE || 'Servo Angle')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_ANGLE || 'angle');
    this.appendDummyInput()
        .appendField('°');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_WRITEVALUETOOLTIP || 'Move servo to angle from variable');
  }
};

javascriptGenerator.forBlock['servo_write_value'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';
  return `  servo${pin}.write(${angle});\n`;
};

pythonGenerator.forBlock['servo_write_value'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = pyGen.valueToCode(block, 'ANGLE', pyGen.ORDER_ATOMIC) || '90';
  return `servo${pin}.duty(int(40 + (${angle} / 180) * 115))\n`;
};

// ===== Servo Detach =====
Blockly.Blocks['servo_detach'] = {
  init: function() {
    const pins = getServoPins();
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_DETACH || 'Detach Servo')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_DETACHTOOLTIP || 'Detach servo (power saving)');
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
Blockly.Blocks['servo_sweep'] = {
  init: function() {
    const pins = getServoPins();
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_SWEEP || 'Servo Sweep')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(pins.servo1, 0, 39), 'PIN')
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_START || 'start')
        .appendField(new Blockly.FieldNumber(0, 0, 180), 'START')
        .appendField('°');
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_END || 'end')
        .appendField(new Blockly.FieldNumber(180, 0, 180), 'END')
        .appendField('° ' + ((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_SPEED || 'speed'))
        .appendField(new Blockly.FieldNumber(15, 1, 100), 'SPEED')
        .appendField('ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SERVO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_ACTUATOR_SERVO_SWEEPTOOLTIP || 'Move servo from start angle to end angle');
  }
};

javascriptGenerator.forBlock['servo_sweep'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const start = block.getFieldValue('START');
  const end = block.getFieldValue('END');
  const speed = block.getFieldValue('SPEED');

  const code = `
  for (int angle = ${start}; angle ${start < end ? '<=' : '>='} ${end}; angle ${start < end ? '++' : '--'}) {
    servo${pin}.write(angle);
    delay(${speed});
  }
`;
  return code;
};

pythonGenerator.forBlock['servo_sweep'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const start = block.getFieldValue('START');
  const end = block.getFieldValue('END');
  const speed = block.getFieldValue('SPEED');

  pyGen.definitions_['import_time'] = 'import time';

  const step = start < end ? 1 : -1;
  return `for angle in range(${start}, ${end} + ${step}, ${step}):
    servo${pin}.duty(int(40 + (angle / 180) * 115))
    time.sleep_ms(${speed})
`;
};

export {}; // Make this a module
