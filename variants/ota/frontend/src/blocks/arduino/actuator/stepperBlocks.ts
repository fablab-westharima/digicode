/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiCode Stepper Motor Blocks
 *
 * Stepper motor control blocks for ESP32/Arduino.
 * Supports 28BYJ-48 with ULN2003 driver.
 * Default pins: GPIO 26, 12, 2, 32
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getStepperPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const STEPPER_COLOR = '#795548';

// モジュールロード時のログ
console.error('🚀 [stepperBlocks.ts] MODULE LOADED AT:', new Date().toISOString());

// ===== Stepper Init =====
Blockly.Blocks['stepper_init'] = {
  init: function() {
    const pins = getStepperPins();
    // Debug: ブロック作成時のBlockly.Msg値を確認
    const msgValue = Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INIT;
    console.warn('🔧 [stepper_init] BLOCK INIT CALLED! Blockly.Msg value =', msgValue);
    this.appendDummyInput()
        .appendField(msgValue || 'MISSING');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_IN1)
        .appendField(new Blockly.FieldNumber(pins.in1, 0, 39), 'IN1')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_IN2)
        .appendField(new Blockly.FieldNumber(pins.in2, 0, 39), 'IN2');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_IN3)
        .appendField(new Blockly.FieldNumber(pins.in3, 0, 39), 'IN3')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_IN4)
        .appendField(new Blockly.FieldNumber(pins.in4, 0, 39), 'IN4');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_INITTOOLTIP);
  }
};

javascriptGenerator.forBlock['stepper_init'] = function(block: Blockly.Block) {
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const in3 = block.getFieldValue('IN3');
  const in4 = block.getFieldValue('IN4');

  // case 19 axis 2 (Session 119 G4): stepper は singleton library 前提、二重 init で
  // 1 個目の pin 値が silent 上書きされる collision を first-wins guard で防御。
  if (!generator.definitions_['stepper_pins']) {
    generator.definitions_['stepper_pins'] = `
#define STEPPER_IN1 ${in1}
#define STEPPER_IN2 ${in2}
#define STEPPER_IN3 ${in3}
#define STEPPER_IN4 ${in4}
int stepperStep = 0;`;
  }

  if (!generator.definitions_['stepper_function']) {
    generator.definitions_['stepper_function'] = `
void stepperWrite(int a, int b, int c, int d) {
  digitalWrite(STEPPER_IN1, a);
  digitalWrite(STEPPER_IN2, b);
  digitalWrite(STEPPER_IN3, c);
  digitalWrite(STEPPER_IN4, d);
}

void stepperMove(int steps, int stepDelay) {
  int direction = (steps > 0) ? 1 : -1;
  steps = abs(steps);

  for (int i = 0; i < steps; i++) {
    switch(stepperStep) {
      case 0: stepperWrite(1, 0, 0, 0); break;
      case 1: stepperWrite(1, 1, 0, 0); break;
      case 2: stepperWrite(0, 1, 0, 0); break;
      case 3: stepperWrite(0, 1, 1, 0); break;
      case 4: stepperWrite(0, 0, 1, 0); break;
      case 5: stepperWrite(0, 0, 1, 1); break;
      case 6: stepperWrite(0, 0, 0, 1); break;
      case 7: stepperWrite(1, 0, 0, 1); break;
    }
    stepperStep += direction;
    if (stepperStep > 7) stepperStep = 0;
    if (stepperStep < 0) stepperStep = 7;
    delay(stepDelay);
  }
  stepperWrite(0, 0, 0, 0);  // Release coils
}`;
  }

  return `  pinMode(STEPPER_IN1, OUTPUT);
  pinMode(STEPPER_IN2, OUTPUT);
  pinMode(STEPPER_IN3, OUTPUT);
  pinMode(STEPPER_IN4, OUTPUT);
`;
};

