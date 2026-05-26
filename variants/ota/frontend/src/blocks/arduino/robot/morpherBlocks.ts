/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiMorpher (変形ロボット、4-servo biped with Walk & Roll modes) Blockly Blocks
 * Phase X-2 commit 1 (Session 152、 Q-D/Q-H=i 確定後の lib actual API match)
 *
 * 旧 transformBlocks.ts (DigiCodeTransform lib = OttoDIYLib derivation) を完全置換。
 *
 * 新 lib (DigiMorpher、AGPL-3.0、Layer 5、DigiMotion 依存) の API consumer。
 * Phase X-2 commit 1 で generator emit を lib actual signature に揃え:
 *   - morpher_init: concrete ServoChannel180 × 4 instance + attachChannels + 0-arg init()
 *   - setMode: lib `setMode(MorphMode)` enum (MORPH_WALK / MORPH_ROLL) = UI 'walk'/'roll' string を
 *     enum 値に generator side で map (Q-H=i)
 *   - shift{Blocking,Async}: lib `(MorphMode, speed)` 2-arg / `(MorphMode, speed, nowMs)` 3-arg
 *     = UI に SPEED dropdown 追加
 *   - walk{Blocking,Async}: lib `(steps, direction, speed)` 3-arg / `(..., nowMs)` 4-arg
 *     = UI に STEPS valueInput 追加
 *   - turn{Blocking,Async}: lib `(steps, direction, speed)` 3-arg = UI に SPEED dropdown 追加
 *   - stop: lib `stop()` 0-arg = UI から MODE dropdown 廃止
 *   - roll{Blocking,Async}: lib `(cycles, direction, speed)` 3-arg = UI に CYCLES valueInput 追加
 *   - rollRotate{Blocking,Async}: lib `(cycles, direction, speed)` 3-arg = UI に CYCLES valueInput 追加、
 *     既存 POWER valueInput を speed (deg/sec) として再解釈
 *   - pushup{Blocking,Async} / dance{Blocking,Async}: lib `(cycles, speed)` 2-arg = UI に SPEED dropdown 追加
 *   - is_idle / wait_until_idle: ✅ 既存 emit match
 *
 * E1 (3 軸 per-channel emit、 Phase B-3): default 値以外のみ setChannelPulseRange/MaxRate/Trim emit。
 * rule 16 §D1: 全 init / consumer block generator 先頭に emits: / requires: comment 追記。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getTransformPins, getServoPulseWidth, getServoSpeed, getServoTrim, getServoReverse } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const MORPHER_COLOR = '#9C27B0';

// 速度 dropdown → deg/sec mapping (walk mode 用 = unitsPerSec 同 mapping、 biped と同 SPEED slot 名)
function speedToDegPerSec(speedSlot: string): string {
  return speedSlot === 'fast' ? '120' : speedSlot === 'slow' ? '30' : '60';
}

// MorphMode 'walk' / 'roll' を lib enum 値に map
function modeToEnum(modeSlot: string): string {
  return modeSlot === 'roll' ? 'DigiMorpher::MORPH_ROLL' : 'DigiMorpher::MORPH_WALK';
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
        .appendField(Blockly.Msg.BLOCKS_COMMON_LEFTFOOT || 'left foot pin')
        .appendField(new Blockly.FieldNumber(pins.leftFoot, 0, 39), 'PIN_LF')
        .appendField(Blockly.Msg.BLOCKS_COMMON_RIGHTFOOT || 'right foot pin')
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
  generator.definitions_['include_digimotion'] = '#include <DigiMotion.h>';
  generator.definitions_['include_digimorpher'] = '#include <DigiMorpher.h>';
  generator.definitions_['morpher_channels'] = `/* emits: _morpherCh0..3 (ServoChannel180), morpher (DigiMorpher) */
ServoChannel180 _morpherCh0(${pinLL});
ServoChannel180 _morpherCh1(${pinRL});
ServoChannel180 _morpherCh2(${pinLF});
ServoChannel180 _morpherCh3(${pinRF});
DigiMorpher morpher;`;

  // E1 3 軸 per-channel emit (default 以外のみ、 R1 invariant)
  const pins = [pinLL, pinRL, pinLF, pinRF];
  const setupLines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const pinNum = parseInt(pins[i], 10);
    if (isNaN(pinNum)) continue;
    const pulse = getServoPulseWidth(pinNum);
    const speed = getServoSpeed(pinNum);
    const trim = getServoTrim(pinNum);
    const reverse = getServoReverse(pinNum);
    if (pulse.min !== 500 || pulse.max !== 2400) {
      setupLines.push(`  morpher.setChannelPulseRange(${i}, ${pulse.min}, ${pulse.max});`);
    }
    if (speed > 0) {
      setupLines.push(`  morpher.setChannelMaxRate(${i}, ${speed});`);
    }
    if (trim !== 0) {
      setupLines.push(`  morpher.setChannelTrim(${i}, ${trim});`);
    }
    // Phase 3-D (Session 156、4 軸統合、R1 invariant): reverse===true 時のみ emit
    if (reverse) {
      setupLines.push(`  morpher.setChannelReverse(${i}, true);`);
    }
  }

  // Phase F-2 (Session 157): pump 経路 dead 解消 = case 22 founding use case 前提復活、
  // capi Phase F-1 と pair、 loopPre tick + setup 末尾 start で async motion + rate-limited 動作。
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['morpher_tick'] = '  morpher.tick(millis());';
  const allLines = [
    '  morpher.attachChannels(&_morpherCh0, &_morpherCh1, &_morpherCh2, &_morpherCh3);',
    ...setupLines,
    '  morpher.init();',
    '  getBackgroundPump().start();',
  ];
  return allLines.join('\n') + '\n';
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
  return `  /* requires: morpher */ morpher.setMode(${modeToEnum(mode)});\n`;
};

