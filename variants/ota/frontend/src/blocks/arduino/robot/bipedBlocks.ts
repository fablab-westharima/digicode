/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiBiped (二足歩行ロボット) Blockly Blocks — Phase B-2 (Session 146、60.md §1 verbatim)
 *
 * Founding use case (case 22 anchor): 等身大 Humanoid のサーボ速度制御 + ギヤ保護 + IoT 共存。
 * 旧 humanoidBlocks.ts (DigiCodeHumanoid lib = OttoDIYLib derivation、case 23 incident E) を完全置換。
 *
 * 新 lib (DigiBiped、AGPL-3.0、Layer 5、DigiMotion 依存) の API consumer:
 *   - DigiBiped biped (global instance)
 *   - init(pinLL, pinRL, pinLF, pinRF, buzzerPin?)
 *   - homeBlocking() / walkBlocking(steps, dir, deg/s) / walkAsync(steps, dir, deg/s)
 *   - turnBlocking/Async / jumpBlocking/Async / danceBlocking/Async / swingBlocking/Async
 *   - bendBlocking/Async (with side) / moonwalkBlocking/Async
 *   - playGesture(GestureId) — DigiCode 独自 gesture set (D-new-1a、§1-7.2、OttoDIYLib 由来 0)
 *   - isIdle() (query) / waitUntilIdle() (barrier)
 *
 * D8 (Session 139 settled): walk() 廃止、walkBlocking/walkAsync で意味明示。
 * 本 B-2 commit は block 定義 + 新 lib API 経由 generator emit (basic、speed dropdown → deg/sec)。
 * 3 軸統合 (pulse + speed + trim per-pin) は Phase B-3 で getServo{PulseWidth,Speed,Trim} 経由 emit。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getHumanoidPins, getPinFromPreset, getServoPulseWidth, getServoSpeed, getServoTrim } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const BIPED_COLOR = '#FF6B35';  // Orange、旧 Humanoid と同 hue (UI 連続性、user 視覚負荷軽減)

// 速度 dropdown → deg/sec mapping (Session 139 §1-3.4 verbatim、period ms 廃止)
const SPEED_DEG_PER_SEC_MAP: Record<string, string> = {
  fast: '120',
  normal: '60',
  slow: '30',
};

function speedToDegPerSec(speedSlot: string): string {
  return SPEED_DEG_PER_SEC_MAP[speedSlot] ?? '60';
}

// ===== biped_init =====
Blockly.Blocks['biped_init'] = {
  init: function() {
    const pins = getHumanoidPins();
    const buzzerPin = getPinFromPreset('humanoidBuzzer');
    this.appendDummyInput()
        .appendField('🤖 ' + (Blockly.Msg.BLOCKS_BIPED_INIT_LABEL || 'Biped Init'))
        .appendField(Blockly.Msg.BLOCKS_COMMON_LEFTLEG || 'left leg pin')
        .appendField(new Blockly.FieldNumber(pins.leftLeg, 0, 39), 'PIN_LL')
        .appendField(Blockly.Msg.BLOCKS_COMMON_RIGHTLEG || 'right leg pin')
        .appendField(new Blockly.FieldNumber(pins.rightLeg, 0, 39), 'PIN_RL')
        .appendField(Blockly.Msg.BLOCKS_COMMON_LEFTFOOT || 'left foot pin')
        .appendField(new Blockly.FieldNumber(pins.leftFoot, 0, 39), 'PIN_LF')
        .appendField(Blockly.Msg.BLOCKS_COMMON_RIGHTFOOT || 'right foot pin')
        .appendField(new Blockly.FieldNumber(pins.rightFoot, 0, 39), 'PIN_RF')
        .appendField(Blockly.Msg.BLOCKS_BIPED_BUZZER_PIN || 'buzzer pin')
        .appendField(new Blockly.FieldNumber(buzzerPin, 0, 39), 'PIN_BUZZER');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BIPED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BIPED_INIT_TOOLTIP || 'Initialize DigiBiped biped robot (4 legs + buzzer)');
  }
};

