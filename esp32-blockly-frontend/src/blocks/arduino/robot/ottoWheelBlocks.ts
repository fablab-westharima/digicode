/**
 * DigiCodeOttoWheel Blockly Blocks
 *
 * Blocks for controlling OTTO Wheel wheeled robots.
 * Supports both Arduino C++ and MicroPython.
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getOttoWheelPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const WHEEL_COLOR = '#4CAF50';  // Green color for Wheel blocks

// ===== Init =====
Blockly.Blocks['otto_wheel_init'] = {
  init: function() {
    const pins = getOttoWheelPins();
    this.appendDummyInput()
        .appendField('🚗 ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_INIT || 'OTTO Wheel Init'))
        .appendField((Blockly.Msg as any).BLOCKS_OTTOWHEEL_LEFTWHEELPIN || 'Left Wheel Pin')
        .appendField(new Blockly.FieldNumber(pins.left, 0, 39), 'PIN_L')
        .appendField((Blockly.Msg as any).BLOCKS_OTTOWHEEL_RIGHTWHEELPIN || 'Right Wheel Pin')
        .appendField(new Blockly.FieldNumber(pins.right, 0, 39), 'PIN_R');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_INITTOOLTIP || 'Initialize OTTO Wheel');
  }
};

javascriptGenerator.forBlock['otto_wheel_init'] = function(block: Blockly.Block) {
  const pinL = block.getFieldValue('PIN_L');
  const pinR = block.getFieldValue('PIN_R');
  generator.definitions_['include_otto_wheel'] = '#include <DigiCodeOttoWheel.h>';
  generator.definitions_['otto_wheel_instance'] = 'DigiCodeOttoWheel ottoWheel;';
  return `  ottoWheel.init(${pinL}, ${pinR});\n`;
};

pythonGenerator.forBlock['otto_wheel_init'] = function(block: Blockly.Block) {
  const pinL = block.getFieldValue('PIN_L');
  const pinR = block.getFieldValue('PIN_R');
  pyGen.definitions_['import_otto_wheel'] = 'from digicode_otto_wheel import DigiCodeOttoWheel';
  pyGen.definitions_['otto_wheel_instance'] = 'otto_wheel = DigiCodeOttoWheel()';
  return `otto_wheel.init(${pinL}, ${pinR})\n`;
};

// ===== Forward =====
Blockly.Blocks['otto_wheel_forward'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬆️ ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_FORWARD || 'OTTO Wheel Forward'))
        .appendField((Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEED || 'Speed')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEEDFAST || 'Fast', '100'],
          [(Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEEDNORMAL || 'Normal', '50'],
          [(Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEEDSLOW || 'Slow', '30']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_FORWARDTOOLTIP || 'Move forward');
  }
};

javascriptGenerator.forBlock['otto_wheel_forward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `  ottoWheel.forward(${speed});\n`;
};

pythonGenerator.forBlock['otto_wheel_forward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `otto_wheel.forward(${speed})\n`;
};

// ===== Backward =====
Blockly.Blocks['otto_wheel_backward'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬇️ ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_BACKWARD || 'OTTO Wheel Backward'))
        .appendField((Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEED || 'Speed')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEEDFAST || 'Fast', '100'],
          [(Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEEDNORMAL || 'Normal', '50'],
          [(Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPEEDSLOW || 'Slow', '30']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_BACKWARDTOOLTIP || 'Move backward');
  }
};

javascriptGenerator.forBlock['otto_wheel_backward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `  ottoWheel.backward(${speed});\n`;
};

pythonGenerator.forBlock['otto_wheel_backward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `otto_wheel.backward(${speed})\n`;
};

// ===== Turn Left =====
Blockly.Blocks['otto_wheel_turn_left'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↰ ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_TURNLEFT || 'OTTO Wheel Turn Left'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_TURNLEFTTOOLTIP || 'Turn left');
  }
};

javascriptGenerator.forBlock['otto_wheel_turn_left'] = function() {
  return `  ottoWheel.turnLeft(50);\n`;
};

pythonGenerator.forBlock['otto_wheel_turn_left'] = function() {
  return `otto_wheel.turn_left(50)\n`;
};

// ===== Turn Right =====
Blockly.Blocks['otto_wheel_turn_right'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↱ ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_TURNRIGHT || 'OTTO Wheel Turn Right'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_TURNRIGHTTOOLTIP || 'Turn right');
  }
};

javascriptGenerator.forBlock['otto_wheel_turn_right'] = function() {
  return `  ottoWheel.turnRight(50);\n`;
};

pythonGenerator.forBlock['otto_wheel_turn_right'] = function() {
  return `otto_wheel.turn_right(50)\n`;
};

// ===== Spin Left =====
Blockly.Blocks['otto_wheel_spin_left'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↶ ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPINLEFT || 'OTTO Wheel Spin Left'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPINLEFTTOOLTIP || 'Spin left in place');
  }
};

javascriptGenerator.forBlock['otto_wheel_spin_left'] = function() {
  return `  ottoWheel.spinLeft(50);\n`;
};

pythonGenerator.forBlock['otto_wheel_spin_left'] = function() {
  return `otto_wheel.spin_left(50)\n`;
};

// ===== Spin Right =====
Blockly.Blocks['otto_wheel_spin_right'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↷ ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPINRIGHT || 'OTTO Wheel Spin Right'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_SPINRIGHTTOOLTIP || 'Spin right in place');
  }
};

javascriptGenerator.forBlock['otto_wheel_spin_right'] = function() {
  return `  ottoWheel.spinRight(50);\n`;
};

pythonGenerator.forBlock['otto_wheel_spin_right'] = function() {
  return `otto_wheel.spin_right(50)\n`;
};

// ===== Stop =====
Blockly.Blocks['otto_wheel_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏹ ' + ((Blockly.Msg as any).BLOCKS_OTTOWHEEL_STOP || 'OTTO Wheel Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTOWHEEL_STOPTOOLTIP || 'Stop');
  }
};

javascriptGenerator.forBlock['otto_wheel_stop'] = function() {
  return `  ottoWheel.stop();\n`;
};

pythonGenerator.forBlock['otto_wheel_stop'] = function() {
  return `otto_wheel.stop()\n`;
};

export {}; // Make this a module
