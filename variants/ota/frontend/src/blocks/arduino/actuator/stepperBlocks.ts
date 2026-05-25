/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/*
 * Stepper Blocks (Unified) — Phase X-2 commit 2 (Session 152、 user Q-E=β + Q-F=ε + Q-G=ζ 確定後)
 *
 * 旧 3 file (stepperBlocks.ts uln2003 path / stepperDriverBlocks.ts a4988 path / 旧 stepper_init 等) を
 * DigiMotion StepperPollChannel + StepperHwChannel (D9 = FastAccelStepper、MIT) 経由に統合。
 *
 * 12 block 統合構成 (59.md §1-1 マッピング表):
 *   - stepper_init_4wire (ULN2003 + 28BYJ-48、FULL4WIRE mode、AccelStepper backed、lib 4-arg ctor)
 *   - stepper_init_driver (A4988/DRV8825、DRIVER mode、AccelStepper backed、 Phase X-1.5 new 3-arg DRIVER ctor)
 *   - stepper_init_hw (D9 FastAccelStepper HW peripheral、RMT/MCPWM、200 kHz target、lib 3-arg ctor)
 *   - stepper_set_microstep (Q-E=β: lib に method 不在 = no-op + tooltip で HW MS1-3 manual wiring 明示)
 *   - stepper_set_direction (Q-E=β: 同 上)
 *   - stepper_set_speed (max speed 単位 step/sec)
 *   - stepper_step_{blocking,async}: blocking は Q-F=ε polling loop emit (lib に waitUntilIdle 不在)
 *   - stepper_rotate_{blocking,async}: 同 上
 *   - stepper_stop (即時)
 *   - stepper_is_at_target (value)
 *   - stepper_get_position (value)
 *   - stepper_wait_until_target (Q-F=ε polling loop)
 *
 * 単一 stepperCh instance 前提 (case 19 axis 2 G-pattern first-wins guard で multi-init silent 上書き防御)。
 *
 * Phase X-2 commit 2 で lib actual signature match に refactor (F-7/F-8/F-9/F-10 解消):
 *   F-7: stepper_init_4wire emit `new StepperPollChannel(in1, in3, in2, in4)` 4-arg
 *        (旧 `new StepperPollChannel(StepperPollChannel::FULL4WIRE, in1, in3, in2, in4)` 5-arg = drift)
 *   F-10: stepper_init_driver emit `new StepperPollChannel(step, dir, en)` 3-arg
 *         (Phase X-1.5 Q-G=ζ new 3-arg DRIVER ctor、 旧 4-arg は FULL4WIRE ctor にマッチして enPin が 4th coil 誤解)
 *   F-8 (Q-E=β): stepper_set_microstep / stepper_set_direction = no-op + tooltip update (HW wiring manual)
 *   F-9 (Q-F=ε): stepper_step_blocking / rotate_blocking / wait_until_target = polling loop
 *        (`while (!hasReachedTarget()) { pump(millis()); delay(1); }`、 lib waitUntilIdle 不在に対応)
 */

import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { getStepperPins } from '@/utils/pinHelper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const STEPPER_COLOR = '#795548';

function ensureStepperInclude(): void {
  // DigiMotion umbrella (Phase X-1 expand) で <actuator/StepperPollChannel.h> + <actuator/StepperHwChannel.h>
  // + <actuator/IActuatorChannel.h> transitive 取得。
  generator.definitions_['include_digimotion'] = '#include <DigiMotion.h>';
  generator.definitions_['stepper_channel_decl'] = '/* emits: stepperCh (IActuatorChannel*) */\nIActuatorChannel* stepperCh = nullptr;';
}

// ===== stepper_init_4wire (ULN2003 + 28BYJ-48、 lib 4-arg ctor 経由) =====
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
  // Phase X-2 commit 2 F-7 fix: lib 4-arg FULL4WIRE ctor `(pin1, pin2, pin3, pin4)` (mode 引数なし、
  // mode は ctor overload で MODE_FULL4WIRE auto-decide、 lib 内部で AccelStepper coil order (in1, in3, in2, in4)
  // に re-order)。 case 19 axis 2 G-pattern first-wins guard で multi-init silent 上書き防御。
  if (!generator.setups_['stepper_init']) {
    generator.setups_['stepper_init'] = `if (!stepperCh) stepperCh = new StepperPollChannel(${in1}, ${in3}, ${in2}, ${in4});\n  if (stepperCh) stepperCh->attach();`;
  }
  return '';
};

// ===== stepper_init_driver (A4988/DRV8825、STEP/DIR/EN、 Phase X-1.5 new 3-arg DRIVER ctor) =====
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
  // Phase X-2 commit 2 F-10 fix (Phase X-1.5 Q-G=ζ new 3-arg DRIVER ctor 使用):
  // lib `StepperPollChannel(int stepPin, int dirPin, int enablePin)` 3-arg。
  // 旧 4-arg call `(StepperPollChannel::DRIVER, step, dir, en)` は FULL4WIRE 4-arg ctor にマッチして
  // enPin が 4th coil pin として誤解されていた = behavior broken。 本 3-arg で AccelStepper の
  // setEnablePin が EN pin を driver 期待 polarity で assert する (lib 内部で processing)。
  if (!generator.setups_['stepper_init']) {
    generator.setups_['stepper_init'] = `if (!stepperCh) stepperCh = new StepperPollChannel(${stepPin}, ${dirPin}, ${enPin});\n  if (stepperCh) stepperCh->attach();`;
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
  // StepperHwChannel(int stepPin, int dirPin, int enablePin=-1) 3-arg、 lib match ✅
  if (!generator.setups_['stepper_init']) {
    generator.setups_['stepper_init'] = `if (!stepperCh) stepperCh = new StepperHwChannel(${stepPin}, ${dirPin}, ${enPin});\n  if (stepperCh) stepperCh->attach();`;
  }
  return '';
};