javascriptGenerator.forBlock['biped_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');
  const pinBuzzer = block.getFieldValue('PIN_BUZZER');
  generator.definitions_['include_digibiped'] = '#include <DigiBiped.h>';
  generator.definitions_['biped_instance'] = 'DigiBiped biped;';
  // Phase B-3 (Session 146、E1 = pulse + speed + trim 3 軸統合): per-channel emit (default 値以外のみ、R1 invariant)。
  // 各 channel (index 0=LL, 1=RL, 2=LF, 3=RF) について getServo{PulseWidth,Speed,Trim}(pin) を呼び、
  // default 以外なら biped.setChannelPulseRange/MaxRate/Trim(i, ...) emit。
  // case 23 incident A (silent ignore cluster) 完全解消 = robot block 経由でも pulse/speed/trim が HW に到達。
  const pins = [pinLL, pinRL, pinLF, pinRF];
  const setupLines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const pinNum = parseInt(pins[i], 10);
    if (isNaN(pinNum)) continue;
    const pulse = getServoPulseWidth(pinNum);
    const speed = getServoSpeed(pinNum);
    const trim = getServoTrim(pinNum);
    if (pulse.min !== 500 || pulse.max !== 2400) {
      setupLines.push(`  biped.setChannelPulseRange(${i}, ${pulse.min}, ${pulse.max});`);
    }
    if (speed > 0) {
      setupLines.push(`  biped.setChannelMaxRate(${i}, ${speed});`);
    }
    if (trim !== 0) {
      setupLines.push(`  biped.setChannelTrim(${i}, ${trim});`);
    }
  }
  // init は最後 (setChannelPulseRange は attach 前必要、setMaxRate/setTrim は attach 後でも可だが
  // 設計上 init() 内で attach するため per-channel 設定を先行 = lib 側で reorder 吸収)。
  setupLines.push(`  biped.init(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF}, ${pinBuzzer});`);
  return setupLines.join('\n') + '\n';
};

// ===== biped_home_blocking =====
Blockly.Blocks['biped_home_blocking'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏠 ' + (Blockly.Msg.BLOCKS_BIPED_HOME_BLOCKING_LABEL || 'Biped Home (blocking)'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BIPED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BIPED_HOME_BLOCKING_TOOLTIP || 'Move biped to upright home position, blocks until done');
  }
};
javascriptGenerator.forBlock['biped_home_blocking'] = function() {
  return `  biped.homeBlocking();\n`;
};

// ===== biped_walk_blocking + biped_walk_async =====
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
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeWalkBlock('biped_walk_blocking',
  'BLOCKS_BIPED_WALK_BLOCKING_LABEL', 'Biped Walk (blocking)',
  'BLOCKS_BIPED_WALK_BLOCKING_TOOLTIP', 'Walk N steps, blocks until done');
makeWalkBlock('biped_walk_async',
  'BLOCKS_BIPED_WALK_ASYNC_LABEL', 'Biped Walk (async)',
  'BLOCKS_BIPED_WALK_ASYNC_TOOLTIP', 'Start walking N steps in background; use biped_wait_until_idle to barrier');

