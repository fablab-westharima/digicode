/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * Humanoid Robot Blockly Blocks
 *
 * Blocks for controlling Humanoid robots.
 * Supports both Arduino C++ and MicroPython.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getHumanoidPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const HUMANOID_COLOR = '#FF6B35';  // Orange color for Humanoid blocks

// ===== Humanoid Initialization =====

Blockly.Blocks['humanoid_init'] = {
  init: function() {
    const pins = getHumanoidPins();
    this.appendDummyInput()
        .appendField('🤖 ' + (Blockly.Msg.BLOCKS_HUMANOID_INIT_LABEL || 'Humanoid Init'))
        .appendField(Blockly.Msg.BLOCKS_COMMON_LEFTLEG || 'left leg pin')
        .appendField(new Blockly.FieldNumber(pins.leftLeg, 0, 39), 'PIN_LL')
        .appendField(Blockly.Msg.BLOCKS_COMMON_RIGHTLEG || 'right leg pin')
        .appendField(new Blockly.FieldNumber(pins.rightLeg, 0, 39), 'PIN_RL')
        .appendField(Blockly.Msg.BLOCKS_COMMON_LEFTANKLE || 'left ankle pin')
        .appendField(new Blockly.FieldNumber(pins.leftFoot, 0, 39), 'PIN_LF')
        .appendField(Blockly.Msg.BLOCKS_COMMON_RIGHTANKLE || 'right ankle pin')
        .appendField(new Blockly.FieldNumber(pins.rightFoot, 0, 39), 'PIN_RF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_INIT_TOOLTIP || 'Initialize Humanoid robot (pin numbers from preset)');
  }
};

javascriptGenerator.forBlock['humanoid_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');

  generator.definitions_['include_humanoid'] = '#include <DigiCodeHumanoid.h>';
  generator.definitions_['humanoid_instance'] = 'DigiCodeHumanoid humanoid;';

  return `  humanoid.init(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF});\n`;
};

// ===== Humanoid Home Position =====

Blockly.Blocks['humanoid_home'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + (Blockly.Msg.BLOCKS_HUMANOID_HOME_LABEL || 'Humanoid Home'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_HOME_TOOLTIP || 'Set Humanoid to upright position');
  }
};

javascriptGenerator.forBlock['humanoid_home'] = function() {
  return `  humanoid.home();\n`;
};

// ===== Humanoid Walk =====

Blockly.Blocks['humanoid_walk'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚶 ' + (Blockly.Msg.BLOCKS_HUMANOID_WALK_LABEL || 'Humanoid Walk'));
    this.appendValueInput('STEPS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_COMMON_STEPS || 'steps')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_FORWARD || 'forward', '1'],
          [Blockly.Msg.BLOCKS_COMMON_BACKWARD || 'backward', '-1']
        ]), 'DIRECTION')
        .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', '1000'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', '600'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', '1500']
        ]), 'SPEED');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_WALK_TOOLTIP || 'Make Humanoid walk');
  }
};

javascriptGenerator.forBlock['humanoid_walk'] = function(block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');

  return `  humanoid.walk(String(${steps}).toInt(), ${speed}, ${direction});\n`;
};

// ===== Humanoid Turn =====

Blockly.Blocks['humanoid_turn'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↻ ' + (Blockly.Msg.BLOCKS_HUMANOID_TURN_LABEL || 'Humanoid Turn'));
    this.appendValueInput('STEPS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', '1'],
          [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', '-1']
        ]), 'DIRECTION')
        .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', '1000'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', '600'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', '1500']
        ]), 'SPEED');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_TURN_TOOLTIP || 'Make Humanoid turn');
  }
};

javascriptGenerator.forBlock['humanoid_turn'] = function(block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');

  return `  humanoid.turn(String(${steps}).toInt(), ${speed}, ${direction});\n`;
};

// ===== Humanoid Jump =====

Blockly.Blocks['humanoid_jump'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬆️ ' + (Blockly.Msg.BLOCKS_HUMANOID_JUMP_LABEL || 'Humanoid Jump'));
    this.appendValueInput('STEPS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_JUMP_TOOLTIP || 'Make Humanoid jump');
  }
};

javascriptGenerator.forBlock['humanoid_jump'] = function(block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '1';
  return `  humanoid.jump(String(${steps}).toInt(), 500);\n`;
};

// ===== Humanoid Dance =====

Blockly.Blocks['humanoid_dance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💃 ' + (Blockly.Msg.BLOCKS_HUMANOID_DANCE_LABEL || 'Humanoid Dance'));
    this.appendValueInput('STEPS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_DANCE_TOOLTIP || 'Make Humanoid dance');
  }
};

javascriptGenerator.forBlock['humanoid_dance'] = function(block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '4';
  return `  humanoid.dance(String(${steps}).toInt(), 600);\n`;
};

// ===== Humanoid Swing =====

