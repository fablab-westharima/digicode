/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * Stepper Blocks (Unified) — Phase B-2 (Session 146、60.md §1 verbatim)
 *
 * 旧 3 file (stepperBlocks.ts uln2003 path / stepperDriverBlocks.ts a4988 path / 旧 stepper_init 等) を
 * DigiMotion StepperPollChannel + StepperHwChannel (D9 = FastAccelStepper、MIT) 経由に統合。
 *
 * 12 block 統合構成 (59.md §1-1 マッピング表):
 *   - stepper_init_4wire (ULN2003 + 28BYJ-48、FULL4WIRE mode、AccelStepper backed)
 *   - stepper_init_driver (A4988/DRV8825、DRIVER mode、AccelStepper backed)
 *   - stepper_init_hw (D9 FastAccelStepper HW peripheral、RMT/MCPWM、200 kHz target)
 *   - stepper_set_microstep (driver mode 用、HW MS1-3 pin と連動必要)
 *   - stepper_set_direction (driver mode 用、step 符号で表現)
 *   - stepper_set_speed (max speed 単位 step/sec)
 *   - stepper_step_{blocking,async} (signed step delta)
 *   - stepper_rotate_{blocking,async} (degree → step 変換 runtime)
 *   - stepper_stop (即時)
 *   - stepper_is_at_target (value)
 *   - stepper_get_position (value)
 *   - stepper_wait_until_target (barrier)
 *
 * 単一 stepperCh instance 前提 (case 19 axis 2 G-pattern first-wins guard で multi-init silent 上書き防御)。
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getStepperPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const STEPPER_COLOR = '#795548';

function ensureStepperInclude(): void {
  generator.definitions_['include_digimotion'] = '#include <DigiMotion.h>';
  generator.definitions_['stepper_channel_decl'] = 'IActuatorChannel* stepperCh = nullptr;';
}

// ===== stepper_init_4wire (ULN2003 + 28BYJ-48) =====
Blockly.Blocks['stepper_init_4wire'] = {
  init: function() {
    const pins = getStepperPins();
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_STEPPER_INIT_4WIRE_LABEL || 'Stepper Init (4-wire ULN2003)'));
    this.appendDummyInput()
        .appendField('IN1').appendField(new Blockly.FieldNumber(pins.in1, 0, 39), 'IN1')
        .appendField('IN2').appendField(new Blockly.FieldNumber(pins.in2, 0, 39), 'IN2');
    this.appendDummyInput()
        .appendField('IN3').appendField(new Blockly.FieldNumber(pins.in3, 0, 39), 'IN3')
        .appendField('IN4').appendField(new Blockly.FieldNumber(pins.in4, 0, 39), 'IN4');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_INIT_4WIRE_TOOLTIP || 'Initialize stepper with ULN2003 driver (28BYJ-48 motor, FULL4WIRE mode, AccelStepper backed)');
  }
};
javascriptGenerator.forBlock['stepper_init_4wire'] = function(block: Blockly.Block) {
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const in3 = block.getFieldValue('IN3');
  const in4 = block.getFieldValue('IN4');
  ensureStepperInclude();
  if (!generator.setups_) generator.setups_ = {};
  // case 19 axis 2 (G-pattern): first-wins guard で multi-init silent 上書き防御
  if (!generator.setups_['stepper_init']) {
    generator.setups_['stepper_init'] = `if (!stepperCh) stepperCh = new StepperPollChannel(StepperPollChannel::FULL4WIRE, ${in1}, ${in3}, ${in2}, ${in4});\n  if (stepperCh) stepperCh->attach();`;
  }
  return '';
};

// ===== stepper_init_driver (A4988/DRV8825、STEP/DIR/EN) =====
Blockly.Blocks['stepper_init_driver'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_STEPPER_INIT_DRIVER_LABEL || 'Stepper Init (Driver A4988/DRV8825)'));
    this.appendDummyInput()
        .appendField('STEP').appendField(new Blockly.FieldNumber(14, 0, 39), 'STEP')
        .appendField('DIR').appendField(new Blockly.FieldNumber(27, 0, 39), 'DIR')
        .appendField('EN').appendField(new Blockly.FieldNumber(26, 0, 39), 'EN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_INIT_DRIVER_TOOLTIP || 'Initialize stepper with A4988/DRV8825 driver (STEP/DIR/EN pins, AccelStepper DRIVER mode)');
  }
};
javascriptGenerator.forBlock['stepper_init_driver'] = function(block: Blockly.Block) {
  const stepPin = block.getFieldValue('STEP');
  const dirPin = block.getFieldValue('DIR');
  const enPin = block.getFieldValue('EN');
  ensureStepperInclude();
  if (!generator.setups_) generator.setups_ = {};
  if (!generator.setups_['stepper_init']) {
    generator.setups_['stepper_init'] = `if (!stepperCh) stepperCh = new StepperPollChannel(StepperPollChannel::DRIVER, ${stepPin}, ${dirPin}, ${enPin});\n  if (stepperCh) stepperCh->attach();`;
  }
  return '';
};

