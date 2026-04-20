/*
 * DigiCodeOttoNinja Blockly Blocks
 *
 * Blocks for controlling OTTO Ninja robots (4-servo biped with Walk & Roll modes).
 * HP Robot ESP32 uses Connectors #8, #9, #10, #11.
 * Supports both Arduino C++ and MicroPython.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getOttoNinjaPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const NINJA_COLOR = '#9C27B0';  // Purple color for Ninja blocks

// ===== Init =====
Blockly.Blocks['transform_init'] = {
  init: function() {
    const pins = getOttoNinjaPins();
    this.appendDummyInput()
        .appendField('🐱 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_INIT_LABEL || 'OTTO Ninja Init'))
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_LEFTLEG || 'left leg pin')
        .appendField(new Blockly.FieldNumber(pins.leftLeg, 0, 39), 'PIN_LL')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_RIGHTLEG || 'right leg pin')
        .appendField(new Blockly.FieldNumber(pins.rightLeg, 0, 39), 'PIN_RL')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_LEFTANKLE || 'left ankle pin')
        .appendField(new Blockly.FieldNumber(pins.leftFoot, 0, 39), 'PIN_LF')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_RIGHTANKLE || 'right ankle pin')
        .appendField(new Blockly.FieldNumber(pins.rightFoot, 0, 39), 'PIN_RF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_INIT_TOOLTIP || 'Initialize OTTO Ninja (pin numbers from preset)');
  }
};

javascriptGenerator.forBlock['transform_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');
  generator.definitions_['include_otto_ninja'] = '#include <DigiCodeOttoNinja.h>';
  generator.definitions_['transform_instance'] = 'DigiCodeOttoNinja ottoNinja;';
  return `  ottoNinja.init(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF});\n`;
};

pythonGenerator.forBlock['transform_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');
  // Note: MicroPython support for OTTO Ninja requires ottowalkroll library
  // which may not be available. Arduino (DigiCodeOttoNinja) is the primary target.
  pyGen.definitions_['import_otto_ninja'] = '# OTTO Ninja - MicroPython support is experimental\nfrom ottowalkroll import Ninja';
  pyGen.definitions_['transform_instance'] = `ninja = Ninja(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF})`;
  return '# Ninja initialized via constructor above\n';
};

// ===== Mode Switch (HP Robot style) =====
Blockly.Blocks['transform_mode'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_LABEL || 'Ninja Mode'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_WALK || 'Walk', 'walk'],
          [(Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_TOOLTIP || 'Switch between Walk (4-leg walk) and Roll (wheel drive) mode');
  }
};

javascriptGenerator.forBlock['transform_mode'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  ottoNinja.setMode("${mode}");\n`;
};

pythonGenerator.forBlock['transform_mode'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  if (mode === 'walk') {
    return `ninja.walk_mode()\n`;
  } else {
    return `ninja.roll_mode()\n`;
  }
};

// ===== Transform (Physical transformation with servo movement) =====
Blockly.Blocks['transform_shift'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🦾 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_TRANSFORM_LABEL || 'Ninja Transform'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_WALK || 'Walk', 'walk'],
          [(Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_TRANSFORM_TOOLTIP || 'Physically transform by moving servos (Walk↔Roll)');
  }
};

javascriptGenerator.forBlock['transform_shift'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  ottoNinja.transform("${mode}");\n`;
};

pythonGenerator.forBlock['transform_shift'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `ninja.transform("${mode}")\n`;
};

// ===== Align Angle =====
Blockly.Blocks['transform_align'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⊕ ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_ALIGN_LABEL || 'Ninja Align'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_ALIGN_TOOLTIP || 'Adjust servo angles');
  }
};

javascriptGenerator.forBlock['transform_align'] = function() {
  return `  ottoNinja.alignAngle();\n`;
};

pythonGenerator.forBlock['transform_align'] = function() {
  return `ninja.align_angle()\n`;
};

// ===== Calibrate =====
Blockly.Blocks['transform_calibrate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_CALIBRATE_LABEL || 'Ninja Calibration'))
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left')
        .appendField(new Blockly.FieldNumber(0, -90, 90), 'LEFT')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right')
        .appendField(new Blockly.FieldNumber(0, -90, 90), 'RIGHT');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_CALIBRATE_TOOLTIP || 'Adjust left/right offset');
  }
};

javascriptGenerator.forBlock['transform_calibrate'] = function(block: Blockly.Block) {
  const left = block.getFieldValue('LEFT');
  const right = block.getFieldValue('RIGHT');
  return `  ottoNinja.calibrate(${left}, ${right});\n`;
};

pythonGenerator.forBlock['transform_calibrate'] = function(block: Blockly.Block) {
  const left = block.getFieldValue('LEFT');
  const right = block.getFieldValue('RIGHT');
  return `ninja.calibrate(${left}, ${right})\n`;
};

// ===== Home =====
Blockly.Blocks['transform_home'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_HOME_LABEL || 'Ninja Home'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_HOME_TOOLTIP || 'Return to upright position');
  }
};

javascriptGenerator.forBlock['transform_home'] = function() {
  return `  ottoNinja.home();\n`;
};

pythonGenerator.forBlock['transform_home'] = function() {
  return `ninja.home()\n`;
};

// ===== Walk (HP Robot style with direction and speed) =====
Blockly.Blocks['transform_walk'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚶 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_WALK_LABEL || 'Ninja Walk'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_FORWARD || 'forward', 'forward'],
          [(Blockly.Msg as any).BLOCKS_COMMON_BACKWARD || 'backward', 'backward']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_WALK_TOOLTIP || 'Walk in Walk mode');
  }
};

javascriptGenerator.forBlock['transform_walk'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  const speedMs = speed === 'fast' ? 600 : speed === 'slow' ? 1500 : 1000;
  const dir = direction === 'forward' ? 1 : -1;
  return `  ottoNinja.walk(2, ${speedMs}, ${dir});\n`;
};

pythonGenerator.forBlock['transform_walk'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  const steps = speed === 'fast' ? 3 : speed === 'slow' ? 1 : 2;
  const dir = direction === 'forward' ? 1 : -1;
  return `ninja.walk(${steps}, ${dir})\n`;
};

// ===== Walk with Power % =====
Blockly.Blocks['transform_walk_power'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚶 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_WALKPOWER_LABEL || 'Ninja Walk'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_FORWARD || 'forward', 'forward'],
          [(Blockly.Msg as any).BLOCKS_COMMON_BACKWARD || 'backward', 'backward']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldNumber(50, 0, 100), 'POWER')
        .appendField('%');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_WALKPOWER_TOOLTIP || 'Walk in Walk mode (with power setting)');
  }
};

javascriptGenerator.forBlock['transform_walk_power'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = block.getFieldValue('POWER');
  const dir = direction === 'forward' ? 1 : -1;
  return `  ottoNinja.walkPower(${dir}, ${power});\n`;
};

pythonGenerator.forBlock['transform_walk_power'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = block.getFieldValue('POWER');
  const dir = direction === 'forward' ? 1 : -1;
  return `ninja.walk_power(${dir}, ${power})\n`;
};

// ===== Roll (HP Robot style) =====
Blockly.Blocks['transform_roll'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛞 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_ROLL_LABEL || 'Ninja Roll'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_FORWARD || 'forward', 'forward'],
          [(Blockly.Msg as any).BLOCKS_COMMON_BACKWARD || 'backward', 'backward']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_ROLL_TOOLTIP || 'Drive in Roll mode');
  }
};

javascriptGenerator.forBlock['transform_roll'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  const speedVal = speed === 'fast' ? 100 : speed === 'slow' ? 30 : 50;
  const dir = direction === 'forward' ? 1 : -1;
  return `  ottoNinja.roll(${dir}, ${speedVal});\n`;
};

pythonGenerator.forBlock['transform_roll'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  const speedVal = speed === 'fast' ? 100 : speed === 'slow' ? 30 : 50;
  const dir = direction === 'forward' ? 1 : -1;
  return `ninja.roll(${dir}, ${speedVal})\n`;
};

// ===== Roll with Power % =====
Blockly.Blocks['transform_roll_power'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛞 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_ROLLPOWER_LABEL || 'Ninja Roll'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_FORWARD || 'forward', 'forward'],
          [(Blockly.Msg as any).BLOCKS_COMMON_BACKWARD || 'backward', 'backward']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldNumber(100, 0, 100), 'POWER')
        .appendField('%');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_ROLLPOWER_TOOLTIP || 'Drive in Roll mode (with power setting)');
  }
};

javascriptGenerator.forBlock['transform_roll_power'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = block.getFieldValue('POWER');
  const dir = direction === 'forward' ? 1 : -1;
  return `  ottoNinja.rollPower(${dir}, ${power});\n`;
};

pythonGenerator.forBlock['transform_roll_power'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = block.getFieldValue('POWER');
  const dir = direction === 'forward' ? 1 : -1;
  return `ninja.roll_power(${dir}, ${power})\n`;
};

// ===== Roll Rotate =====
Blockly.Blocks['transform_roll_rotate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↻ ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_ROLLROTATE_LABEL || 'Ninja Roll Rotate'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', 'left'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', 'right']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldNumber(50, 0, 100), 'POWER')
        .appendField('%');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_ROLLROTATE_TOOLTIP || 'Rotate in Roll mode');
  }
};

javascriptGenerator.forBlock['transform_roll_rotate'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = block.getFieldValue('POWER');
  const dir = direction === 'left' ? 1 : -1;
  return `  ottoNinja.rollRotate(${dir}, ${power});\n`;
};

pythonGenerator.forBlock['transform_roll_rotate'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = block.getFieldValue('POWER');
  const dir = direction === 'left' ? 1 : -1;
  return `ninja.roll_rotate(${dir}, ${power})\n`;
};

// ===== Turn (Walk mode) =====
Blockly.Blocks['transform_turn'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↻ ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_TURN_LABEL || 'Ninja Turn'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', 'left'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', 'right']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_TURN_TOOLTIP || 'Turn in Walk mode');
  }
};

javascriptGenerator.forBlock['transform_turn'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = block.getFieldValue('STEPS');
  const dir = direction === 'left' ? 1 : -1;
  return `  ottoNinja.turn(${steps}, 1000, ${dir});\n`;
};

pythonGenerator.forBlock['transform_turn'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = block.getFieldValue('STEPS');
  const dir = direction === 'left' ? 1 : -1;
  return `ninja.turn(${steps}, ${dir})\n`;
};

// ===== Stop (HP Robot style with mode selection) =====
Blockly.Blocks['transform_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏹ ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_STOP_LABEL || 'Ninja Stop'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_WALK || 'Walk', 'walk'],
          [(Blockly.Msg as any).BLOCKS_OTTONINJA_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_STOP_TOOLTIP || 'Stop specified mode');
  }
};

javascriptGenerator.forBlock['transform_stop'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  ottoNinja.stop("${mode}");\n`;
};

pythonGenerator.forBlock['transform_stop'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  if (mode === 'walk') {
    return `ninja.walk_stop()\n`;
  } else {
    return `ninja.roll_stop()\n`;
  }
};

// ===== Trot (Fast walk) =====
Blockly.Blocks['transform_trot'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏃 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_TROT_LABEL || 'Ninja Trot'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_TROT_TOOLTIP || 'Walk quickly');
  }
};

javascriptGenerator.forBlock['transform_trot'] = function() {
  return `  ottoNinja.trot(2, 600);\n`;
};

pythonGenerator.forBlock['transform_trot'] = function() {
  return `ninja.trot(2)\n`;
};

// ===== Push-up =====
Blockly.Blocks['transform_pushup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💪 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_PUSHUP_LABEL || 'Ninja Push-up'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_PUSHUP_TOOLTIP || 'Do push-ups');
  }
};

javascriptGenerator.forBlock['transform_pushup'] = function() {
  return `  ottoNinja.pushUp(2, 1000);\n`;
};

pythonGenerator.forBlock['transform_pushup'] = function() {
  return `ninja.push_up(2)\n`;
};

// ===== Lateral =====
Blockly.Blocks['transform_lateral'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↔️ ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_LATERAL_LABEL || 'Ninja Lateral'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', 'left'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', 'right']
        ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_LATERAL_TOOLTIP || 'Move sideways');
  }
};

javascriptGenerator.forBlock['transform_lateral'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const dir = direction === 'left' ? 1 : -1;
  return `  ottoNinja.lateral(2, 1000, ${dir});\n`;
};

pythonGenerator.forBlock['transform_lateral'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const dir = direction === 'left' ? 1 : -1;
  return `ninja.lateral(2, ${dir})\n`;
};

// ===== Dance =====
Blockly.Blocks['transform_dance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💃 ' + ((Blockly.Msg as any).BLOCKS_OTTONINJA_DANCE_LABEL || 'Ninja Dance'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_OTTONINJA_DANCE_TOOLTIP || 'Perform a dance');
  }
};

javascriptGenerator.forBlock['transform_dance'] = function() {
  return `  ottoNinja.dance(4, 600);\n`;
};

pythonGenerator.forBlock['transform_dance'] = function() {
  return `ninja.dance(4)\n`;
};

export {}; // Make this a module
