/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * DigiRover (車輪ロボット) Blockly Blocks — Phase B-2 (Session 146)
 *
 * 旧 wheelBlocks.ts (DigiCodeWheel = 連続回転 servo only) を完全置換、
 * 加えて旧 lib に存在したが Blockly 経路非露出だった「DC motor mode (4-pin H-bridge)」を
 * 新規 block (rover_init_dc_motor) で expose (T2 verbatim、case 19 dead-code-by-default 解消)。
 *
 * mode 別 init で意図明示:
 *   - rover_init_servo: 連続回転 servo × 2 (左右輪、PWM duty for velocity)
 *   - rover_init_dc_motor: DC motor × 2 + L298N 等 H-bridge (4-pin: 各輪 In1 + In2)
 *
 * D8 (実用上即時 velocity command なので blocking semantic 不要)、isMoving query 追加。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getWheelPins, getMotorPins, getServoPulseWidth, getServoSpeed, getServoTrim } from '@/utils/pinHelper';

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
  generator.definitions_['include_digirover'] = '#include <DigiRover.h>';
  generator.definitions_['rover_instance'] = 'DigiRover rover;';
  // Phase B-3 (Session 146、E1): 連続回転 servo (2 channel) 3 軸 per-channel emit (default 以外のみ、R1)。
  // continuous-rotation servo: pulse range は通常 default、speed (= acceleration %/sec)、trim (= 90° stop center からの shift)。
  const pins = [pinL, pinR];
  const setupLines: string[] = [];
  for (let i = 0; i < 2; i++) {
    const pinNum = parseInt(pins[i], 10);
    if (isNaN(pinNum)) continue;
    const pulse = getServoPulseWidth(pinNum);
    const speed = getServoSpeed(pinNum);
    const trim = getServoTrim(pinNum);
    if (pulse.min !== 500 || pulse.max !== 2400) {
      setupLines.push(`  rover.setChannelPulseRange(${i}, ${pulse.min}, ${pulse.max});`);
    }
    if (speed > 0) {
      setupLines.push(`  rover.setChannelMaxRate(${i}, ${speed});`);
    }
    if (trim !== 0) {
      setupLines.push(`  rover.setChannelTrim(${i}, ${trim});`);
    }
  }
  setupLines.push(`  rover.initServoMode(${pinL}, ${pinR});`);
  return setupLines.join('\n') + '\n';
};

// ===== rover_init_dc_motor (4-pin DC motor mode、case 19 dead-code 露出) =====
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
    this.setTooltip(Blockly.Msg.BLOCKS_ROVER_INIT_DC_TOOLTIP || 'Initialize rover with 2 DC motors via L298N-style H-bridge (4 GPIO pins)');
  }
};
javascriptGenerator.forBlock['rover_init_dc_motor'] = function(block: Blockly.Block) {
  const pinLA = block.getFieldValue('PIN_LA');
  const pinLB = block.getFieldValue('PIN_LB');
  const pinRA = block.getFieldValue('PIN_RA');
  const pinRB = block.getFieldValue('PIN_RB');
  generator.definitions_['include_digirover'] = '#include <DigiRover.h>';
  generator.definitions_['rover_instance'] = 'DigiRover rover;';
  return `  rover.initDcMotorMode(${pinLA}, ${pinLB}, ${pinRA}, ${pinRB});\n`;
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
  return `  rover.forward(${speed});\n`;
};
javascriptGenerator.forBlock['rover_backward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  return `  rover.backward(${speed});\n`;
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

javascriptGenerator.forBlock['rover_turn_left'] = function() { return `  rover.turnLeft(50);\n`; };
javascriptGenerator.forBlock['rover_turn_right'] = function() { return `  rover.turnRight(50);\n`; };
javascriptGenerator.forBlock['rover_spin_left'] = function() { return `  rover.spinLeft(50);\n`; };
javascriptGenerator.forBlock['rover_spin_right'] = function() { return `  rover.spinRight(50);\n`; };
javascriptGenerator.forBlock['rover_stop'] = function() { return `  rover.stop();\n`; };

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
  return [`rover.isMoving()`, generator.ORDER_FUNCTION_CALL];
};

export {};
