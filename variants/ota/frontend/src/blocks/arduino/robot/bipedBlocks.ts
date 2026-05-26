/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiBiped (二足歩行ロボット) Blockly Blocks — Phase X-2 commit 1 (Session 152、
 *   Q-D/Q-H=i 確定後の lib actual API match)
 *
 * Founding use case (case 22 anchor): 等身大 Humanoid のサーボ速度制御 + ギヤ保護 + IoT 共存。
 * 旧 humanoidBlocks.ts (DigiCodeHumanoid lib = OttoDIYLib derivation、case 23 incident E) を完全置換。
 *
 * 新 lib (DigiBiped、AGPL-3.0、Layer 5、DigiMotion 依存) の API consumer。 Phase X-2 commit 1 で
 * generator emit を lib actual signature に揃え:
 *   - biped_init: concrete ServoChannel180 × 4 instance + attachChannels + 0-arg init() + buzzer
 *     attach (IBuzzer& getBuzzer() reference 経由、 anonymous namespace DigiBuzzer concrete 維持)
 *   - walk/turn Async/Blocking: 3-arg + millis() for async (lib `(steps, direction, speed[, nowMs])`)
 *   - jump: lib `jumpBlocking(speed)` 1-arg / `jumpAsync(speed, nowMs)` 2-arg = UI から STEPS field 廃止、
 *     SPEED dropdown のみ (Q-H=i UI semantic 変更)
 *   - dance/swing: lib `<Blocking>(cycles, speed)` 2-arg / `<Async>(cycles, speed, nowMs)` 3-arg
 *     = UI から SPEED dropdown 追加 (CYCLES は既存 STEPS field を再利用、 label "times" 維持)
 *   - bend: lib `bendBlocking(direction, speed)` 2-arg / `bendAsync(direction, speed, nowMs)` 3-arg
 *     = UI を SIDE → DIRECTION (±1) に rename、 STEPS field 廃止、 SPEED dropdown 追加 (Q-H=i)
 *   - moonwalk: lib `moonwalkBlocking(cycles, speed)` 2-arg / `moonwalkAsync(cycles, speed, nowMs)` 3-arg
 *     = UI から DIRECTION dropdown 廃止 (lib に direction 不在)、 STEPS field を再利用 (label "cycles" 解釈)、
 *     SPEED dropdown 追加 (Q-H=i)
 *   - gesture: ✅ 既存 emit match (`playGesture(GestureId, millis())`)
 *   - is_idle / wait_until_idle: ✅ 既存 emit match
 *
 * D8 (Session 139 settled): walk() 廃止、 walk{Blocking,Async} で意味明示。
 * E1 (3 軸 per-channel emit、 Phase B-3): default 値以外のみ setChannelPulseRange/MaxRate/Trim emit、
 * R1 invariant 維持 (default 時 byte-identical pre-Phase B-3、 ただし init() signature 変更で
 * pre-X-2 と byte-identical ではない、 Q-H=i confirmed)。
 * rule 16 §D1: 全 init / consumer block generator 先頭に emits: / requires: comment 追記。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getHumanoidPins, getPinFromPreset, getServoPulseWidth, getServoSpeed, getServoTrim, getServoReverse } from '@/utils/pinHelper';

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
  // rule 16 §D1: emits/requires comment + DigiMotion.h umbrella 経由 (Phase X-1 expand) +
  // DigiBiped.h Layer 5 lib include
  generator.definitions_['include_digimotion'] = '#include <DigiMotion.h>';
  generator.definitions_['include_digibiped'] = '#include <DigiBiped.h>';
  generator.definitions_['biped_channels'] = `/* emits: _bipedCh0..3 (ServoChannel180), biped (DigiBiped), buzzer (IBuzzer&) */
ServoChannel180 _bipedCh0(${pinLL});
ServoChannel180 _bipedCh1(${pinRL});
ServoChannel180 _bipedCh2(${pinLF});
ServoChannel180 _bipedCh3(${pinRF});
DigiBiped biped;
IBuzzer& buzzer = getBuzzer();`;

  // setup() body: attachChannels + 0-arg init() + buzzer attach + biped.attachBuzzer
  // Phase B-3 (E1) 3 軸 per-channel emit (default 以外のみ、 R1 invariant、 attach 前 emit が必要)
  const pins = [pinLL, pinRL, pinLF, pinRF];
  const setupLines: string[] = [];
  for (let i = 0; i < 4; i++) {
    const pinNum = parseInt(pins[i], 10);
    if (isNaN(pinNum)) continue;
    const pulse = getServoPulseWidth(pinNum);
    const speed = getServoSpeed(pinNum);
    const trim = getServoTrim(pinNum);
    const reverse = getServoReverse(pinNum);
    // attachChannels の前に setChannel* を呼ぶことで attach() 内 _writeHw が trim 反映済 state で書込
    // ただし lib actual: setChannel* は channelAt(idx) 経由で _channels[i] にアクセス、 attachChannels
    // 前は _channels[i]=nullptr で no-op = setChannel* は attachChannels の後で emit する
    if (pulse.min !== 500 || pulse.max !== 2400) {
      setupLines.push(`  biped.setChannelPulseRange(${i}, ${pulse.min}, ${pulse.max});`);
    }
    if (speed > 0) {
      setupLines.push(`  biped.setChannelMaxRate(${i}, ${speed});`);
    }
    if (trim !== 0) {
      setupLines.push(`  biped.setChannelTrim(${i}, ${trim});`);
    }
    // Phase 3-D (Session 156、4 軸統合、R1 invariant): reverse===true 時のみ emit
    if (reverse) {
      setupLines.push(`  biped.setChannelReverse(${i}, true);`);
    }
  }

  // Phase F-2 (Session 157): pump 経路 dead 解消 = case 22 founding use case ギヤ保護
  // (= setChannelMaxRate rate-limited movement) 前提復活。 capi lib Phase F-1 で全 6 channel
  // attach 内 registerPumpable(this) 追加済 = frontend で `getBackgroundPump().start();` emit
  // 追加で digiMotionPump task 起動、 + loopPre `biped.tick(millis());` で async motion 完了 path 確立。
  // 順序: attachChannels → setChannel* (4 軸) → init() (= 内部で channel.attach + register) →
  //       buzzer attach + biped.attachBuzzer → getBackgroundPump().start() (= task 起動)
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['biped_tick'] = '  biped.tick(millis());';
  // Phase F-6a (Session 157、 サーボピクつき真因 2 解消 = boot 時 GPIO floating 抑制):
  // attach (= LEDC channel attach) 前に pinMode(OUTPUT) + digitalWrite(LOW) を emit。
  // boot 直後の ENFORCE_PINS 許可 list 内 strapping pin (0/2/12/15) を含む全 servo pin の
  // floating を LOW 確定で抑制、 続く LEDC channel attach (= biped.init() 内 channel.attach())
  // で PWM 制御へ移行。 真因 1 (Phase F-5 attach 内 _writeHw 削除) と組合せで founding use case
  // ピクつき構造的解消。 改定log §156 §19.A Part B + 深掘り 2 verbatim 対応。
  const allLines = [
    `  pinMode(${pinLL}, OUTPUT); digitalWrite(${pinLL}, LOW);`,
    `  pinMode(${pinRL}, OUTPUT); digitalWrite(${pinRL}, LOW);`,
    `  pinMode(${pinLF}, OUTPUT); digitalWrite(${pinLF}, LOW);`,
    `  pinMode(${pinRF}, OUTPUT); digitalWrite(${pinRF}, LOW);`,
    '  biped.attachChannels(&_bipedCh0, &_bipedCh1, &_bipedCh2, &_bipedCh3);',
    ...setupLines,
    '  biped.init();',
    `  buzzer.attach(${pinBuzzer});`,
    '  biped.attachBuzzer(&buzzer);',
    '  getBackgroundPump().start();',
  ];
  return allLines.join('\n') + '\n';
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
  return `  /* requires: biped */ biped.homeBlocking();\n`;
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
  return `  /* requires: biped */ biped.walkBlocking(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_walk_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.walkAsync(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
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
  return `  /* requires: biped */ biped.turnBlocking(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_turn_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.turnAsync(String(${steps}).toInt(), ${direction}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== biped_jump_{blocking,async} — lib 1-arg (speed) / 2-arg (speed, millis) =====
// Q-H=i UI semantic 変更: 旧 STEPS valueInput を廃止、 SPEED dropdown のみ
function makeJumpBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('⬆️ ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', 'fast'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', 'normal'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', 'slow']
          ]), 'SPEED');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeJumpBlock('biped_jump_blocking',
  'BLOCKS_BIPED_JUMP_BLOCKING_LABEL', 'Biped Jump (blocking)',
  'BLOCKS_BIPED_JUMP_BLOCKING_TOOLTIP', 'Jump at selected speed (deg/sec), blocks until done');
