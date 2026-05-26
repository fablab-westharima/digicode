/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiRover (車輪ロボット) Blockly Blocks — Phase X-2 commit 1 (Session 152、
 *   Q-D=A 確定後の lib actual API match)
 *
 * 旧 wheelBlocks.ts (DigiCodeWheel = 連続回転 servo only) を完全置換、
 * 加えて旧 lib に存在したが Blockly 経路非露出だった「DC motor mode (4-pin H-bridge)」を
 * 新規 block (rover_init_dc_motor) で expose (T2 verbatim、case 19 dead-code-by-default 解消)。
 *
 * mode 別 init で意図明示:
 *   - rover_init_servo: 連続回転 servo × 2 (左右輪、PWM duty for velocity) = ContinuousServoChannel × 2
 *   - rover_init_dc_motor: DC motor × 2 + L298N 等 H-bridge (4-pin: 各 motor の forward + reverse)
 *     = DcMotorChannel × 2 instance (Phase X-1.5 Q-D=A refactor: lib signature `initDcMotorMode(
 *       DcMotorChannel* left, DcMotorChannel* right)` 2-arg、 単方向 PWM slot から完全 H-bridge motor
 *       per instance へ変更)
 *
 * D8 (実用上即時 velocity command なので blocking semantic 不要)、isMoving query 追加。
 * rule 16 §D1: 全 init / consumer block generator 先頭に emits: / requires: comment 追記。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getWheelPins, getMotorPins, getServoPulseWidth, getServoSpeed, getServoTrim, getServoReverse } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const ROVER_COLOR = '#4CAF50';

// ===== rover_init_servo (2-pin 連続回転 servo) =====
Blockly.Blocks['rover_init_servo'] = {
  init: function() {
    const pins = getWheelPins();
    this.appendDummyInput()
        .appendField('🚗 ' + (Blockly.Msg.BLOCKS_ROVER_INIT_SERVO_LABEL || 'Rover Init (Servo mode)'))
        .appendField(Blockly.Msg.BLOCKS_ROVER_LEFT_PIN || 'Left wheel pin')
        .appendField(new Blockly.FieldNumber(pins.left, 0, 39), 'PIN_L')
        .appendField(Blockly.Msg.BLOCKS_ROVER_RIGHT_PIN || 'Right wheel pin')
        .appendField(new Blockly.FieldNumber(pins.right, 0, 39), 'PIN_R');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ROVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ROVER_INIT_SERVO_TOOLTIP || 'Initialize rover with 2 continuous-rotation servos (PWM velocity)');
  }
};
javascriptGenerator.forBlock['rover_init_servo'] = function(block: Blockly.Block) {
  const pinL = block.getFieldValue('PIN_L');
  const pinR = block.getFieldValue('PIN_R');
  generator.definitions_['include_digimotion'] = '#include <DigiMotion.h>';
  generator.definitions_['include_digirover'] = '#include <DigiRover.h>';
  generator.definitions_['rover_channels'] = `/* emits: _roverChL, _roverChR (ContinuousServoChannel), rover (DigiRover) */
ContinuousServoChannel _roverChL(${pinL});
ContinuousServoChannel _roverChR(${pinR});
DigiRover rover;`;

  // Phase B-3 (E1) 連続回転 servo (2 channel) 3 軸 per-channel emit (default 以外のみ、 R1 invariant)。
  // Phase 3-D (Session 156): + reverse 軸 (4 軸統合)、 同 R1 invariant pattern。
  const pins = [pinL, pinR];
  const setupLines: string[] = [];
  for (let i = 0; i < 2; i++) {
    const pinNum = parseInt(pins[i], 10);
    if (isNaN(pinNum)) continue;
    const pulse = getServoPulseWidth(pinNum);
    const speed = getServoSpeed(pinNum);
    const trim = getServoTrim(pinNum);
    const reverse = getServoReverse(pinNum);
    if (pulse.min !== 500 || pulse.max !== 2400) {
      setupLines.push(`  rover.setChannelPulseRange(${i}, ${pulse.min}, ${pulse.max});`);
    }
    if (speed > 0) {
      setupLines.push(`  rover.setChannelMaxRate(${i}, ${speed});`);
    }
    if (trim !== 0) {
      setupLines.push(`  rover.setChannelTrim(${i}, ${trim});`);
    }
    if (reverse) {
      setupLines.push(`  rover.setChannelReverse(${i}, true);`);
    }
  }

  // Phase F-2 (Session 157): pump 経路 dead 解消 = ContinuousServoChannel.pump 経路復活、
  // velocity command (forward/backward/turnLeft/etc.) の HW write 発動 path 確立。
  // DigiRover に tick() 不在のため loopPre 不要、 getBackgroundPump().start() のみで充分。
  // Phase F-6a (Session 157、 サーボピクつき真因 2 解消): attach 前 GPIO LOW 抑制 = 2 servo pin。
  const allLines = [
    `  pinMode(${pinL}, OUTPUT); digitalWrite(${pinL}, LOW);`,
    `  pinMode(${pinR}, OUTPUT); digitalWrite(${pinR}, LOW);`,
    '  rover.initServoMode(&_roverChL, &_roverChR);',
    ...setupLines,
    '  getBackgroundPump().start();',
  ];
  return allLines.join('\n') + '\n';
};

