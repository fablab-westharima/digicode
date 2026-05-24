/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiMorpher (変形ロボット、4-servo biped with Walk & Roll modes) Blockly Blocks
 * Phase B-2 (Session 146、60.md §1 verbatim)
 *
 * 旧 transformBlocks.ts (DigiCodeTransform lib = OttoDIYLib derivation) を完全置換。
 *
 * 新 lib (DigiMorpher、AGPL-3.0、Layer 5、DigiMotion 依存) の API consumer。
 * D8: walk/turn/roll/etc. 全件 blocking + async 両 form (T2 verbatim mapping)。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getTransformPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const MORPHER_COLOR = '#9C27B0';

// 速度 dropdown → deg/sec mapping (walk mode) / percent mapping (roll mode)
function walkSpeedToDegPerSec(speedSlot: string): string {
  return speedSlot === 'fast' ? '120' : speedSlot === 'slow' ? '30' : '60';
}
function rollSpeedToPercent(speedSlot: string): string {
  return speedSlot === 'fast' ? '100' : speedSlot === 'slow' ? '30' : '50';
}

// ===== morpher_init =====
Blockly.Blocks['morpher_init'] = {
  init: function() {
    const pins = getTransformPins();
    this.appendDummyInput()
        .appendField('🦾 ' + (Blockly.Msg.BLOCKS_MORPHER_INIT_LABEL || 'Morpher Init'))
        .appendField(Blockly.Msg.BLOCKS_COMMON_LEFTLEG || 'left leg pin')
        .appendField(new Blockly.FieldNumber(pins.leftLeg, 0, 39), 'PIN_LL')
        .appendField(Blockly.Msg.BLOCKS_COMMON_RIGHTLEG || 'right leg pin')
        .appendField(new Blockly.FieldNumber(pins.rightLeg, 0, 39), 'PIN_RL')
        .appendField(Blockly.Msg.BLOCKS_COMMON_LEFTANKLE || 'left foot pin')
        .appendField(new Blockly.FieldNumber(pins.leftFoot, 0, 39), 'PIN_LF')
        .appendField(Blockly.Msg.BLOCKS_COMMON_RIGHTANKLE || 'right foot pin')
        .appendField(new Blockly.FieldNumber(pins.rightFoot, 0, 39), 'PIN_RF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MORPHER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MORPHER_INIT_TOOLTIP || 'Initialize DigiMorpher (4-servo, Walk/Roll mode switchable)');
  }
};
javascriptGenerator.forBlock['morpher_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');
  generator.definitions_['include_digimorpher'] = '#include <DigiMorpher.h>';
  generator.definitions_['morpher_instance'] = 'DigiMorpher morpher;';
  return `  morpher.init(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF});\n`;
};