makeJumpBlock('biped_jump_async',
  'BLOCKS_BIPED_JUMP_ASYNC_LABEL', 'Biped Jump (async)',
  'BLOCKS_BIPED_JUMP_ASYNC_TOOLTIP', 'Start jumping at selected speed in background');

javascriptGenerator.forBlock['biped_jump_blocking'] = function(block: Blockly.Block) {
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.jumpBlocking(${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_jump_async'] = function(block: Blockly.Block) {
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.jumpAsync(${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== biped_dance_{blocking,async} / biped_swing_{blocking,async} — lib 2-arg (cycles, speed) =====
// Q-H=i: 既存 STEPS valueInput は cycle count 解釈で再利用、 SPEED dropdown を追加
function makeCycleSpeedBlock(blockType: string, emoji: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
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
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeCycleSpeedBlock('biped_dance_blocking', '💃',
  'BLOCKS_BIPED_DANCE_BLOCKING_LABEL', 'Biped Dance (blocking)',
  'BLOCKS_BIPED_DANCE_BLOCKING_TOOLTIP', 'Dance N cycles at selected speed, blocks');
makeCycleSpeedBlock('biped_dance_async', '💃',
  'BLOCKS_BIPED_DANCE_ASYNC_LABEL', 'Biped Dance (async)',
  'BLOCKS_BIPED_DANCE_ASYNC_TOOLTIP', 'Start dancing in background');
makeCycleSpeedBlock('biped_swing_blocking', '〜',
  'BLOCKS_BIPED_SWING_BLOCKING_LABEL', 'Biped Swing (blocking)',
  'BLOCKS_BIPED_SWING_BLOCKING_TOOLTIP', 'Swing side-to-side N cycles, blocks');
makeCycleSpeedBlock('biped_swing_async', '〜',
  'BLOCKS_BIPED_SWING_ASYNC_LABEL', 'Biped Swing (async)',
  'BLOCKS_BIPED_SWING_ASYNC_TOOLTIP', 'Start swinging in background');

javascriptGenerator.forBlock['biped_dance_blocking'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.danceBlocking(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_dance_async'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '4';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.danceAsync(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)}, millis());\n`;
};
javascriptGenerator.forBlock['biped_swing_blocking'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.swingBlocking(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_swing_async'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.swingAsync(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== biped_bend_{blocking,async} — lib 2-arg (direction, speed) =====
// Q-H=i: 旧 SIDE dropdown ('left'/'right') を DIRECTION dropdown ('1'/'-1') に rename、
// STEPS valueInput を廃止 (lib に cycle count 不在)、 SPEED dropdown を追加
function makeBendBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('↔️ ' + (Blockly.Msg[labelKey] || labelFallback))
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
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeBendBlock('biped_bend_blocking',
  'BLOCKS_BIPED_BEND_BLOCKING_LABEL', 'Biped Bend (blocking)',
  'BLOCKS_BIPED_BEND_BLOCKING_TOOLTIP', 'Bend left or right at selected speed, blocks');
makeBendBlock('biped_bend_async',
  'BLOCKS_BIPED_BEND_ASYNC_LABEL', 'Biped Bend (async)',
  'BLOCKS_BIPED_BEND_ASYNC_TOOLTIP', 'Start bending in background');

javascriptGenerator.forBlock['biped_bend_blocking'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.bendBlocking(${direction}, ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_bend_async'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.bendAsync(${direction}, ${speedToDegPerSec(speedSlot)}, millis());\n`;
};

// ===== biped_moonwalk_{blocking,async} — lib 2-arg (cycles, speed) =====
// Q-H=i: 旧 DIRECTION dropdown を廃止 (lib に direction 不在)、 STEPS valueInput を cycle count 解釈で
// 再利用、 SPEED dropdown を追加
function makeMoonwalkBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('🕺 ' + (Blockly.Msg[labelKey] || labelFallback));
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
      this.setColour(BIPED_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeMoonwalkBlock('biped_moonwalk_blocking',
  'BLOCKS_BIPED_MOONWALK_BLOCKING_LABEL', 'Biped Moonwalk (blocking)',
  'BLOCKS_BIPED_MOONWALK_BLOCKING_TOOLTIP', 'Moonwalk N cycles at selected speed, blocks');
makeMoonwalkBlock('biped_moonwalk_async',
  'BLOCKS_BIPED_MOONWALK_ASYNC_LABEL', 'Biped Moonwalk (async)',
  'BLOCKS_BIPED_MOONWALK_ASYNC_TOOLTIP', 'Start moonwalking in background');

javascriptGenerator.forBlock['biped_moonwalk_blocking'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.moonwalkBlocking(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)});\n`;
};
javascriptGenerator.forBlock['biped_moonwalk_async'] = function(block: Blockly.Block) {
  const cycles = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '2';
  const speedSlot = block.getFieldValue('SPEED');
  return `  /* requires: biped */ biped.moonwalkAsync(String(${cycles}).toInt(), ${speedToDegPerSec(speedSlot)}, millis());\n`;
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
  return `  /* requires: biped */ biped.playGesture(${gesture}, millis());\n`;
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
  return [`/* requires: biped */ biped.isIdle()`, generator.ORDER_FUNCTION_CALL];
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
  return `  /* requires: biped */ biped.waitUntilIdle();\n`;
};

export {}; // module marker