// ===== morpher_shift_{blocking,async} (physical transformation、 lib 2-arg/3-arg) =====
function makeShiftBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('🦾 ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_MORPHER_MODE_WALK || 'Walk', 'walk'],
            [Blockly.Msg.BLOCKS_MORPHER_MODE_ROLL || 'Roll', 'roll']
          ]), 'MODE')
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
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
makeShiftBlock('morpher_shift_blocking',
  'BLOCKS_MORPHER_SHIFT_BLOCKING_LABEL', 'Morpher Shift (blocking)',
  'BLOCKS_MORPHER_SHIFT_BLOCKING_TOOLTIP', 'Physically transform to target mode at selected speed, blocks');
makeShiftBlock('morpher_shift_async',
  'BLOCKS_MORPHER_SHIFT_ASYNC_LABEL', 'Morpher Shift (async)',
  'BLOCKS_MORPHER_SHIFT_ASYNC_TOOLTIP', 'Start transforming in background');

javascriptGenerator.forBlock['morpher_shift_blocking'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.shiftBlocking(${modeToEnum(mode)}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_shift_async'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.shiftAsync(${modeToEnum(mode)}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
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
  return `  /* requires: morpher */ morpher.homeBlocking();\n`;
};

// ===== morpher_walk_{blocking,async} — lib 3-arg/4-arg (steps, direction, speed[, nowMs]) =====
// Q-H=i: 旧 (direction + speed) を (STEPS valueInput + direction + speed) に拡張
function makeWalkBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('🚶 ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_STEPS || 'steps')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_FORWARD || 'forward', '1'],
            [Blockly.Msg.BLOCKS_COMMON_BACKWARD || 'backward', '-1']
          ]), 'DIRECTION')
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
          ]), 'SPEED');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeWalkBlock('morpher_walk_blocking',
  'BLOCKS_MORPHER_WALK_BLOCKING_LABEL', 'Morpher Walk (blocking)',
  'BLOCKS_MORPHER_WALK_BLOCKING_TOOLTIP', 'Walk N steps in direction at selected speed (walk mode only), blocks');
makeWalkBlock('morpher_walk_async',
  'BLOCKS_MORPHER_WALK_ASYNC_LABEL', 'Morpher Walk (async)',
  'BLOCKS_MORPHER_WALK_ASYNC_TOOLTIP', 'Start walk-mode motion in background');

javascriptGenerator.forBlock['morpher_walk_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.walkBlocking(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_walk_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.walkAsync(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== morpher_turn_{blocking,async} — lib 3-arg/4-arg (steps, direction, speed[, nowMs]) =====
// Q-H=i: 既存 (left/right + STEPS) に SPEED dropdown 追加
function makeTurnBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('↻ ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', '1'],
            [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', '-1']
          ]), 'DIRECTION');
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times')
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
          ]), 'SPEED');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeTurnBlock('morpher_turn_blocking',
  'BLOCKS_MORPHER_TURN_BLOCKING_LABEL', 'Morpher Turn (blocking)',
  'BLOCKS_MORPHER_TURN_BLOCKING_TOOLTIP', 'Walk-mode turn N times at selected speed, blocks');
makeTurnBlock('morpher_turn_async',
  'BLOCKS_MORPHER_TURN_ASYNC_LABEL', 'Morpher Turn (async)',
  'BLOCKS_MORPHER_TURN_ASYNC_TOOLTIP', 'Start walk-mode turn in background');