Blockly.Blocks['humanoid_swing'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('〜 ' + (Blockly.Msg.BLOCKS_HUMANOID_SWING_LABEL || 'Humanoid Swing'));
    this.appendValueInput('STEPS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_SWING_TOOLTIP || 'Swing Humanoid side to side');
  }
};

javascriptGenerator.forBlock['humanoid_swing'] = function(block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '2';
  return `  humanoid.swing(String(${steps}).toInt(), 1000);\n`;
};

// ===== Humanoid Bend =====

Blockly.Blocks['humanoid_bend'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↔️ ' + (Blockly.Msg.BLOCKS_HUMANOID_BEND_LABEL || 'Humanoid Bend'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', 'left'],
          [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', 'right']
        ]), 'DIRECTION');
    this.appendValueInput('STEPS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_BEND_TOOLTIP || 'Bend Humanoid left or right');
  }
};

javascriptGenerator.forBlock['humanoid_bend'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '1';

  if (direction === 'left') {
    return `  humanoid.bendLeft(String(${steps}).toInt(), 1000);\n`;
  } else {
    return `  humanoid.bendRight(String(${steps}).toInt(), 1000);\n`;
  }
};

// ===== Humanoid Moonwalk =====

Blockly.Blocks['humanoid_moonwalk'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🕺 ' + (Blockly.Msg.BLOCKS_HUMANOID_MOONWALK_LABEL || 'Humanoid Moonwalk'));
    this.appendValueInput('STEPS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_COMMON_STEPS || 'steps')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', '1'],
          [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', '-1']
        ]), 'DIRECTION');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_MOONWALK_TOOLTIP || 'Make Humanoid moonwalk');
  }
};

javascriptGenerator.forBlock['humanoid_moonwalk'] = function(block: Blockly.Block) {
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');

  return `  humanoid.moonwalk(String(${steps}).toInt(), 1000, ${direction});\n`;
};

// ===== Humanoid Gesture (感情表現) =====

Blockly.Blocks['humanoid_gesture'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('😊 ' + (Blockly.Msg.BLOCKS_HUMANOID_GESTURE_LABEL || 'Humanoid Gesture'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_HAPPY || 'Happy', 'Happy'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_SUPERHAPPY || 'Super Happy', 'SuperHappy'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_SAD || 'Sad', 'Sad'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_VICTORY || 'Victory', 'Victory'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_ANGRY || 'Angry', 'Angry'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_SLEEPING || 'Sleeping', 'Sleeping'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_FRETFUL || 'Fretful', 'Fretful'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_LOVE || 'Love', 'Love'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_CONFUSED || 'Confused', 'Confused'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_FART || 'Fart', 'Fart'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_WAVE || 'Wave', 'Wave'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_MAGIC || 'Magic', 'Magic'],
          [Blockly.Msg.BLOCKS_HUMANOID_GESTURE_FAIL || 'Fail', 'Fail']
        ]), 'GESTURE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_GESTURE_TOOLTIP || 'Humanoid expresses emotions with movement and sound');
  }
};

javascriptGenerator.forBlock['humanoid_gesture'] = function(block: Blockly.Block) {
  const gesture = block.getFieldValue('GESTURE');
  return `  humanoid.playGesture(${gesture});\n`;
};

// ===== Humanoid Sound (音声) =====

Blockly.Blocks['humanoid_sound'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_HUMANOID_SOUND_LABEL || 'Humanoid Sound'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_CONNECTION || 'Connection', 'S_connection'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_DISCONNECTION || 'Disconnection', 'S_disconnection'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_BUTTONPUSHED || 'Button Pushed', 'S_buttonPushed'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_MODE1 || 'Mode 1', 'S_mode1'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_MODE2 || 'Mode 2', 'S_mode2'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_MODE3 || 'Mode 3', 'S_mode3'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_SURPRISE || 'Surprise', 'S_surprise'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_OHOOH || 'Oh Ooh', 'S_OhOoh'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_OHOOH2 || 'Oh Ooh 2', 'S_OhOoh2'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_CUDDLY || 'Cuddly', 'S_cuddly'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_SLEEPING || 'Sleeping', 'S_sleeping'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_HAPPY || 'Happy', 'S_happy'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_SUPERHAPPY || 'Super Happy', 'S_superHappy'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_HAPPYSHORT || 'Happy Short', 'S_happy_short'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_SAD || 'Sad', 'S_sad'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_CONFUSED || 'Confused', 'S_confused'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_FART1 || 'Fart 1', 'S_fart1'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_FART2 || 'Fart 2', 'S_fart2'],
          [Blockly.Msg.BLOCKS_HUMANOID_SOUND_FART3 || 'Fart 3', 'S_fart3']
        ]), 'SOUND');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HUMANOID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_HUMANOID_SOUND_TOOLTIP || 'Humanoid plays a sound');
  }
};

javascriptGenerator.forBlock['humanoid_sound'] = function(block: Blockly.Block) {
  const sound = block.getFieldValue('SOUND');
  return `  humanoid.sing(${sound});\n`;
};

export {}; // Make this a module
