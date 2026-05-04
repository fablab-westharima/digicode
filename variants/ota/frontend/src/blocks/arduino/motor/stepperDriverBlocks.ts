/**
 * Stepper driver 拡充ブロック (52.md Phase D、第80回 commit #7 / 2026-05-04)
 *
 * 6 ブロック構成 (Phase D 仕様書 §7.2 + 52.md §4.5):
 *   - a4988_init               (STEP/DIR/EN pins、DRIVER mode)
 *   - a4988_set_microstep      (MODE dropdown 1/2/4/8/16、HW MS1-3 pins と連動必要)
 *   - a4988_step               (STEPS Number)
 *   - a4988_set_direction      (DIR dropdown forward/backward)
 *   - uln2003_init             (IN1-IN4 pins、FULL4WIRE mode)
 *   - uln2003_step_28byj48     (STEPS/SPEED、AccelStepper 4-phase)
 *
 * 内部 lib: `waspinator/AccelStepper@^1.64` (既存、既存 stepper(4) で使用、追加 lib なし、Q-C 確定)
 * boardRequires: null (GPIO 全 board 対応)
 * 既存 `stepper` 4 ブロックとは別カテゴリ = 明示化 (driver chip 別)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const STEPPER_DRIVER_COLOR = '#FF5722';

const A4988_INCLUDE = `
#include <AccelStepper.h>
AccelStepper* a4988Stepper = nullptr;
int a4988EnPin = -1;
uint16_t a4988MicrostepMul = 1;`;

const ULN2003_INCLUDE = `
#include <AccelStepper.h>
AccelStepper* uln2003Stepper = nullptr;`;

Blockly.Blocks['a4988_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_A4988_INIT || 'A4988 を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_A4988_STEP || 'STEP')
        .appendField(new Blockly.FieldNumber(14, 0, 39, 1), 'STEP');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_A4988_DIR || 'DIR')
        .appendField(new Blockly.FieldNumber(27, 0, 39, 1), 'DIR');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_A4988_EN || 'EN')
        .appendField(new Blockly.FieldNumber(26, 0, 39, 1), 'EN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_DRIVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_A4988_INIT_TOOLTIP || 'A4988 ステッピングドライバを初期化します。STEP/DIR/EN ピン指定。EN は LOW で有効化。AccelStepper DRIVER mode 使用。');
  }
};

generator.forBlock['a4988_init'] = function(block: Blockly.Block) {
  const stepPin = block.getFieldValue('STEP');
  const dirPin = block.getFieldValue('DIR');
  const enPin = block.getFieldValue('EN');
  generator.definitions_['include_a4988'] = A4988_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['a4988_init'] = `if (!a4988Stepper) a4988Stepper = new AccelStepper(AccelStepper::DRIVER, ${stepPin}, ${dirPin});
  a4988EnPin = ${enPin};
  pinMode(${enPin}, OUTPUT);
  digitalWrite(${enPin}, LOW);
  a4988Stepper->setMaxSpeed(1000.0f);
  a4988Stepper->setAcceleration(500.0f);`;
  return '';
};

Blockly.Blocks['a4988_set_microstep'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_A4988_MICROSTEP || 'A4988 マイクロステップ'))
        .appendField(new Blockly.FieldDropdown([
          ['1 (Full)', '1'],
          ['1/2 (Half)', '2'],
          ['1/4 (Quarter)', '4'],
          ['1/8 (Eighth)', '8'],
          ['1/16 (Sixteenth)', '16'],
        ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_DRIVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_A4988_MICROSTEP_TOOLTIP || 'A4988 のマイクロステップモードを設定します (内部 step 倍率)。⚠️ HW の MS1/MS2/MS3 pin もこの値に合わせて配線必要。');
  }
};

generator.forBlock['a4988_set_microstep'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  generator.definitions_['include_a4988'] = generator.definitions_['include_a4988'] || A4988_INCLUDE;
  return `a4988MicrostepMul = (uint16_t)(${mode});\n`;
};

Blockly.Blocks['a4988_step'] = {
  init: function() {
    this.appendValueInput('STEPS')
        .setCheck('Number')
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_A4988_STEP_BLOCK || 'A4988 ステップ'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_DRIVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_A4988_STEP_TOOLTIP || 'A4988 を指定ステップ数 (microstep 倍率込) で動作させます。runToNewPosition で完了まで block。');
  }
};

generator.forBlock['a4988_step'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', Order.ATOMIC) || '0';
  generator.definitions_['include_a4988'] = generator.definitions_['include_a4988'] || A4988_INCLUDE;
  return `if (a4988Stepper) {
  long _a4988steps = (long)((${steps}) * a4988MicrostepMul);
  a4988Stepper->move(_a4988steps);
  a4988Stepper->runToPosition();
}
`;
};

Blockly.Blocks['a4988_set_direction'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_A4988_DIRECTION || 'A4988 方向'))
        .appendField(new Blockly.FieldDropdown([
          ['forward', 'FORWARD'],
          ['backward', 'BACKWARD'],
        ]), 'DIR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_DRIVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_A4988_DIRECTION_TOOLTIP || 'A4988 の方向を設定します。次の a4988_step が forward なら正、backward なら負ステップで動作。');
  }
};

generator.forBlock['a4988_set_direction'] = function(block: Blockly.Block) {
  const dir = block.getFieldValue('DIR');
  generator.definitions_['include_a4988'] = generator.definitions_['include_a4988'] || A4988_INCLUDE;
  // backward 時は次の step 数を反転、AccelStepper move() は signed なので方向は STEPS 符号で表現
  const sign = dir === 'BACKWARD' ? '-1' : '1';
  return `if (a4988Stepper) a4988Stepper->setPinsInverted(${sign} == -1, false, false);\n`;
};

Blockly.Blocks['uln2003_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_ULN2003_INIT || 'ULN2003 を初期化'));
    this.appendDummyInput()
        .appendField('IN1')
        .appendField(new Blockly.FieldNumber(13, 0, 39, 1), 'IN1');
    this.appendDummyInput()
        .appendField('IN2')
        .appendField(new Blockly.FieldNumber(12, 0, 39, 1), 'IN2');
    this.appendDummyInput()
        .appendField('IN3')
        .appendField(new Blockly.FieldNumber(14, 0, 39, 1), 'IN3');
    this.appendDummyInput()
        .appendField('IN4')
        .appendField(new Blockly.FieldNumber(27, 0, 39, 1), 'IN4');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_DRIVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ULN2003_INIT_TOOLTIP || 'ULN2003 ステッピングドライバ + 28BYJ-48 を初期化します。AccelStepper FULL4WIRE mode (pin 順 IN1, IN3, IN2, IN4 で正常回転)。');
  }
};

generator.forBlock['uln2003_init'] = function(block: Blockly.Block) {
  const in1 = block.getFieldValue('IN1');
  const in2 = block.getFieldValue('IN2');
  const in3 = block.getFieldValue('IN3');
  const in4 = block.getFieldValue('IN4');
  generator.definitions_['include_uln2003'] = ULN2003_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  // AccelStepper FULL4WIRE pin 順は IN1, IN3, IN2, IN4 が正規 (28BYJ-48 phase pattern)
  generator.setups_['uln2003_init'] = `if (!uln2003Stepper) uln2003Stepper = new AccelStepper(AccelStepper::FULL4WIRE, ${in1}, ${in3}, ${in2}, ${in4});
  uln2003Stepper->setMaxSpeed(1000.0f);
  uln2003Stepper->setAcceleration(500.0f);`;
  return '';
};

Blockly.Blocks['uln2003_step_28byj48'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚙️ ' + (Blockly.Msg.BLOCKS_ULN2003_STEP || 'ULN2003 (28BYJ-48) ステップ'));
    this.appendValueInput('STEPS')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ULN2003_STEPS || 'ステップ数');
    this.appendValueInput('SPEED')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ULN2003_SPEED || '速度');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(STEPPER_DRIVER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ULN2003_STEP_TOOLTIP || 'ULN2003 + 28BYJ-48 を指定ステップ・速度で動作させます (28BYJ-48 1 回転 = 4096 ステップ in half-step)。');
  }
};

generator.forBlock['uln2003_step_28byj48'] = function(block: Blockly.Block) {
  const steps = generator.valueToCode(block, 'STEPS', Order.ATOMIC) || '512';
  const speed = generator.valueToCode(block, 'SPEED', Order.ATOMIC) || '500';
  generator.definitions_['include_uln2003'] = generator.definitions_['include_uln2003'] || ULN2003_INCLUDE;
  return `if (uln2003Stepper) {
  uln2003Stepper->setMaxSpeed((float)(${speed}));
  uln2003Stepper->move((long)(${steps}));
  uln2003Stepper->runToPosition();
}
`;
};

console.log('Stepper driver blocks loaded (A4988 + ULN2003)');
