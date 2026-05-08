/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * Wheel Robot Blockly Blocks
 *
 * Blocks for controlling Wheel wheeled robots.
 * Supports both Arduino C++ and MicroPython.
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getWheelPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const WHEEL_COLOR = '#4CAF50';  // Green color for Wheel blocks

// ===== Init =====
Blockly.Blocks['wheel_init'] = {
  init: function() {
    const pins = getWheelPins();
    this.appendDummyInput()
        .appendField('🚗 ' + (Blockly.Msg.BLOCKS_WHEEL_INIT || 'Wheel Init'))
        .appendField(Blockly.Msg.BLOCKS_WHEEL_LEFTWHEELPIN || 'Left Wheel Pin')
        .appendField(new Blockly.FieldNumber(pins.left, 0, 39), 'PIN_L')
        .appendField(Blockly.Msg.BLOCKS_WHEEL_RIGHTWHEELPIN || 'Right Wheel Pin')
        .appendField(new Blockly.FieldNumber(pins.right, 0, 39), 'PIN_R');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_INITTOOLTIP || 'Initialize Wheel');
  }
};

javascriptGenerator.forBlock['wheel_init'] = function(block: Blockly.Block) {
  const pinL = block.getFieldValue('PIN_L');
  const pinR = block.getFieldValue('PIN_R');
  generator.definitions_['include_wheel'] = '#include <DigiCodeWheel.h>';
  generator.definitions_['wheel_instance'] = 'DigiCodeWheel wheel;';
  return `  wheel.init(${pinL}, ${pinR});\n`;
};

// ===== Forward =====
Blockly.Blocks['wheel_forward'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬆️ ' + (Blockly.Msg.BLOCKS_WHEEL_FORWARD || 'Wheel Forward'))
        .appendField(Blockly.Msg.BLOCKS_WHEEL_SPEED || 'Speed')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_WHEEL_SPEEDFAST || 'Fast', '100'],
          [Blockly.Msg.BLOCKS_WHEEL_SPEEDNORMAL || 'Normal', '50'],
          [Blockly.Msg.BLOCKS_WHEEL_SPEEDSLOW || 'Slow', '30']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_FORWARDTOOLTIP || 'Move forward');
  }
};

javascriptGenerator.forBlock['wheel_forward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `  wheel.forward(${speed});\n`;
};

// ===== Backward =====
Blockly.Blocks['wheel_backward'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬇️ ' + (Blockly.Msg.BLOCKS_WHEEL_BACKWARD || 'Wheel Backward'))
        .appendField(Blockly.Msg.BLOCKS_WHEEL_SPEED || 'Speed')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_WHEEL_SPEEDFAST || 'Fast', '100'],
          [Blockly.Msg.BLOCKS_WHEEL_SPEEDNORMAL || 'Normal', '50'],
          [Blockly.Msg.BLOCKS_WHEEL_SPEEDSLOW || 'Slow', '30']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_BACKWARDTOOLTIP || 'Move backward');
  }
};

javascriptGenerator.forBlock['wheel_backward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `  wheel.backward(${speed});\n`;
};

// ===== Turn Left =====
Blockly.Blocks['wheel_turn_left'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↰ ' + (Blockly.Msg.BLOCKS_WHEEL_TURNLEFT || 'Wheel Turn Left'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_TURNLEFTTOOLTIP || 'Turn left');
  }
};

javascriptGenerator.forBlock['wheel_turn_left'] = function() {
  return `  wheel.turnLeft(50);\n`;
};

// ===== Turn Right =====
Blockly.Blocks['wheel_turn_right'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↱ ' + (Blockly.Msg.BLOCKS_WHEEL_TURNRIGHT || 'Wheel Turn Right'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_TURNRIGHTTOOLTIP || 'Turn right');
  }
};

javascriptGenerator.forBlock['wheel_turn_right'] = function() {
  return `  wheel.turnRight(50);\n`;
};

// ===== Spin Left =====
Blockly.Blocks['wheel_spin_left'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↶ ' + (Blockly.Msg.BLOCKS_WHEEL_SPINLEFT || 'Wheel Spin Left'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_SPINLEFTTOOLTIP || 'Spin left in place');
  }
};

javascriptGenerator.forBlock['wheel_spin_left'] = function() {
  return `  wheel.spinLeft(50);\n`;
};

// ===== Spin Right =====
Blockly.Blocks['wheel_spin_right'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↷ ' + (Blockly.Msg.BLOCKS_WHEEL_SPINRIGHT || 'Wheel Spin Right'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_SPINRIGHTTOOLTIP || 'Spin right in place');
  }
};

javascriptGenerator.forBlock['wheel_spin_right'] = function() {
  return `  wheel.spinRight(50);\n`;
};

// ===== Stop =====
Blockly.Blocks['wheel_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏹ ' + (Blockly.Msg.BLOCKS_WHEEL_STOP || 'Wheel Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_WHEEL_STOPTOOLTIP || 'Stop');
  }
};

javascriptGenerator.forBlock['wheel_stop'] = function() {
  return `  wheel.stop();\n`;
};

export {}; // Make this a module