// ===== stepper_init_hw (D9 FastAccelStepper HW peripheral) =====
Blockly.Blocks['stepper_init_hw'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_STEPPER_INIT_HW_LABEL || 'Stepper Init (HW peripheral)'));
    this.appendDummyInput()
        .appendField('STEP').appendField(new Blockly.FieldNumber(14, 0, 39), 'STEP')
        .appendField('DIR').appendField(new Blockly.FieldNumber(27, 0, 39), 'DIR')
        .appendField('EN').appendField(new Blockly.FieldNumber(26, 0, 39), 'EN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_INIT_HW_TOOLTIP || 'High-speed stepper via ESP32 RMT/MCPWM peripheral (FastAccelStepper, target 200 kHz)');
  }
};
javascriptGenerator.forBlock['stepper_init_hw'] = function(block: Blockly.Block) {
  const stepPin = block.getFieldValue('STEP');
  const dirPin = block.getFieldValue('DIR');
  const enPin = block.getFieldValue('EN');
  ensureStepperInclude();
  if (!generator.setups_) generator.setups_ = {};
  if (!generator.setups_['stepper_init']) {
    generator.setups_['stepper_init'] = `if (!stepperCh) stepperCh = new StepperHwChannel(${stepPin}, ${dirPin}, ${enPin});\n  if (stepperCh) stepperCh->attach();`;
  }
  return '';
};

// ===== stepper_set_microstep (driver mode 用、HW MS1-3 連動) =====
Blockly.Blocks['stepper_set_microstep'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_STEPPER_SET_MICROSTEP_LABEL || 'Stepper Microstep'))
        .appendField(new Blockly.FieldDropdown([
          ['1 (Full)', '1'],
          ['1/2 (Half)', '2'],
          ['1/4 (Quarter)', '4'],
          ['1/8 (Eighth)', '8'],
          ['1/16 (Sixteenth)', '16'],
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_SET_MICROSTEP_TOOLTIP || 'Set microstep multiplier (HW MS1/MS2/MS3 pins must be wired accordingly)');
  }
};
javascriptGenerator.forBlock['stepper_set_microstep'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  ensureStepperInclude();
  return `  if (stepperCh) stepperCh->setMicrostep(${mode});\n`;
};

// ===== stepper_set_direction =====
Blockly.Blocks['stepper_set_direction'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_STEPPER_SET_DIRECTION_LABEL || 'Stepper Direction'))
        .appendField(new Blockly.FieldDropdown([
          ['forward', '1'],
          ['backward', '-1'],
        ]), 'DIR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_SET_DIRECTION_TOOLTIP || 'Set direction for next stepper_step');
  }
};
javascriptGenerator.forBlock['stepper_set_direction'] = function(block: Blockly.Block) {
  const dir = block.getFieldValue('DIR');
  ensureStepperInclude();
  return `  if (stepperCh) stepperCh->setDirection(${dir});\n`;
};

// ===== stepper_set_speed (max step/sec) =====
Blockly.Blocks['stepper_set_speed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_STEPPER_SET_SPEED_LABEL || 'Stepper Speed'));
    this.appendValueInput('SPEED')
        .setCheck(['Number', 'String', 'Boolean']);
    this.appendDummyInput()
        .appendField('step/s');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_SET_SPEED_TOOLTIP || 'Set max speed (step/sec)');
  }
};
javascriptGenerator.forBlock['stepper_set_speed'] = function(block: Blockly.Block) {
  const speed = generator.valueToCode(block, 'SPEED', generator.ORDER_ATOMIC) || '1000';
  ensureStepperInclude();
  return `  if (stepperCh) stepperCh->setMaxRate(String(${speed}).toInt());\n`;
};

// ===== stepper_step_{blocking,async} =====
function makeStepperStepBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('⚙️ ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('STEPS')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField(Blockly.Msg.BLOCKS_COMMON_STEPS || 'steps');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(STEPPER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeStepperStepBlock('stepper_step_blocking',
  'BLOCKS_STEPPER_STEP_BLOCKING_LABEL', 'Stepper Step (blocking)',
  'BLOCKS_STEPPER_STEP_BLOCKING_TOOLTIP', 'Move N steps (signed for direction), blocks until done');
makeStepperStepBlock('stepper_step_async',
  'BLOCKS_STEPPER_STEP_ASYNC_LABEL', 'Stepper Step (async)',
  'BLOCKS_STEPPER_STEP_ASYNC_TOOLTIP', 'Start moving N steps in background');