// ===== stepper_set_microstep (Q-E=β: lib に method 不在 = no-op + tooltip で HW MS1-3 manual wiring 明示) =====
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
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_SET_MICROSTEP_TOOLTIP || 'Microstep selector — HW only: wire MS1/MS2/MS3 pins to driver per this selection (A4988/DRV8825). The block emits a documentation comment; no software-side microstep setting exists.');
  }
};
javascriptGenerator.forBlock['stepper_set_microstep'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  ensureStepperInclude();
  // Phase X-2 commit 2 Q-E=β: lib IActuatorChannel / StepperPollChannel に setMicrostep method 不在。
  // HW MS1-3 wiring が microstep を物理的に決定するため、 software-side で setMicrostep を呼ぶ意味なし。
  // generator emit は comment のみで behavior 無効化、 tooltip で user に HW wiring 明示。
  return `  /* requires: stepperCh */ /* stepper_set_microstep(${mode}): HW MS1-3 wiring controls microstep, no software-side call */\n`;
};

// ===== stepper_set_direction (Q-E=β: lib に method 不在 = no-op + tooltip で setTarget sign で表現と明示) =====
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
    this.setTooltip(Blockly.Msg.BLOCKS_STEPPER_SET_DIRECTION_TOOLTIP || 'Direction selector — sign of stepper_step / rotate target value encodes direction (positive = forward, negative = backward). The block emits a documentation comment; no software-side direction state.');
  }
};
javascriptGenerator.forBlock['stepper_set_direction'] = function(block: Blockly.Block) {
  const dir = block.getFieldValue('DIR');
  ensureStepperInclude();
  // Phase X-2 commit 2 Q-E=β: lib に setDirection method 不在。 direction は sign of next setTarget で
  // 表現される (lib IActuatorChannel::setTarget は signed long、 stepper では distance to move、
  // 負の値で逆方向)。 generator emit は comment のみで behavior 無効化、 tooltip で明示。
  return `  /* requires: stepperCh */ /* stepper_set_direction(${dir}): sign of next setTarget encodes direction */\n`;
};

// ===== stepper_set_speed (max step/sec、 lib match ✅) =====
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
  return `  /* requires: stepperCh */ if (stepperCh) stepperCh->setMaxRate(String(${speed}).toInt());\n`;
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
  // Phase X-2 commit 2 Q-F=ε: lib IActuatorChannel に waitUntilIdle 不在、 polling loop で代替
  // (hasReachedTarget() + pump(millis()) + delay(1))。 ESP32 では AccelStepper::run() (StepperPoll)
  // または FastAccelStepper internal (StepperHw) が advance、 native では pump() の else 分岐で
  // current=target にジャンプして loop 即終了 (host test 互換)。
  return `  /* requires: stepperCh */ if (stepperCh) { stepperCh->setTarget(stepperCh->getCurrent() + String(${steps}).toInt()); while (!stepperCh->hasReachedTarget()) { stepperCh->pump(millis()); delay(1); } }\n`;
};
javascriptGenerator.forBlock['stepper_step_async'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', generator.ORDER_ATOMIC) || '0';
  ensureStepperInclude();
  return `  /* requires: stepperCh */ if (stepperCh) stepperCh->setTarget(stepperCh->getCurrent() + String(${steps}).toInt());\n`;
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
  // Phase X-2 commit 2 Q-F=ε: polling loop (上記 stepper_step_blocking と同 pattern)
  // 28BYJ-48 in half-step mode = 4096 step/rev (= 4096/360 ≈ 11.4 step/°)
  return `  /* requires: stepperCh */ if (stepperCh) { stepperCh->setTarget(stepperCh->getCurrent() + ((String(${angle}).toInt() * 4096L) / 360L)); while (!stepperCh->hasReachedTarget()) { stepperCh->pump(millis()); delay(1); } }\n`;
};
javascriptGenerator.forBlock['stepper_rotate_async'] = function(block: Blockly.Block) {
  const angle = generator.valueToCode(block, 'ANGLE', generator.ORDER_ATOMIC) || '90';
  ensureStepperInclude();
  return `  /* requires: stepperCh */ if (stepperCh) stepperCh->setTarget(stepperCh->getCurrent() + ((String(${angle}).toInt() * 4096L) / 360L));\n`;
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
  return `  /* requires: stepperCh */ if (stepperCh) stepperCh->setTarget(stepperCh->getCurrent());\n`;
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
  return [`/* requires: stepperCh */ (stepperCh ? stepperCh->hasReachedTarget() : true)`, generator.ORDER_FUNCTION_CALL];
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
  return [`/* requires: stepperCh */ (stepperCh ? stepperCh->getCurrent() : 0)`, generator.ORDER_FUNCTION_CALL];
};

// ===== stepper_wait_until_target (Q-F=ε polling loop) =====
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
  ensureStepperInclude();
  // Phase X-2 commit 2 Q-F=ε: polling loop with pump + delay
  return `  /* requires: stepperCh */ if (stepperCh) { while (!stepperCh->hasReachedTarget()) { stepperCh->pump(millis()); delay(1); } }\n`;
};

export {};