javascriptGenerator.forBlock['morpher_turn_blocking'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.turnBlocking(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_turn_async'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.turnAsync(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== morpher_stop (lib 0-arg、 mode 引数廃止 Q-H=i) =====
Blockly.Blocks['morpher_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏹ ' + (Blockly.Msg.BLOCKS_MORPHER_STOP_LABEL || 'Morpher Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MORPHER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MORPHER_STOP_TOOLTIP || 'Stop current motion immediately');
  }
};
javascriptGenerator.forBlock['morpher_stop'] = function() {
  return `  /* requires: morpher */ morpher.stop();\n`;
};

// ===== morpher_roll_{blocking,async} — lib 3-arg/4-arg (cycles, direction, speed[, nowMs]) =====
// Q-H=i: 旧 (direction + speed) に CYCLES valueInput 追加 (lib に cycles 引数)
function makeRollBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('⚽ ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('CYCLES')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_FORWARD || 'forward', '1'],
            [Blockly.Msg.BLOCKS_COMMON_BACKWARD || 'backward', '-1']
          ]), 'DIRECTION')
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
          ]), 'SPEED');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeRollBlock('morpher_roll_blocking',
  'BLOCKS_MORPHER_ROLL_BLOCKING_LABEL', 'Morpher Roll (blocking)',
  'BLOCKS_MORPHER_ROLL_BLOCKING_TOOLTIP', 'Roll-mode forward/backward N cycles, blocks');
makeRollBlock('morpher_roll_async',
  'BLOCKS_MORPHER_ROLL_ASYNC_LABEL', 'Morpher Roll (async)',
  'BLOCKS_MORPHER_ROLL_ASYNC_TOOLTIP', 'Start roll-mode motion in background');

javascriptGenerator.forBlock['morpher_roll_blocking'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'CYCLES', generator.ORDER_ATOMIC) || '3';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.rollBlocking(String(${cycles}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_roll_async'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'CYCLES', generator.ORDER_ATOMIC) || '3';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.rollAsync(String(${cycles}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== morpher_roll_rotate_{blocking,async} — lib 3-arg/4-arg (cycles, direction, speed) =====
// Q-H=i: 旧 (direction + POWER valueInput) を (CYCLES + direction + POWER → speed) に再構成
function makeRollRotateBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('↻ ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', '1'],
            [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', '-1']
          ]), 'DIRECTION');
      this.appendValueInput('CYCLES')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times')
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
          ]), 'SPEED');
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
  'BLOCKS_MORPHER_ROLL_ROTATE_BLOCKING_TOOLTIP', 'Roll-mode rotate N cycles at selected speed, blocks');
makeRollRotateBlock('morpher_roll_rotate_async',
  'BLOCKS_MORPHER_ROLL_ROTATE_ASYNC_LABEL', 'Morpher Roll Rotate (async)',
  'BLOCKS_MORPHER_ROLL_ROTATE_ASYNC_TOOLTIP', 'Start roll-mode rotate in background');

javascriptGenerator.forBlock['morpher_roll_rotate_blocking'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'CYCLES', generator.ORDER_ATOMIC) || '3';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.rollRotateBlocking(String(${cycles}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_roll_rotate_async'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'CYCLES', generator.ORDER_ATOMIC) || '3';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.rollRotateAsync(String(${cycles}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== morpher_pushup_{blocking,async} — lib 2-arg/3-arg (cycles, speed[, nowMs]) =====
// Q-H=i: 既存 STEPS valueInput を cycles 解釈で再利用、 SPEED dropdown 追加
function makePushupOrDanceBlock(blockType: string, emoji: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField(emoji + ' ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times')
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
          ]), 'SPEED');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MORPHER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makePushupOrDanceBlock('morpher_pushup_blocking', '💪',
  'BLOCKS_MORPHER_PUSHUP_BLOCKING_LABEL', 'Morpher Push-up (blocking)',
  'BLOCKS_MORPHER_PUSHUP_BLOCKING_TOOLTIP', 'Do push-ups N cycles at selected speed, blocks');
makePushupOrDanceBlock('morpher_pushup_async', '💪',
  'BLOCKS_MORPHER_PUSHUP_ASYNC_LABEL', 'Morpher Push-up (async)',
  'BLOCKS_MORPHER_PUSHUP_ASYNC_TOOLTIP', 'Start push-ups in background');
makePushupOrDanceBlock('morpher_dance_blocking', '💃',
  'BLOCKS_MORPHER_DANCE_BLOCKING_LABEL', 'Morpher Dance (blocking)',
  'BLOCKS_MORPHER_DANCE_BLOCKING_TOOLTIP', 'Dance N cycles at selected speed, blocks');
makePushupOrDanceBlock('morpher_dance_async', '💃',
  'BLOCKS_MORPHER_DANCE_ASYNC_LABEL', 'Morpher Dance (async)',
  'BLOCKS_MORPHER_DANCE_ASYNC_TOOLTIP', 'Start dancing in background');

javascriptGenerator.forBlock['morpher_pushup_blocking'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.pushupBlocking(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_pushup_async'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.pushupAsync(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)}, millis());\n`;
};
javascriptGenerator.forBlock['morpher_dance_blocking'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.danceBlocking(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['morpher_dance_async'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: morpher */ morpher.danceAsync(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)}, millis());\n`;
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
  return [`/* requires: morpher */ morpher.isIdle()`, generator.ORDER_FUNCTION_CALL];
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
  return `  /* requires: morpher */ morpher.waitUntilIdle();\n`;
};

export {};