javascriptGenerator.forBlock['biped_walk_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  biped.walkBlocking(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_walk_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  biped.walkAsync(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};

// ===== biped_turn_blocking + biped_turn_async =====
function makeTurnBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('↻ ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', '1'],
            [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', '-1']
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
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeTurnBlock('biped_turn_blocking',
  'BLOCKS_BIPED_TURN_BLOCKING_LABEL', 'Biped Turn (blocking)',
  'BLOCKS_BIPED_TURN_BLOCKING_TOOLTIP', 'Turn N times, blocks until done');
makeTurnBlock('biped_turn_async',
  'BLOCKS_BIPED_TURN_ASYNC_LABEL', 'Biped Turn (async)',
  'BLOCKS_BIPED_TURN_ASYNC_TOOLTIP', 'Start turning in background');

javascriptGenerator.forBlock['biped_turn_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  biped.turnBlocking(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_turn_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  biped.turnAsync(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};

// ===== Simple times-only blocks (jump/dance/swing/moonwalk) blocking + async =====
function makeTimesBlock(blockType: string, emoji: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string, defaultTimes: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField(emoji + ' ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
  return defaultTimes;
}

makeTimesBlock('biped_jump_blocking', '⬆️',
  'BLOCKS_BIPED_JUMP_BLOCKING_LABEL', 'Biped Jump (blocking)',
  'BLOCKS_BIPED_JUMP_BLOCKING_TOOLTIP', 'Jump N times, blocks', '1');
makeTimesBlock('biped_jump_async', '⬆️',
  'BLOCKS_BIPED_JUMP_ASYNC_LABEL', 'Biped Jump (async)',
  'BLOCKS_BIPED_JUMP_ASYNC_TOOLTIP', 'Start jumping in background', '1');
makeTimesBlock('biped_dance_blocking', '💃',
  'BLOCKS_BIPED_DANCE_BLOCKING_LABEL', 'Biped Dance (blocking)',
  'BLOCKS_BIPED_DANCE_BLOCKING_TOOLTIP', 'Dance N cycles, blocks', '4');
makeTimesBlock('biped_dance_async', '💃',
  'BLOCKS_BIPED_DANCE_ASYNC_LABEL', 'Biped Dance (async)',
  'BLOCKS_BIPED_DANCE_ASYNC_TOOLTIP', 'Start dancing in background', '4');
makeTimesBlock('biped_swing_blocking', '〜',
  'BLOCKS_BIPED_SWING_BLOCKING_LABEL', 'Biped Swing (blocking)',
  'BLOCKS_BIPED_SWING_BLOCKING_TOOLTIP', 'Swing side-to-side N cycles, blocks', '2');
makeTimesBlock('biped_swing_async', '〜',
  'BLOCKS_BIPED_SWING_ASYNC_LABEL', 'Biped Swing (async)',
  'BLOCKS_BIPED_SWING_ASYNC_TOOLTIP', 'Start swinging in background', '2');

javascriptGenerator.forBlock['biped_jump_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '1';
  return `  biped.jumpBlocking(String(${steps}).toInt());\n`;
};
javascriptGenerator.forBlock['biped_jump_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '1';
  return `  biped.jumpAsync(String(${steps}).toInt());\n`;
};
javascriptGenerator.forBlock['biped_dance_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  return `  biped.danceBlocking(String(${steps}).toInt());\n`;
};
javascriptGenerator.forBlock['biped_dance_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  return `  biped.danceAsync(String(${steps}).toInt());\n`;
};
javascriptGenerator.forBlock['biped_swing_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  return `  biped.swingBlocking(String(${steps}).toInt());\n`;
};
javascriptGenerator.forBlock['biped_swing_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  return `  biped.swingAsync(String(${steps}).toInt());\n`;
};

// ===== biped_bend_{blocking,async} — left/right side =====
function makeBendBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('↔️ ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', 'left'],
            [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', 'right']
          ]), 'SIDE');
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_TIMES || 'times');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeBendBlock('biped_bend_blocking',
  'BLOCKS_BIPED_BEND_BLOCKING_LABEL', 'Biped Bend (blocking)',
  'BLOCKS_BIPED_BEND_BLOCKING_TOOLTIP', 'Bend left or right N times, blocks');
makeBendBlock('biped_bend_async',
  'BLOCKS_BIPED_BEND_ASYNC_LABEL', 'Biped Bend (async)',
  'BLOCKS_BIPED_BEND_ASYNC_TOOLTIP', 'Start bending in background');

javascriptGenerator.forBlock['biped_bend_blocking'] = function(block: Blockly.Block) {
  const side = block.getFieldValue('SIDE');
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '1';
  const sideArg = side === 'left' ? '0' : '1'; // DigiBiped::BEND_LEFT=0 / RIGHT=1 内部 enum
  return `  biped.bendBlocking(String(${steps}).toInt(), ${sideArg});\n`;
};
javascriptGenerator.forBlock['biped_bend_async'] = function(block: Blockly.Block) {
  const side = block.getFieldValue('SIDE');
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '1';
  const sideArg = side === 'left' ? '0' : '1';
  return `  biped.bendAsync(String(${steps}).toInt(), ${sideArg});\n`;
};

// ===== biped_moonwalk_{blocking,async} — right/left direction =====
function makeMoonwalkBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('🕺 ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_STEPS || 'steps')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_RIGHT || 'right', '1'],
            [Blockly.Msg.BLOCKS_COMMON_LEFT || 'left', '-1']
          ]), 'DIRECTION');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeMoonwalkBlock('biped_moonwalk_blocking',
  'BLOCKS_BIPED_MOONWALK_BLOCKING_LABEL', 'Biped Moonwalk (blocking)',
  'BLOCKS_BIPED_MOONWALK_BLOCKING_TOOLTIP', 'Moonwalk N steps, blocks');