javascriptGenerator.forBlock['stepper_step_blocking'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '0';
  ensureStepperInclude();
  return `  if (stepperCh) { stepperCh->setTarget(stepperCh->getCurrent() + String(${steps}).toInt()); stepperCh->waitUntilIdle(); }\n`;
};
javascriptGenerator.forBlock['stepper_step_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '0';
  ensureStepperInclude();
  return `  if (stepperCh) stepperCh->setTarget(stepperCh->getCurrent() + String(${steps}).toInt());\n`;
};

// ===== stepper_rotate_{blocking,async} (degree → step 変換 runtime) =====
function makeStepperRotateBlock(blockType: string, labelKey: string, labelFallback: string, tooltipKey: string, tooltipFallback: string) {
  Blockly.Blocks[blockType] = {
    init: function() {
      this.appendDummyInput()
          .appendField('⚙️ ' + (Blockly.Msg[labelKey] || labelFallback));
      this.appendValueInput('ANGLE')
          .setCheck(['Number', 'String', 'Boolean']);
      this.appendDummyInput()
          .appendField('°');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(STEPPER_COLOR);
      this.setTooltip(Blockly.Msg[tooltipKey] || tooltipFallback);
    }
  };
}
makeStepperRotateBlock('stepper_rotate_blocking',
  'BLOCKS_STEPPER_ROTATE_BLOCKING_LABEL', 'Stepper Rotate (blocking)',
  'BLOCKS_STEPPER_ROTATE_BLOCKING_TOOLTIP', 'Rotate N degrees (assuming 4096 step/rev for 28BYJ-48), blocks');
makeStepperRotateBlock('stepper_rotate_async',
  'BLOCKS_STEPPER_ROTATE_ASYNC_LABEL', 'Stepper Rotate (async)',
  'BLOCKS_STEPPER_ROTATE_ASYNC_TOOLTIP', 'Start rotating in background');

javascriptGenerator.forBlock['stepper_rotate_blocking'] = function(block: Blockly.Block) {
  const angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';
  ensureStepperInclude();
  // 28BYJ-48 in half-step mode = 4096 step/rev (= 4096/360 ≈ 11.4 step/°)
  return `  if (stepperCh) { stepperCh->setTarget(stepperCh->getCurrent() + ((String(${angle}).toInt() * 4096L) / 360L)); stepperCh->waitUntilIdle(); }\n`;
};
javascriptGenerator.forBlock['stepper_rotate_async'] = function(block: Blockly.Block) {
  const angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';
  ensureStepperInclude();
  return `  if (stepperCh) stepperCh->setTarget(stepperCh->getCurrent() + ((String(${angle}).toInt() * 4096L) / 360L));\n`;
};

// ===== stepper_stop (即時、setTarget(current)) =====
Blockly.Blocks['stepper_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏹ ' + (Blockly.Msg.BLOCKS_STEPPER_STOP_LABEL || 'Stepper Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_STOP_TOOLTIP || 'Stop stepper immediately (target = current)');
  }
};
javascriptGenerator.forBlock['stepper_stop'] = function() {
  ensureStepperInclude();
  return `  if (stepperCh) stepperCh->setTarget(stepperCh->getCurrent());\n`;
};

// ===== stepper_is_at_target (value) =====
Blockly.Blocks['stepper_is_at_target'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('❓ ' + (Blockly.Msg.BLOCKS_STEPPER_IS_AT_TARGET_LABEL || 'Stepper at target?'));
    this.setOutput(true, 'Boolean');
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_IS_AT_TARGET_TOOLTIP || 'Returns true if stepper reached target');
  }
};
javascriptGenerator.forBlock['stepper_is_at_target'] = function() {
  return [`(stepperCh ? stepperCh->hasReachedTarget() : true)`, generator.ORDER_FUNCTION_CALL];
};

// ===== stepper_get_position (value、long step count) =====
Blockly.Blocks['stepper_get_position'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📍 ' + (Blockly.Msg.BLOCKS_STEPPER_GET_POSITION_LABEL || 'Stepper position'));
    this.setOutput(true, 'Number');
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_GET_POSITION_TOOLTIP || 'Get current stepper position (step count from origin)');
  }
};
javascriptGenerator.forBlock['stepper_get_position'] = function() {
  return [`(stepperCh ? stepperCh->getCurrent() : 0)`, generator.ORDER_FUNCTION_CALL];
};

// ===== stepper_wait_until_target =====
Blockly.Blocks['stepper_wait_until_target'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⏳ ' + (Blockly.Msg.BLOCKS_STEPPER_WAIT_LABEL || 'Wait until stepper at target'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_WAIT_TOOLTIP || 'Block until stepper async motion completes');
  }
};
javascriptGenerator.forBlock['stepper_wait_until_target'] = function() {
  return `  if (stepperCh) stepperCh->waitUntilIdle();\n`;
};

export {};
