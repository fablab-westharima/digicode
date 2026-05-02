/*
 * Transform Blockly Blocks
 *
 * Blocks for controlling Transform robots (4-servo biped with Walk & Roll modes).
 * HP Robot ESP32 uses Connectors #8, #9, #10, #11.
 * Supports both Arduino C++ and MicroPython.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getTransformPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const NINJA_COLOR = '#9C27B0';  // Purple color for Ninja blocks

// ===== Init =====
Blockly.Blocks['transform_init'] = {
  init: function() {
    const pins = getTransformPins();
    this.appendDummyInput()
        .appendField('🐱 ' + (Blockly.Msg.BLOCKS_TRANSFORM_INIT_LABEL || 'Transform Init'))
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
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_INIT_TOOLTIP || 'Initialize Transform robot (pin numbers from preset)');
  }
};

javascriptGenerator.forBlock['transform_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');
  generator.definitions_['include_transform'] = '#include <DigiCodeTransform.h>';
  generator.definitions_['transform_instance'] = 'DigiCodeTransform transform;';
  return `  transform.init(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF});\n`;
};

// ===== Mode Switch (HP Robot style) =====
Blockly.Blocks['transform_mode'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + (Blockly.Msg.BLOCKS_TRANSFORM_MODE_LABEL || 'Ninja Mode'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_TRANSFORM_MODE_WALK || 'Walk', 'walk'],
          [Blockly.Msg.BLOCKS_TRANSFORM_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_MODE_TOOLTIP || 'Switch between Walk (4-leg walk) and Roll (wheel drive) mode');
  }
};

javascriptGenerator.forBlock['transform_mode'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  transform.setMode("${mode}");\n`;
};

// ===== Transform (Physical transformation with servo movement) =====
Blockly.Blocks['transform_shift'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🦾 ' + (Blockly.Msg.BLOCKS_TRANSFORM_TRANSFORM_LABEL || 'Ninja Transform'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_TRANSFORM_MODE_WALK || 'Walk', 'walk'],
          [Blockly.Msg.BLOCKS_TRANSFORM_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_TRANSFORM_TOOLTIP || 'Physically transform by moving servos (Walk↔Roll)');
  }
};

javascriptGenerator.forBlock['transform_shift'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  transform.transform("${mode}");\n`;
};

// ===== Home =====
Blockly.Blocks['transform_home'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + (Blockly.Msg.BLOCKS_TRANSFORM_HOME_LABEL || 'Ninja Home'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_HOME_TOOLTIP || 'Return to upright position');
  }
};

javascriptGenerator.forBlock['transform_home'] = function() {
  return `  transform.home();\n`;
};

// ===== Walk (HP Robot style with direction and speed) =====
Blockly.Blocks['transform_walk'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚶 ' + (Blockly.Msg.BLOCKS_TRANSFORM_WALK_LABEL || 'Ninja Walk'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_FORWARD || 'forward', 'forward'],
          [Blockly.Msg.BLOCKS_COMMON_BACKWARD || 'backward', 'backward']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_WALK_TOOLTIP || 'Walk in Walk mode');
  }
};

javascriptGenerator.forBlock['transform_walk'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  const speedMs = speed === 'fast' ? 600 : speed === 'slow' ? 1500 : 1000;
  const dir = direction === 'forward' ? 1 : -1;
  return `  transform.walk(2, ${speedMs}, ${dir});\n`;
};

// ===== Roll (HP Robot style) =====
Blockly.Blocks['transform_roll'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛞 ' + (Blockly.Msg.BLOCKS_TRANSFORM_ROLL_LABEL || 'Ninja Roll'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_FORWARD || 'forward', 'forward'],
          [Blockly.Msg.BLOCKS_COMMON_BACKWARD || 'backward', 'backward']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
          [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_ROLL_TOOLTIP || 'Drive in Roll mode');
  }
};

javascriptGenerator.forBlock['transform_roll'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  const speedVal = speed === 'fast' ? 100 : speed === 'slow' ? 30 : 50;
  const dir = direction === 'forward' ? 1 : -1;
  return `  transform.roll(${dir}, ${speedVal});\n`;
};

// ===== Roll Rotate =====
Blockly.Blocks['transform_roll_rotate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↻ ' + (Blockly.Msg.BLOCKS_TRANSFORM_ROLLROTATE_LABEL || 'Ninja Roll Rotate'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', 'left'],
          [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', 'right']
        ]), 'DIRECTION');
    this.appendValueInput('POWER');
    this.appendDummyInput()
        .appendField('%');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_ROLLROTATE_TOOLTIP || 'Rotate in Roll mode');
  }
};

javascriptGenerator.forBlock['transform_roll_rotate'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = javascriptGenerator.valueToCode(block, 'POWER', javascriptGenerator.ORDER_ATOMIC) || '50';
  const dir = direction === 'left' ? 1 : -1;
  return `  transform.rollRotate(${dir}, String(${power}).toInt());\n`;
};

// ===== Turn (Walk mode) =====
Blockly.Blocks['transform_turn'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↻ ' + (Blockly.Msg.BLOCKS_TRANSFORM_TURN_LABEL || 'Ninja Turn'))
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
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_TURN_TOOLTIP || 'Turn in Walk mode');
  }
};

javascriptGenerator.forBlock['transform_turn'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = javascriptGenerator.valueToCode(block, 'STEPS', javascriptGenerator.ORDER_ATOMIC) || '2';
  const dir = direction === 'left' ? 1 : -1;
  return `  transform.turn(String(${steps}).toInt(), 1000, ${dir});\n`;
};

// ===== Stop (HP Robot style with mode selection) =====
Blockly.Blocks['transform_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏹ ' + (Blockly.Msg.BLOCKS_TRANSFORM_STOP_LABEL || 'Ninja Stop'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_TRANSFORM_MODE_WALK || 'Walk', 'walk'],
          [Blockly.Msg.BLOCKS_TRANSFORM_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_STOP_TOOLTIP || 'Stop specified mode');
  }
};

javascriptGenerator.forBlock['transform_stop'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  transform.stop("${mode}");\n`;
};

// ===== Push-up =====
Blockly.Blocks['transform_pushup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💪 ' + (Blockly.Msg.BLOCKS_TRANSFORM_PUSHUP_LABEL || 'Ninja Push-up'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_PUSHUP_TOOLTIP || 'Do push-ups');
  }
};

javascriptGenerator.forBlock['transform_pushup'] = function() {
  return `  transform.pushUp(2, 1000);\n`;
};

// ===== Dance =====
Blockly.Blocks['transform_dance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💃 ' + (Blockly.Msg.BLOCKS_TRANSFORM_DANCE_LABEL || 'Ninja Dance'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_TRANSFORM_DANCE_TOOLTIP || 'Perform a dance');
  }
};

javascriptGenerator.forBlock['transform_dance'] = function() {
  return `  transform.dance(4, 600);\n`;
};

export {}; // Make this a module
