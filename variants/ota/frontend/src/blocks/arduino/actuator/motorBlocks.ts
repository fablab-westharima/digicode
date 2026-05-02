/*
 * DigiCode Motor Blocks
 *
 * DC Motor control blocks for ESP32/Arduino with L298N driver.
 * Default pins: Motor A (16, 17, 5), Motor B (23, 22, 21)
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getMotorPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const MOTOR_COLOR = '#607D8B';

// ===== Motor Init =====
Blockly.Blocks['motor_init'] = {
  init: function() {
    const pins = getMotorPins();
    const motorField = new Blockly.FieldDropdown([
      [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORA || 'Motor A', 'A'],
      [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORB || 'Motor B', 'B']
    ]);

    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_INIT || 'Initialize Motor')
        .appendField(motorField, 'MOTOR');

    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_IN1 || 'IN1')
        .appendField(new Blockly.FieldNumber(pins.aIn1, 0, 39), 'IN1')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_IN2 || 'IN2')
        .appendField(new Blockly.FieldNumber(pins.aIn2, 0, 39), 'IN2')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_ENA || 'ENA')
        .appendField(new Blockly.FieldNumber(pins.aEna, 0, 39), 'ENA');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MOTOR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_INITTOOLTIP || 'Initialize L298N motor driver');
  }
};

javascriptGenerator.forBlock['motor_init'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const ena = block.getFieldValue('ENA');

  generator.definitions_[`motor_${motor}_pins`] = `
#define MOTOR_${motor}_IN1 ${in1}
#define MOTOR_${motor}_IN2 ${in2}
#define MOTOR_${motor}_ENA ${ena}`;

  return `  pinMode(MOTOR_${motor}_IN1, OUTPUT);
  pinMode(MOTOR_${motor}_IN2, OUTPUT);
  pinMode(MOTOR_${motor}_ENA, OUTPUT);
`;
};

pythonGenerator.forBlock['motor_init'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const ena = block.getFieldValue('ENA');

  pyGen.definitions_['import_motor'] = 'from machine import Pin, PWM';
  pyGen.definitions_[`motor_${motor}_pins`] = `motor_${motor}_in1 = Pin(${in1}, Pin.OUT)
motor_${motor}_in2 = Pin(${in2}, Pin.OUT)
motor_${motor}_ena = PWM(Pin(${ena}), freq=1000)`;

  return '';
};

// ===== Motor Move =====
// SPEED is a value input (default shadow math_number 255) so users can drive
// motor speed from variables, sensor reads, BLE, etc. Legacy XML field-style
// loads with empty input; generator falls back to '255' (sunset: 2027-05-03).
Blockly.Blocks['motor_move'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOVE || 'Motor Move')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORA || 'Motor A', 'A'],
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORB || 'Motor B', 'B']
        ]), 'MOTOR')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_FORWARD || 'Forward', 'forward'],
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_BACKWARD || 'Backward', 'backward'],
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_STOP || 'Stop', 'stop']
        ]), 'DIRECTION');
    this.appendValueInput('SPEED')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_SPEED || 'speed');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MOTOR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOVETOOLTIP || 'Move motor in specified direction and speed');
  }
};

javascriptGenerator.forBlock['motor_move'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');
  const direction = block.getFieldValue('DIRECTION');
  const speed = generator.valueToCode(block, 'SPEED', generator.ORDER_ATOMIC) || '255';

  let code = '';
  if (direction === 'forward') {
    code = `  digitalWrite(MOTOR_${motor}_IN1, HIGH);
  digitalWrite(MOTOR_${motor}_IN2, LOW);
  analogWrite(MOTOR_${motor}_ENA, ${speed});
`;
  } else if (direction === 'backward') {
    code = `  digitalWrite(MOTOR_${motor}_IN1, LOW);
  digitalWrite(MOTOR_${motor}_IN2, HIGH);
  analogWrite(MOTOR_${motor}_ENA, ${speed});
`;
  } else {  // stop
    code = `  digitalWrite(MOTOR_${motor}_IN1, LOW);
  digitalWrite(MOTOR_${motor}_IN2, LOW);
  analogWrite(MOTOR_${motor}_ENA, 0);
`;
  }
  return code;
};

pythonGenerator.forBlock['motor_move'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');
  const direction = block.getFieldValue('DIRECTION');
  const speed = pyGen.valueToCode(block, 'SPEED', pyGen.ORDER_ATOMIC) || '255';

  // Duty conversion now happens at runtime so dynamic SPEED works correctly.
  const dutyExpr = `int(${speed} * 1023 / 255)`;

  let code = '';
  if (direction === 'forward') {
    code = `motor_${motor}_in1.value(1)
motor_${motor}_in2.value(0)
motor_${motor}_ena.duty(${dutyExpr})
`;
  } else if (direction === 'backward') {
    code = `motor_${motor}_in1.value(0)
motor_${motor}_in2.value(1)
motor_${motor}_ena.duty(${dutyExpr})
`;
  } else {  // stop
    code = `motor_${motor}_in1.value(0)
motor_${motor}_in2.value(0)
motor_${motor}_ena.duty(0)
`;
  }
  return code;
};

// ===== Motor Speed =====
// SPEED is a value input (default shadow math_number 255). Legacy XML field-style
// loads with empty input; generator falls back to '255' (sunset: 2027-05-03).
Blockly.Blocks['motor_speed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_SETSPEED || 'Motor Speed')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORA || 'Motor A', 'A'],
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORB || 'Motor B', 'B']
        ]), 'MOTOR');
    this.appendValueInput('SPEED')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_SPEED || 'speed');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MOTOR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_SETSPEEDTOOLTIP || 'Change motor speed only');
  }
};

javascriptGenerator.forBlock['motor_speed'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');
  const speed = generator.valueToCode(block, 'SPEED', generator.ORDER_ATOMIC) || '255';
  return `  analogWrite(MOTOR_${motor}_ENA, ${speed});\n`;
};

pythonGenerator.forBlock['motor_speed'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');
  const speed = pyGen.valueToCode(block, 'SPEED', pyGen.ORDER_ATOMIC) || '255';
  return `motor_${motor}_ena.duty(int(${speed} * 1023 / 255))\n`;
};

// ===== Motor Stop =====
Blockly.Blocks['motor_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_STOPLABEL || 'Stop Motor')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORA || 'Motor A', 'A'],
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_MOTORB || 'Motor B', 'B'],
          [Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_BOTH || 'Both', 'BOTH']
        ]), 'MOTOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MOTOR_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_MOTOR_STOPTOOLTIP || 'Stop the motor');
  }
};

javascriptGenerator.forBlock['motor_stop'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');

  if (motor === 'BOTH') {
    return `  digitalWrite(MOTOR_A_IN1, LOW);
  digitalWrite(MOTOR_A_IN2, LOW);
  analogWrite(MOTOR_A_ENA, 0);
  digitalWrite(MOTOR_B_IN1, LOW);
  digitalWrite(MOTOR_B_IN2, LOW);
  analogWrite(MOTOR_B_ENA, 0);
`;
  } else {
    return `  digitalWrite(MOTOR_${motor}_IN1, LOW);
  digitalWrite(MOTOR_${motor}_IN2, LOW);
  analogWrite(MOTOR_${motor}_ENA, 0);
`;
  }
};

pythonGenerator.forBlock['motor_stop'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');

  if (motor === 'BOTH') {
    return `motor_A_in1.value(0)
motor_A_in2.value(0)
motor_A_ena.duty(0)
motor_B_in1.value(0)
motor_B_in2.value(0)
motor_B_ena.duty(0)
`;
  } else {
    return `motor_${motor}_in1.value(0)
motor_${motor}_in2.value(0)
motor_${motor}_ena.duty(0)
`;
  }
};

export {}; // Make this a module