// ===== morpher_set_mode (state flag、 blocking semantic 不要) =====
Blockly.Blocks['morpher_set_mode'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔄 ' + (Blockly.Msg.BLOCKS_MORPHER_SET_MODE_LABEL || 'Morpher Set Mode'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_MORPHER_MODE_WALK || 'Walk', 'walk'],
          [Blockly.Msg.BLOCKS_MORPHER_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MORPHER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MORPHER_SET_MODE_TOOLTIP || 'Set mode flag (Walk for 4-leg walking / Roll for wheel drive)');
  }
};
javascriptGenerator.forBlock['morpher_set_mode'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  morpher.setMode("${mode}");\n`;
};

// ===== morpher_shift_{blocking,async} (physical transformation) =====
function makeShiftBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('🦾 ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_MORPHER_MODE_WALK || 'Walk', 'walk'],
            [Blockly.Msg.BLOCKS_MORPHER_MODE_ROLL || 'Roll', 'roll']
          ]), 'MODE');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeShiftBlock('morpher_shift_blocking',
  'BLOCKS_MORPHER_SHIFT_BLOCKING_LABEL', 'Morpher Shift (blocking)',
  'BLOCKS_MORPHER_SHIFT_BLOCKING_TOOLTIP', 'Physically transform to target mode, blocks');
makeShiftBlock('morpher_shift_async',
  'BLOCKS_MORPHER_SHIFT_ASYNC_LABEL', 'Morpher Shift (async)',
  'BLOCKS_MORPHER_SHIFT_ASYNC_TOOLTIP', 'Start transforming in background');

javascriptGenerator.forBlock['morpher_shift_blocking'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  morpher.shiftBlocking("${mode}");\n`;
};
javascriptGenerator.forBlock['morpher_shift_async'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  morpher.shiftAsync("${mode}");\n`;
};

// ===== morpher_home_blocking =====
Blockly.Blocks['morpher_home_blocking'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + (Blockly.Msg.BLOCKS_MORPHER_HOME_BLOCKING_LABEL || 'Morpher Home (blocking)'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MORPHER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MORPHER_HOME_BLOCKING_TOOLTIP || 'Return to upright position, blocks');
  }
};
javascriptGenerator.forBlock['morpher_home_blocking'] = function() {
  return `  morpher.homeBlocking();\n`;
};

// ===== morpher_walk_{blocking,async} (forward/backward × speed) =====
function makeWalkOrRollDirBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('🚶 ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_FORWARD || 'forward', 'forward'],
            [Blockly.Msg.BLOCKS_COMMON_BACKWARD || 'backward', 'backward']
          ]), 'DIRECTION')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
          ]), 'SPEED');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeWalkOrRollDirBlock('morpher_walk_blocking',
  'BLOCKS_MORPHER_WALK_BLOCKING_LABEL', 'Morpher Walk (blocking)',
  'BLOCKS_MORPHER_WALK_BLOCKING_TOOLTIP', 'Walk-mode forward/backward, blocks');
makeWalkOrRollDirBlock('morpher_walk_async',
  'BLOCKS_MORPHER_WALK_ASYNC_LABEL', 'Morpher Walk (async)',
  'BLOCKS_MORPHER_WALK_ASYNC_TOOLTIP', 'Start walk-mode motion in background');

javascriptGenerator.forBlock['morpher_walk_blocking'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  const dir = direction === 'forward' ? '1' : '-1';
  return `  morpher.walkBlocking(${dir}, ${walkSpeedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_walk_async'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  const dir = direction === 'forward' ? '1' : '-1';
  return `  morpher.walkAsync(${dir}, ${walkSpeedToDegPerSec(speedSlot)});\n`;
};

// ===== morpher_turn_{blocking,async} (walk mode、left/right × times) =====
function makeMorpherTurnBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('↻ ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', 'left'],
            [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', 'right']
          ]), 'DIRECTION');
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeMorpherTurnBlock('morpher_turn_blocking',
  'BLOCKS_MORPHER_TURN_BLOCKING_LABEL', 'Morpher Turn (blocking)',
  'BLOCKS_MORPHER_TURN_BLOCKING_TOOLTIP', 'Walk-mode turn, blocks');
makeMorpherTurnBlock('morpher_turn_async',
  'BLOCKS_MORPHER_TURN_ASYNC_LABEL', 'Morpher Turn (async)',
  'BLOCKS_MORPHER_TURN_ASYNC_TOOLTIP', 'Start walk-mode turn in background');

javascriptGenerator.forBlock['morpher_turn_blocking'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const dir = direction === 'left' ? '1' : '-1';
  return `  morpher.turnBlocking(String(${steps}).toInt(), ${dir});\n`;
};
javascriptGenerator.forBlock['morpher_turn_async'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const dir = direction === 'left' ? '1' : '-1';
  return `  morpher.turnAsync(String(${steps}).toInt(), ${dir});\n`;
};

// ===== morpher_stop (mode 別、即時) =====
Blockly.Blocks['morpher_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏹ ' + (Blockly.Msg.BLOCKS_MORPHER_STOP_LABEL || 'Morpher Stop'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_MORPHER_MODE_WALK || 'Walk', 'walk'],
          [Blockly.Msg.BLOCKS_MORPHER_MODE_ROLL || 'Roll', 'roll']
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MORPHER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MORPHER_STOP_TOOLTIP || 'Stop specified mode immediately');
  }
};
javascriptGenerator.forBlock['morpher_stop'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `  morpher.stop("${mode}");\n`;
};

// ===== morpher_roll_{blocking,async} (roll mode、forward/backward × speed) =====
makeWalkOrRollDirBlock('morpher_roll_blocking',
  'BLOCKS_MORPHER_ROLL_BLOCKING_LABEL', 'Morpher Roll (blocking)',
  'BLOCKS_MORPHER_ROLL_BLOCKING_TOOLTIP', 'Roll-mode forward/backward, blocks');
makeWalkOrRollDirBlock('morpher_roll_async',
  'BLOCKS_MORPHER_ROLL_ASYNC_LABEL', 'Morpher Roll (async)',
  'BLOCKS_MORPHER_ROLL_ASYNC_TOOLTIP', 'Start roll-mode motion in background');