// ===== rover_init_dc_motor (4-pin DC motor mode、 Q-D=A Phase X-1.5 refactor) =====
// lib signature: `initDcMotorMode(DcMotorChannel* left, DcMotorChannel* right)` 2-arg、 各 DcMotorChannel
// は forward + reverse pin の完全 H-bridge motor。
Blockly.Blocks['rover_init_dc_motor'] = {
  init: function() {
    const m = getMotorPins();
    this.appendDummyInput()
        .appendField('🚙 ' + (Blockly.Msg.BLOCKS_ROVER_INIT_DC_LABEL || 'Rover Init (DC motor mode)'))
        .appendField(Blockly.Msg.BLOCKS_ROVER_DC_L_IN1 || 'L IN1')
        .appendField(new Blockly.FieldNumber(m.aIn1, 0, 39), 'PIN_LA')
        .appendField(Blockly.Msg.BLOCKS_ROVER_DC_L_IN2 || 'L IN2')
        .appendField(new Blockly.FieldNumber(m.aIn2, 0, 39), 'PIN_LB');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ROVER_DC_R_IN1 || 'R IN1')
        .appendField(new Blockly.FieldNumber(m.bIn1, 0, 39), 'PIN_RA')
        .appendField(Blockly.Msg.BLOCKS_ROVER_DC_R_IN2 || 'R IN2')
        .appendField(new Blockly.FieldNumber(m.bIn2, 0, 39), 'PIN_RB');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(ROVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ROVER_INIT_DC_TOOLTIP || 'Initialize rover with 2 DC motors via H-bridge driver (each motor uses 2 GPIO pins for forward + reverse)');
  }
};
javascriptGenerator.forBlock['rover_init_dc_motor'] = function(block: Blockly.Block) {
  const pinLA = block.getFieldValue('PIN_LA');
  const pinLB = block.getFieldValue('PIN_LB');
  const pinRA = block.getFieldValue('PIN_RA');
  const pinRB = block.getFieldValue('PIN_RB');
  generator.definitions_['include_digimotion'] = '#include <DigiMotion.h>';
  generator.definitions_['include_digirover'] = '#include <DigiRover.h>';
  generator.definitions_['rover_channels'] = `/* emits: _roverMotorL, _roverMotorR (DcMotorChannel), rover (DigiRover) */
DcMotorChannel _roverMotorL(${pinLA}, ${pinLB});
DcMotorChannel _roverMotorR(${pinRA}, ${pinRB});
DigiRover rover;`;
  // Phase B-3 per-channel emit は servo mode のみ (DcMotorChannel.setTrim は deadband %、
  // pinPresetStore の degree-based trim と semantic 不一致のため post-release polish 候補)。
  // Phase F-2 (Session 157): pump 経路 dead 解消 = DcMotorChannel.pump 経路復活、 velocity command
  // の HW write 発動 path 確立。 DigiRover に tick() 不在のため loopPre 不要。
  // Phase F-6a (Session 157、 サーボピクつき真因 2 解消 = motor brake glitch 緩和): attach 前
  // GPIO LOW 抑制 = 4 motor pin (LA/LB/RA/RB)、 ledcAttach 前の floating 抑制で boot 時 H-bridge
  // motor の意図しない初動防止 (= 主要 risk は 2 pin 同時 HIGH = motor short、 LOW 強制で安全側)。
  return [
    `  pinMode(${pinLA}, OUTPUT); digitalWrite(${pinLA}, LOW);`,
    `  pinMode(${pinLB}, OUTPUT); digitalWrite(${pinLB}, LOW);`,
    `  pinMode(${pinRA}, OUTPUT); digitalWrite(${pinRA}, LOW);`,
    `  pinMode(${pinRB}, OUTPUT); digitalWrite(${pinRB}, LOW);`,
    '  rover.initDcMotorMode(&_roverMotorL, &_roverMotorR);',
    '  getBackgroundPump().start();',
  ].join('\n') + '\n';
};