makeMoonwalkBlock('biped_moonwalk_async',
  'BLOCKS_BIPED_MOONWALK_ASYNC_LABEL', 'Biped Moonwalk (async)',
  'BLOCKS_BIPED_MOONWALK_ASYNC_TOOLTIP', 'Start moonwalking in background');

javascriptGenerator.forBlock['biped_moonwalk_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  return `  biped.moonwalkBlocking(String(${steps}).toInt(), ${direction});\n`;
};
javascriptGenerator.forBlock['biped_moonwalk_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  return `  biped.moonwalkAsync(String(${steps}).toInt(), ${direction});\n`;
};

// ===== biped_gesture — DigiCode 独自 gesture set (D-new-1a、§1-7.2、OttoDIYLib 由来 0) =====
// 14 candidate 全件、Phase E 実機評価 → user fine-tune iteration (D-new-1a 確定方針)
Blockly.Blocks['biped_gesture'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('😊 ' + (Blockly.Msg.BLOCKS_BIPED_GESTURE_LABEL || 'Biped Gesture'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_GREETING || 'Greeting', 'GESTURE_GREETING'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_ACKNOWLEDGE || 'Acknowledge', 'GESTURE_ACKNOWLEDGE'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_YES || 'Yes', 'GESTURE_YES'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_NO || 'No', 'GESTURE_NO'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_CURIOSITY || 'Curiosity', 'GESTURE_CURIOSITY'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_SEARCH || 'Search', 'GESTURE_SEARCH'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_IDLE_BREATHING || 'Idle Breathing', 'GESTURE_IDLE_BREATHING'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_CHEER || 'Cheer', 'GESTURE_CHEER'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_THINKING || 'Thinking', 'GESTURE_THINKING'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_SURPRISE || 'Surprise', 'GESTURE_SURPRISE'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_SLEEPY || 'Sleepy', 'GESTURE_SLEEPY'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_WAKEUP || 'Wake Up', 'GESTURE_WAKEUP'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_CONFIRMATION || 'Confirmation', 'GESTURE_CONFIRMATION'],
          [Blockly.Msg.BLOCKS_BIPED_GESTURE_ERROR_ALERT || 'Error Alert', 'GESTURE_ERROR_ALERT']
        ]), 'GESTURE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BIPED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BIPED_GESTURE_TOOLTIP || 'Play DigiCode-original gesture (motion + sound combo, intent-based naming, no OttoDIYLib derivation)');
  }
};

javascriptGenerator.forBlock['biped_gesture'] = function(block: Blockly.Block) {
  const gesture = block.getFieldValue('GESTURE');
  return `  biped.playGesture(${gesture}, millis());\n`;
};

// ===== biped_is_idle (value block) =====
Blockly.Blocks['biped_is_idle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('❓ ' + (Blockly.Msg.BLOCKS_BIPED_IS_IDLE_LABEL || 'Biped is idle?'));
    this.setOutput(true, 'Boolean');
    this.setColour(BIPED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BIPED_IS_IDLE_TOOLTIP || 'Returns true if biped is idle (no async motion running)');
  }
};
javascriptGenerator.forBlock['biped_is_idle'] = function() {
  return [`biped.isIdle()`, generator.ORDER_FUNCTION_CALL];
};

// ===== biped_wait_until_idle =====
Blockly.Blocks['biped_wait_until_idle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏳ ' + (Blockly.Msg.BLOCKS_BIPED_WAIT_UNTIL_IDLE_LABEL || 'Wait until biped idle'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(BIPED_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_BIPED_WAIT_UNTIL_IDLE_TOOLTIP || 'Block until biped async motion completes (barrier for IoT loop coexistence)');
  }
};
javascriptGenerator.forBlock['biped_wait_until_idle'] = function() {
  return `  biped.waitUntilIdle();\n`;
};

export {}; // module marker