javascriptGenerator.forBlock['morpher_roll_blocking'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  const dir = direction === 'forward' ? '1' : '-1';
  return `  morpher.rollBlocking(${dir}, ${rollSpeedToPercent(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_roll_async'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  const dir = direction === 'forward' ? '1' : '-1';
  return `  morpher.rollAsync(${dir}, ${rollSpeedToPercent(speedSlot)});\n`;
};

// ===== morpher_roll_rotate_{blocking,async} (roll mode rotate、left/right × power %) =====
function makeRollRotateBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('↻ ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', 'left'],
            [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', 'right']
          ]), 'DIRECTION');
      this.appendValueInput('POWER')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField('%');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeRollRotateBlock('morpher_roll_rotate_blocking',
  'BLOCKS_MORPHER_ROLL_ROTATE_BLOCKING_LABEL', 'Morpher Roll Rotate (blocking)',
  'BLOCKS_MORPHER_ROLL_ROTATE_BLOCKING_TOOLTIP', 'Roll-mode rotate, blocks');
makeRollRotateBlock('morpher_roll_rotate_async',
  'BLOCKS_MORPHER_ROLL_ROTATE_ASYNC_LABEL', 'Morpher Roll Rotate (async)',
  'BLOCKS_MORPHER_ROLL_ROTATE_ASYNC_TOOLTIP', 'Start roll-mode rotate in background');

javascriptGenerator.forBlock['morpher_roll_rotate_blocking'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = generator.valueToCode(block, 'POWER', generator.ORDER_ATOMIC) || '50';
  const dir = direction === 'left' ? '1' : '-1';
  return `  morpher.rollRotateBlocking(${dir}, String(${power}).toInt());\n`;
};
javascriptGenerator.forBlock['morpher_roll_rotate_async'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const power = generator.valueToCode(block, 'POWER', generator.ORDER_ATOMIC) || '50';
  const dir = direction === 'left' ? '1' : '-1';
  return `  morpher.rollRotateAsync(${dir}, String(${power}).toInt());\n`;
};

// ===== morpher_pushup_{blocking,async} =====
function makePushupBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('💪 ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makePushupBlock('morpher_pushup_blocking',
  'BLOCKS_MORPHER_PUSHUP_BLOCKING_LABEL', 'Morpher Push-up (blocking)',
  'BLOCKS_MORPHER_PUSHUP_BLOCKING_TOOLTIP', 'Do push-ups, blocks');
makePushupBlock('morpher_pushup_async',
  'BLOCKS_MORPHER_PUSHUP_ASYNC_LABEL', 'Morpher Push-up (async)',
  'BLOCKS_MORPHER_PUSHUP_ASYNC_TOOLTIP', 'Start push-ups in background');

javascriptGenerator.forBlock['morpher_pushup_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  return `  morpher.pushupBlocking(String(${steps}).toInt());\n`;
};
javascriptGenerator.forBlock['morpher_pushup_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  return `  morpher.pushupAsync(String(${steps}).toInt());\n`;
};

// ===== morpher_dance_{blocking,async} =====
function makeMorpherDanceBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('💃 ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeMorpherDanceBlock('morpher_dance_blocking',
  'BLOCKS_MORPHER_DANCE_BLOCKING_LABEL', 'Morpher Dance (blocking)',
  'BLOCKS_MORPHER_DANCE_BLOCKING_TOOLTIP', 'Dance, blocks');
makeMorpherDanceBlock('morpher_dance_async',
  'BLOCKS_MORPHER_DANCE_ASYNC_LABEL', 'Morpher Dance (async)',
  'BLOCKS_MORPHER_DANCE_ASYNC_TOOLTIP', 'Start dancing in background');

javascriptGenerator.forBlock['morpher_dance_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  return `  morpher.danceBlocking(String(${steps}).toInt());\n`;
};
javascriptGenerator.forBlock['morpher_dance_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  return `  morpher.danceAsync(String(${steps}).toInt());\n`;
};

// ===== morpher_is_idle (value) =====
Blockly.Blocks['morpher_is_idle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('❓ ' + (Blockly.Msg.BLOCKS_MORPHER_IS_IDLE_LABEL || 'Morpher is idle?'));
    this.setOutput(true, 'Boolean');
    this.setColour(MORPHER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MORPHER_IS_IDLE_TOOLTIP || 'Returns true if morpher is idle');
  }
};
javascriptGenerator.forBlock['morpher_is_idle'] = function() {
  return [`morpher.isIdle()`, generator.ORDER_FUNCTION_CALL];
};

// ===== morpher_wait_until_idle =====
Blockly.Blocks['morpher_wait_until_idle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏳ ' + (Blockly.Msg.BLOCKS_MORPHER_WAIT_UNTIL_IDLE_LABEL || 'Wait until morpher idle'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MORPHER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MORPHER_WAIT_UNTIL_IDLE_TOOLTIP || 'Block until morpher async motion completes');
  }
};
javascriptGenerator.forBlock['morpher_wait_until_idle'] = function() {
  return `  morpher.waitUntilIdle();\n`;
};

export {};