pythonGenerator.forBlock['stepper_init'] = function(block: Blockly.Block) {
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const in3 = block.getFieldValue('IN3');
  const in4 = block.getFieldValue('IN4');

  pyGen.definitions_['import_stepper'] = 'from machine import Pin\nimport time';
  pyGen.definitions_['stepper_pins'] = `stepper_pins = [Pin(${in1}, Pin.OUT), Pin(${in2}, Pin.OUT), Pin(${in3}, Pin.OUT), Pin(${in4}, Pin.OUT)]
stepper_step = 0

def stepper_move(steps, step_delay):
    global stepper_step
    direction = 1 if steps > 0 else -1
    steps = abs(steps)

    sequence = [
        [1,0,0,0],
        [1,1,0,0],
        [0,1,0,0],
        [0,1,1,0],
        [0,0,1,0],
        [0,0,1,1],
        [0,0,0,1],
        [1,0,0,1]
    ]

    for _ in range(steps):
        for pin_num, pin in enumerate(stepper_pins):
            pin.value(sequence[stepper_step][pin_num])
        stepper_step += direction
        if stepper_step > 7:
            stepper_step = 0
        if stepper_step < 0:
            stepper_step = 7
        time.sleep_ms(step_delay)

    for pin in stepper_pins:
        pin.value(0)`;

  return '';
};

// ===== Stepper Move Steps =====
Blockly.Blocks['stepper_move'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_MOVE || 'Stepper Move');
    this.appendValueInput('STEPS')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_STEPS || 'Steps');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_SPEED || 'Speed')
        // Fallback strings required for headless tsx orchestrator: Blockly.Msg
        // is empty before browser init, FieldDropdown.trimOptions crashes on
        // `[undefined, value]` tuples (Round 1 cluster #3 RCA, 4 failures).
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_SLOW || 'Slow', '5'],
          [Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_NORMAL || 'Normal', '3'],
          [Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_FAST || 'Fast', '2']
        ]), 'SPEED')
        .appendField('ms');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_MOVETOOLTIP);
  }
};

javascriptGenerator.forBlock['stepper_move'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '512';
  const speed = block.getFieldValue('SPEED');
  return `  stepperMove(String(${steps}).toInt(), ${speed});\n`;
};

pythonGenerator.forBlock['stepper_move'] = function(block: Blockly.Block) {
  const steps = pyGen.valueToCode(block, 'STEPS', pyGen.ORDER_ATOMIC) || '512';
  const speed = block.getFieldValue('SPEED');
  return `stepper_move(int(${steps}), ${speed})\n`;
};

// ===== Stepper Rotate Degrees =====
Blockly.Blocks['stepper_rotate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_ROTATE || 'Stepper Rotate');
    this.appendValueInput('ANGLE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_ANGLE || 'Angle');
    this.appendDummyInput()
        .appendField('°')
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_SPEED || 'Speed')
        // Fallback strings: see stepper_move note (cluster #3 RCA).
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_SLOW || 'Slow', '5'],
          [Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_NORMAL || 'Normal', '3'],
          [Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_FAST || 'Fast', '2']
        ]), 'SPEED')
        .appendField('ms');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_ROTATETOOLTIP);
  }
};

javascriptGenerator.forBlock['stepper_rotate'] = function(block: Blockly.Block) {
  const angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';
  const speed = block.getFieldValue('SPEED');
  // Steps computation moved to runtime so dynamic angle works.
  return `  stepperMove((String(${angle}).toInt() * 512) / 360, ${speed});\n`;
};

pythonGenerator.forBlock['stepper_rotate'] = function(block: Blockly.Block) {
  const angle = pyGen.valueToCode(block, 'ANGLE', pyGen.ORDER_ATOMIC) || '90';
  const speed = block.getFieldValue('SPEED');
  return `stepper_move(int((int(${angle}) * 512) / 360), ${speed})\n`;
};

// ===== Stepper Stop =====
Blockly.Blocks['stepper_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_STOP);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACTUATOR_STEPPER_STOPTOOLTIP);
  }
};

javascriptGenerator.forBlock['stepper_stop'] = function() {
  return `  stepperWrite(0, 0, 0, 0);\n`;
};

pythonGenerator.forBlock['stepper_stop'] = function() {
  return `for pin in stepper_pins:
    pin.value(0)
`;
};

export {}; // Make this a module
