/*
 * Humanoid Robot Blockly Blocks
 *
 * Blocks for controlling Humanoid robots.
 * Supports both Arduino C++ and MicroPython.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getOttoPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const OTTO_COLOR = '#FF6B35';  // Orange color for Humanoid blocks

// ===== Humanoid Initialization =====

Blockly.Blocks['humanoid_init'] = {
  init: function() {
    const pins = getOttoPins();
    this.appendDummyInput()
        .appendField('🤖 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_INIT_LABEL || 'Humanoid Init'))
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
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_INIT_TOOLTIP || 'Initialize Humanoid robot (pin numbers from preset)');
  }
};

javascriptGenerator.forBlock['humanoid_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');

  generator.definitions_['include_otto'] = '#include <DigiCodeOtto.h>';
  generator.definitions_['otto_instance'] = 'DigiCodeOtto otto;';

  return `  otto.init(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF});\n`;
};

pythonGenerator.forBlock['humanoid_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');

  pyGen.definitions_['import_otto'] = 'from digicode_otto import DigiCodeOtto';
  pyGen.definitions_['otto_instance'] = 'otto = DigiCodeOtto()';

  return `otto.init(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF})\n`;
};

// ===== OTTO Home Position =====

Blockly.Blocks['humanoid_home'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_HOME_LABEL || 'Humanoid Home'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_HOME_TOOLTIP || 'Set Humanoid to upright position');
  }
};

javascriptGenerator.forBlock['humanoid_home'] = function() {
  return `  otto.home();\n`;
};

pythonGenerator.forBlock['humanoid_home'] = function() {
  return `otto.home()\n`;
};

// ===== OTTO Walk =====

Blockly.Blocks['humanoid_walk'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚶 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_WALK_LABEL || 'Humanoid Walk'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_STEPS || 'steps')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_FORWARD || 'forward', '1'],
          [(Blockly.Msg as any).BLOCKS_COMMON_BACKWARD || 'backward', '-1']
        ]), 'DIRECTION')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_SPEED || 'speed')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDNORMAL || 'normal', '1000'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDFAST || 'fast', '600'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDSLOW || 'slow', '1500']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_WALK_TOOLTIP || 'Make Humanoid walk');
  }
};

javascriptGenerator.forBlock['humanoid_walk'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');

  return `  otto.walk(${steps}, ${speed}, ${direction});\n`;
};

pythonGenerator.forBlock['humanoid_walk'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');

  return `otto.walk(${steps}, ${speed}, ${direction})\n`;
};

// ===== OTTO Turn =====

Blockly.Blocks['humanoid_turn'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↻ ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_TURN_LABEL || 'Humanoid Turn'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', '1'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', '-1']
        ]), 'DIRECTION')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_SPEED || 'speed')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDNORMAL || 'normal', '1000'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDFAST || 'fast', '600'],
          [(Blockly.Msg as any).BLOCKS_COMMON_SPEEDSLOW || 'slow', '1500']
        ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_TURN_TOOLTIP || 'Make Humanoid turn');
  }
};

javascriptGenerator.forBlock['humanoid_turn'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');

  return `  otto.turn(${steps}, ${speed}, ${direction});\n`;
};

pythonGenerator.forBlock['humanoid_turn'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');

  return `otto.turn(${steps}, ${speed}, ${direction})\n`;
};

// ===== OTTO Jump =====

Blockly.Blocks['humanoid_jump'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬆️ ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_JUMP_LABEL || 'Humanoid Jump'))
        .appendField(new Blockly.FieldNumber(1, 1, 5), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_JUMP_TOOLTIP || 'Make Humanoid jump');
  }
};

javascriptGenerator.forBlock['humanoid_jump'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `  otto.jump(${steps}, 500);\n`;
};

pythonGenerator.forBlock['humanoid_jump'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.jump(${steps}, 500)\n`;
};

// ===== OTTO Dance =====

Blockly.Blocks['humanoid_dance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💃 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_DANCE_LABEL || 'Humanoid Dance'))
        .appendField(new Blockly.FieldNumber(4, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_DANCE_TOOLTIP || 'Make Humanoid dance');
  }
};

javascriptGenerator.forBlock['humanoid_dance'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `  otto.dance(${steps}, 600);\n`;
};

pythonGenerator.forBlock['humanoid_dance'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.dance(${steps}, 600)\n`;
};

// ===== OTTO Swing =====

Blockly.Blocks['humanoid_swing'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('〜 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_SWING_LABEL || 'Humanoid Swing'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_SWING_TOOLTIP || 'Swing Humanoid side to side');
  }
};

javascriptGenerator.forBlock['humanoid_swing'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `  otto.swing(${steps}, 1000);\n`;
};

pythonGenerator.forBlock['humanoid_swing'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.swing(${steps}, 1000)\n`;
};

// ===== OTTO Bend =====

Blockly.Blocks['humanoid_bend'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('↔️ ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_BEND_LABEL || 'Humanoid Bend'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', 'left'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', 'right']
        ]), 'DIRECTION')
        .appendField(new Blockly.FieldNumber(1, 1, 5), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_BEND_TOOLTIP || 'Bend Humanoid left or right');
  }
};

javascriptGenerator.forBlock['humanoid_bend'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = block.getFieldValue('STEPS');

  if (direction === 'left') {
    return `  otto.bendLeft(${steps}, 1000);\n`;
  } else {
    return `  otto.bendRight(${steps}, 1000);\n`;
  }
};

pythonGenerator.forBlock['humanoid_bend'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = block.getFieldValue('STEPS');

  if (direction === 'left') {
    return `otto.bend_left(${steps}, 1000)\n`;
  } else {
    return `otto.bend_right(${steps}, 1000)\n`;
  }
};

// ===== OTTO Moonwalk =====

Blockly.Blocks['humanoid_moonwalk'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🕺 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_MOONWALK_LABEL || 'Humanoid Moonwalk'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_STEPS || 'steps')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', '1'],
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', '-1']
        ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_MOONWALK_TOOLTIP || 'Make Humanoid moonwalk');
  }
};

javascriptGenerator.forBlock['humanoid_moonwalk'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');

  return `  otto.moonwalk(${steps}, 1000, ${direction});\n`;
};

pythonGenerator.forBlock['humanoid_moonwalk'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');

  return `otto.moonwalk(${steps}, 1000, ${direction})\n`;
};

// ===== OTTO Gesture (感情表現) =====

Blockly.Blocks['humanoid_gesture'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('😊 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_LABEL || 'Humanoid Gesture'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_HAPPY || 'Happy', 'OttoHappy'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_SUPERHAPPY || 'Super Happy', 'OttoSuperHappy'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_SAD || 'Sad', 'OttoSad'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_VICTORY || 'Victory', 'OttoVictory'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_ANGRY || 'Angry', 'OttoAngry'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_SLEEPING || 'Sleeping', 'OttoSleeping'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_FRETFUL || 'Fretful', 'OttoFretful'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_LOVE || 'Love', 'OttoLove'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_CONFUSED || 'Confused', 'OttoConfused'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_FART || 'Fart', 'OttoFart'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_WAVE || 'Wave', 'OttoWave'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_MAGIC || 'Magic', 'OttoMagic'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_FAIL || 'Fail', 'OttoFail']
        ]), 'GESTURE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_GESTURE_TOOLTIP || 'Humanoid expresses emotions with movement and sound');
  }
};

javascriptGenerator.forBlock['humanoid_gesture'] = function(block: Blockly.Block) {
  const gesture = block.getFieldValue('GESTURE');
  return `  otto.playGesture(${gesture});\n`;
};

pythonGenerator.forBlock['humanoid_gesture'] = function(block: Blockly.Block) {
  const gesture = block.getFieldValue('GESTURE');
  // Python版は簡易実装
  const gestureMap: { [key: string]: string } = {
    'OttoHappy': 'happy',
    'OttoSuperHappy': 'super_happy',
    'OttoSad': 'sad',
    'OttoVictory': 'victory',
    'OttoAngry': 'angry',
    'OttoSleeping': 'sleeping',
    'OttoFretful': 'fretful',
    'OttoLove': 'love',
    'OttoConfused': 'confused',
    'OttoFart': 'fart',
    'OttoWave': 'wave',
    'OttoMagic': 'magic',
    'OttoFail': 'fail'
  };
  return `otto.play_gesture("${gestureMap[gesture]}")\n`;
};

// ===== OTTO Sound (音声) =====

Blockly.Blocks['humanoid_sound'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_LABEL || 'Humanoid Sound'))
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_CONNECTION || 'Connection', 'S_connection'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_DISCONNECTION || 'Disconnection', 'S_disconnection'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_BUTTONPUSHED || 'Button Pushed', 'S_buttonPushed'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_MODE1 || 'Mode 1', 'S_mode1'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_MODE2 || 'Mode 2', 'S_mode2'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_MODE3 || 'Mode 3', 'S_mode3'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_SURPRISE || 'Surprise', 'S_surprise'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_OHOOH || 'Oh Ooh', 'S_OhOoh'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_OHOOH2 || 'Oh Ooh 2', 'S_OhOoh2'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_CUDDLY || 'Cuddly', 'S_cuddly'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_SLEEPING || 'Sleeping', 'S_sleeping'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_HAPPY || 'Happy', 'S_happy'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_SUPERHAPPY || 'Super Happy', 'S_superHappy'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_HAPPYSHORT || 'Happy Short', 'S_happy_short'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_SAD || 'Sad', 'S_sad'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_CONFUSED || 'Confused', 'S_confused'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_FART1 || 'Fart 1', 'S_fart1'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_FART2 || 'Fart 2', 'S_fart2'],
          [(Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_FART3 || 'Fart 3', 'S_fart3']
        ]), 'SOUND');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_SOUND_TOOLTIP || 'Humanoid plays a sound');
  }
};

javascriptGenerator.forBlock['humanoid_sound'] = function(block: Blockly.Block) {
  const sound = block.getFieldValue('SOUND');
  return `  otto.sing(${sound});\n`;
};

pythonGenerator.forBlock['humanoid_sound'] = function(block: Blockly.Block) {
  const sound = block.getFieldValue('SOUND');
  return `otto.sing("${sound}")\n`;
};

// ===== OTTO Additional Dance Moves =====

// Crusaito
Blockly.Blocks['humanoid_crusaito'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🦵 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_CRUSAITO_LABEL || 'Humanoid Crusaito'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', '1'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', '-1']
        ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_CRUSAITO_TOOLTIP || 'Move with crossed legs');
  }
};

javascriptGenerator.forBlock['humanoid_crusaito'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `  otto.crusaito(${steps}, 1000, 30, ${direction});\n`;
};

pythonGenerator.forBlock['humanoid_crusaito'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `otto.crusaito(${steps}, 1000, 30, ${direction})\n`;
};

// Flapping
Blockly.Blocks['humanoid_flapping'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🦅 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_FLAPPING_LABEL || 'Humanoid Flapping'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_FRONT || 'front', '1'],
          [(Blockly.Msg as any).BLOCKS_COMMON_BACK || 'back', '-1']
        ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_FLAPPING_TOOLTIP || 'Make flapping motion');
  }
};

javascriptGenerator.forBlock['humanoid_flapping'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `  otto.flapping(${steps}, 1000, 20, ${direction});\n`;
};

pythonGenerator.forBlock['humanoid_flapping'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `otto.flapping(${steps}, 1000, 20, ${direction})\n`;
};

// Tiptoe Swing
Blockly.Blocks['humanoid_tiptoe_swing'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🩰 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_TIPTOESWING_LABEL || 'Humanoid Tiptoe Swing'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_TIPTOESWING_TOOLTIP || 'Swing on tiptoes');
  }
};

javascriptGenerator.forBlock['humanoid_tiptoe_swing'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `  otto.tiptoeSwing(${steps}, 1000, 30);\n`;
};

pythonGenerator.forBlock['humanoid_tiptoe_swing'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.tiptoe_swing(${steps}, 1000, 30)\n`;
};

// Jitter
Blockly.Blocks['humanoid_jitter'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('😰 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_JITTER_LABEL || 'Humanoid Jitter'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_JITTER_TOOLTIP || 'Make jittering motion');
  }
};

javascriptGenerator.forBlock['humanoid_jitter'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `  otto.jitter(${steps}, 500, 15);\n`;
};

pythonGenerator.forBlock['humanoid_jitter'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.jitter(${steps}, 500, 15)\n`;
};

// Ascending Turn
Blockly.Blocks['humanoid_ascending_turn'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_ASCENDINGTURN_LABEL || 'Humanoid Ascending Turn'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFT || 'left', '1'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHT || 'right', '-1']
        ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_ASCENDINGTURN_TOOLTIP || 'Turn while ascending');
  }
};

javascriptGenerator.forBlock['humanoid_ascending_turn'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `  otto.ascendingTurn(${steps}, 1000, 10, ${direction});\n`;
};

pythonGenerator.forBlock['humanoid_ascending_turn'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `otto.ascending_turn(${steps}, 1000, 10, ${direction})\n`;
};

// Shake Leg
Blockly.Blocks['humanoid_shake_leg'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🦿 ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_SHAKELEG_LABEL || 'Humanoid Shake Leg'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times')
        .appendField(new Blockly.FieldDropdown([
          [(Blockly.Msg as any).BLOCKS_COMMON_LEFTFOOT || 'left foot', '1'],
          [(Blockly.Msg as any).BLOCKS_COMMON_RIGHTFOOT || 'right foot', '-1']
        ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_SHAKELEG_TOOLTIP || 'Shake leg');
  }
};

javascriptGenerator.forBlock['humanoid_shake_leg'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `  otto.shakeLeg(${steps}, 1000, ${direction});\n`;
};

pythonGenerator.forBlock['humanoid_shake_leg'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `otto.shake_leg(${steps}, 1000, ${direction})\n`;
};

// Up Down
Blockly.Blocks['humanoid_updown'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⬆️⬇️ ' + ((Blockly.Msg as any).BLOCKS_HUMANOID_UPDOWN_LABEL || 'Humanoid Up Down'))
        .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
        .appendField((Blockly.Msg as any).BLOCKS_COMMON_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_HUMANOID_UPDOWN_TOOLTIP || 'Move up and down');
  }
};

javascriptGenerator.forBlock['humanoid_updown'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `  otto.updown(${steps}, 1000, 30);\n`;
};

pythonGenerator.forBlock['humanoid_updown'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.updown(${steps}, 1000, 30)\n`;
};

export {}; // Make this a module