// ===== rover_forward / backward (speed dropdown、即時) =====
function makeRoverDirBlock(blockType: string, emoji: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField(emoji + ' ' + (Blockly.Msg[labelKey] || labelFallback))
          .appendField(Blockly.Msg.BLOCKS_COMMON_SPEED || 'speed')
          .appendField(new Blockly.FieldDropdown([
            [Blockly.Msg.BLOCKS_COMMON_SPEEDFAST || 'fast', '100'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDNORMAL || 'normal', '50'],
            [Blockly.Msg.BLOCKS_COMMON_SPEEDSLOW || 'slow', '30']
          ]), 'SPEED');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ROVER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeRoverDirBlock('rover_forward', '⬆️',
  'BLOCKS_ROVER_FORWARD_LABEL', 'Rover Forward',
  'BLOCKS_ROVER_FORWARD_TOOLTIP', 'Move forward at speed %');
makeRoverDirBlock('rover_backward', '⬇️',
  'BLOCKS_ROVER_BACKWARD_LABEL', 'Rover Backward',
  'BLOCKS_ROVER_BACKWARD_TOOLTIP', 'Move backward at speed %');

javascriptGenerator.forBlock['rover_forward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `  /* requires: rover */ rover.forward(${speed});\n`;
};
javascriptGenerator.forBlock['rover_backward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `  /* requires: rover */ rover.backward(${speed});\n`;
};

// ===== rover_turn_{left,right} / rover_spin_{left,right} (即時、no params) =====
function makeRoverSimpleBlock(blockType: string, emoji: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField(emoji + ' ' + (Blockly.Msg[labelKey] || labelFallback));
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(ROVER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeRoverSimpleBlock('rover_turn_left', '↰',
  'BLOCKS_ROVER_TURN_LEFT_LABEL', 'Rover Turn Left',
  'BLOCKS_ROVER_TURN_LEFT_TOOLTIP', 'Turn left (one wheel slower)');
makeRoverSimpleBlock('rover_turn_right', '↱',
  'BLOCKS_ROVER_TURN_RIGHT_LABEL', 'Rover Turn Right',
  'BLOCKS_ROVER_TURN_RIGHT_TOOLTIP', 'Turn right (one wheel slower)');
makeRoverSimpleBlock('rover_spin_left', '↶',
  'BLOCKS_ROVER_SPIN_LEFT_LABEL', 'Rover Spin Left',
  'BLOCKS_ROVER_SPIN_LEFT_TOOLTIP', 'Spin left in place (wheels opposite direction)');
makeRoverSimpleBlock('rover_spin_right', '↷',
  'BLOCKS_ROVER_SPIN_RIGHT_LABEL', 'Rover Spin Right',
  'BLOCKS_ROVER_SPIN_RIGHT_TOOLTIP', 'Spin right in place');
makeRoverSimpleBlock('rover_stop', '⏹',
  'BLOCKS_ROVER_STOP_LABEL', 'Rover Stop',
  'BLOCKS_ROVER_STOP_TOOLTIP', 'Stop both wheels');

javascriptGenerator.forBlock['rover_turn_left'] = function() { return `  /* requires: rover */ rover.turnLeft(50);\n`; };
javascriptGenerator.forBlock['rover_turn_right'] = function() { return `  /* requires: rover */ rover.turnRight(50);\n`; };
javascriptGenerator.forBlock['rover_spin_left'] = function() { return `  /* requires: rover */ rover.spinLeft(50);\n`; };
javascriptGenerator.forBlock['rover_spin_right'] = function() { return `  /* requires: rover */ rover.spinRight(50);\n`; };
javascriptGenerator.forBlock['rover_stop'] = function() { return `  /* requires: rover */ rover.stop();\n`; };

// ===== rover_is_moving (value) =====
Blockly.Blocks['rover_is_moving'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('❓ ' + (Blockly.Msg.BLOCKS_ROVER_IS_MOVING_LABEL || 'Rover is moving?'));
    this.setOutput(true, 'Boolean');
    this.setColour(ROVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ROVER_IS_MOVING_TOOLTIP || 'Returns true if rover wheels are currently driven');
  }
};
javascriptGenerator.forBlock['rover_is_moving'] = function() {
  return [`/* requires: rover */ rover.isMoving()`, generator.ORDER_FUNCTION_CALL];
};

export {};
