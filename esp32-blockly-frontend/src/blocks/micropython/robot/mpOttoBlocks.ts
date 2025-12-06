/**
 * MicroPython OTTO 2足歩行ロボットブロック
 * UIFlow2スタイル - machine.PWM直接制御
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const OTTO_COLOR = '#FF6B35';

// ESP32 PWM対応ピン
const SERVO_PIN_OPTIONS: [string, string][] = [
  ['GPIO13', '13'], ['GPIO14', '14'], ['GPIO15', '15'],
  ['GPIO27', '27'], ['GPIO26', '26'], ['GPIO25', '25'],
  ['GPIO33', '33'], ['GPIO32', '32'],
  ['GPIO21', '21'], ['GPIO22', '22'], ['GPIO23', '23'],
];

// ========================================
// OTTO 初期化（PWM直接制御）
// ========================================
Blockly.Blocks['mp_otto_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🤖 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_INIT_LABEL || 'OTTO Init'));
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_INIT_LEFTLEG || 'Left Leg')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_LL')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_INIT_RIGHTLEG || 'Right Leg')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_RL');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_INIT_LEFTFOOT || 'Left Foot')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_LF')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_INIT_RIGHTFOOT || 'Right Foot')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_RF');
    this.setFieldValue('27', 'PIN_LL');
    this.setFieldValue('15', 'PIN_RL');
    this.setFieldValue('14', 'PIN_LF');
    this.setFieldValue('13', 'PIN_RF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_INIT_TOOLTIP || 'Initialize OTTO robot (PWM direct control)');
  }
};

pythonGenerator.forBlock['mp_otto_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');

  pyGen.definitions_['import_machine'] = 'from machine import Pin, PWM';
  pyGen.definitions_['import_time'] = 'import time';

  // サーボ制御用のヘルパー関数
  pyGen.definitions_['servo_class'] = `
class Servo:
    def __init__(self, pin):
        self.pwm = PWM(Pin(pin), freq=50)
        self.angle = 90

    def write(self, angle):
        angle = max(0, min(180, angle))
        self.angle = angle
        # 0度=0.5ms(26), 180度=2.5ms(128)
        duty = int(26 + (angle / 180) * 102)
        self.pwm.duty(duty)

    def read(self):
        return self.angle
`;

  // OTTOクラス定義
  pyGen.definitions_['otto_class'] = `
class Otto:
    def __init__(self, ll, rl, lf, rf):
        self.servos = {
            'LL': Servo(ll),  # 左足
            'RL': Servo(rl),  # 右足
            'LF': Servo(lf),  # 左足首
            'RF': Servo(rf),  # 右足首
        }
        self.home()

    def home(self):
        for servo in self.servos.values():
            servo.write(90)
        time.sleep_ms(300)

    def _move(self, positions, duration=500):
        for name, angle in positions.items():
            self.servos[name].write(angle)
        time.sleep_ms(duration)

    def walk(self, steps=2, speed=1000, direction=1):
        t = speed // 4
        for _ in range(steps):
            if direction > 0:
                self._move({'LF': 70, 'RF': 70}, t)
                self._move({'LL': 70, 'RL': 70}, t)
                self._move({'LF': 110, 'RF': 110}, t)
                self._move({'LL': 110, 'RL': 110}, t)
            else:
                self._move({'LF': 110, 'RF': 110}, t)
                self._move({'LL': 110, 'RL': 110}, t)
                self._move({'LF': 70, 'RF': 70}, t)
                self._move({'LL': 70, 'RL': 70}, t)
        self.home()

    def turn(self, steps=2, speed=1000, direction=1):
        t = speed // 4
        for _ in range(steps):
            if direction > 0:
                self._move({'LF': 70, 'RF': 110}, t)
                self._move({'LL': 70, 'RL': 110}, t)
            else:
                self._move({'LF': 110, 'RF': 70}, t)
                self._move({'LL': 110, 'RL': 70}, t)
            self._move({'LF': 90, 'RF': 90}, t)
            self._move({'LL': 90, 'RL': 90}, t)

    def swing(self, steps=2, speed=1000):
        t = speed // 2
        for _ in range(steps):
            self._move({'LF': 70, 'RF': 110}, t)
            self._move({'LF': 110, 'RF': 70}, t)
        self.home()

    def bend(self, direction='left', steps=1, speed=1000):
        t = speed // 2
        for _ in range(steps):
            if direction == 'left':
                self._move({'LF': 60, 'RF': 60}, t)
            else:
                self._move({'LF': 120, 'RF': 120}, t)
            self.home()

    def jump(self, steps=1, speed=500):
        for _ in range(steps):
            self._move({'LF': 60, 'RF': 120}, speed // 4)
            self._move({'LF': 120, 'RF': 60}, speed // 4)
            self._move({'LF': 60, 'RF': 120}, speed // 4)
            self._move({'LF': 90, 'RF': 90}, speed // 4)

    def dance(self, steps=4, speed=600):
        t = speed // 4
        for _ in range(steps):
            self._move({'LF': 60, 'RF': 60, 'LL': 70, 'RL': 70}, t)
            self._move({'LF': 120, 'RF': 120, 'LL': 110, 'RL': 110}, t)
            self._move({'LF': 60, 'RF': 120, 'LL': 70, 'RL': 110}, t)
            self._move({'LF': 120, 'RF': 60, 'LL': 110, 'RL': 70}, t)
        self.home()

    def moonwalk(self, steps=2, speed=1000, direction=1):
        t = speed // 4
        for _ in range(steps):
            if direction > 0:
                self._move({'LL': 60, 'RL': 60}, t)
                self._move({'LF': 70, 'RF': 70}, t)
                self._move({'LL': 120, 'RL': 120}, t)
                self._move({'LF': 110, 'RF': 110}, t)
            else:
                self._move({'LL': 120, 'RL': 120}, t)
                self._move({'LF': 110, 'RF': 110}, t)
                self._move({'LL': 60, 'RL': 60}, t)
                self._move({'LF': 70, 'RF': 70}, t)
        self.home()
`;

  pyGen.definitions_['otto_instance'] = `otto = Otto(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF})`;

  return '';
};

// ========================================
// OTTO ホームポジション
// ========================================
Blockly.Blocks['mp_otto_home'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🏠 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_HOME_LABEL || 'OTTO Home Position'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_HOME_TOOLTIP || 'Set OTTO to home position');
  }
};

pythonGenerator.forBlock['mp_otto_home'] = function() {
  return 'otto.home()\n';
};

// ========================================
// OTTO 歩く
// ========================================
Blockly.Blocks['mp_otto_walk'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🚶 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_LABEL || 'OTTO Walk'))
      .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_STEPS || 'steps')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_FORWARD || 'Forward', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_BACKWARD || 'Backward', '-1']
      ]), 'DIRECTION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_NORMAL || 'Normal', '1000'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_FAST || 'Fast', '600'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_SLOW || 'Slow', '1500']
      ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_WALK_TOOLTIP || 'Make OTTO walk');
  }
};

pythonGenerator.forBlock['mp_otto_walk'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  return `otto.walk(${steps}, ${speed}, ${direction})\n`;
};

// ========================================
// OTTO 回転
// ========================================
Blockly.Blocks['mp_otto_turn'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('↻ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_LABEL || 'OTTO Turn'))
      .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_TIMES || 'times')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_LEFT || 'Left', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_RIGHT || 'Right', '-1']
      ]), 'DIRECTION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_NORMAL || 'Normal', '1000'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_FAST || 'Fast', '600'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_SLOW || 'Slow', '1500']
      ]), 'SPEED');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_TURN_TOOLTIP || 'Make OTTO turn');
  }
};

pythonGenerator.forBlock['mp_otto_turn'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  const speed = block.getFieldValue('SPEED');
  return `otto.turn(${steps}, ${speed}, ${direction})\n`;
};

// ========================================
// OTTO ジャンプ
// ========================================
Blockly.Blocks['mp_otto_jump'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('⬆️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_JUMP_LABEL || 'OTTO Jump'))
      .appendField(new Blockly.FieldNumber(1, 1, 5), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_JUMP_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_JUMP_TOOLTIP || 'Make OTTO jump');
  }
};

pythonGenerator.forBlock['mp_otto_jump'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.jump(${steps}, 500)\n`;
};

// ========================================
// OTTO ダンス
// ========================================
Blockly.Blocks['mp_otto_dance'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('💃 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_DANCE_LABEL || 'OTTO Dance'))
      .appendField(new Blockly.FieldNumber(4, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_DANCE_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_DANCE_TOOLTIP || 'Make OTTO dance');
  }
};

pythonGenerator.forBlock['mp_otto_dance'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.dance(${steps}, 600)\n`;
};

// ========================================
// OTTO スウィング
// ========================================
Blockly.Blocks['mp_otto_swing'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('〜 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SWING_LABEL || 'OTTO Swing'))
      .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SWING_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SWING_TOOLTIP || 'Make OTTO swing left and right');
  }
};

pythonGenerator.forBlock['mp_otto_swing'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `otto.swing(${steps}, 1000)\n`;
};

// ========================================
// OTTO 傾ける
// ========================================
Blockly.Blocks['mp_otto_bend'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('↔️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_BEND_LABEL || 'OTTO Bend'))
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_BEND_LEFT || 'Left', 'left'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_BEND_RIGHT || 'Right', 'right']
      ]), 'DIRECTION')
      .appendField(new Blockly.FieldNumber(1, 1, 5), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_BEND_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_BEND_TOOLTIP || 'Make OTTO bend left or right');
  }
};

pythonGenerator.forBlock['mp_otto_bend'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const steps = block.getFieldValue('STEPS');
  return `otto.bend("${direction}", ${steps}, 1000)\n`;
};

// ========================================
// OTTO ムーンウォーク
// ========================================
Blockly.Blocks['mp_otto_moonwalk'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🕺 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_MOONWALK_LABEL || 'OTTO Moonwalk'))
      .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_MOONWALK_STEPS || 'steps')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_MOONWALK_RIGHT || 'Right', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_MOONWALK_LEFT || 'Left', '-1']
      ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_MOONWALK_TOOLTIP || 'Make OTTO moonwalk');
  }
};

pythonGenerator.forBlock['mp_otto_moonwalk'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `otto.moonwalk(${steps}, 1000, ${direction})\n`;
};

// ========================================
// サーボ直接制御
// ========================================
Blockly.Blocks['mp_otto_servo'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('ANGLE')
      .setCheck('Number')
      .appendField('🔧 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_LABEL || 'OTTO Servo'))
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_LEFTLEG || 'Left Leg (LL)', 'LL'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_RIGHTLEG || 'Right Leg (RL)', 'RL'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_LEFTFOOT || 'Left Foot (LF)', 'LF'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_RIGHTFOOT || 'Right Foot (RF)', 'RF']
      ]), 'SERVO')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_ANGLE || 'Angle');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_DEGREES || 'degrees');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(OTTO_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTO_SERVO_TOOLTIP || 'Control OTTO servo directly (0-180 degrees)');
  }
};

pythonGenerator.forBlock['mp_otto_servo'] = function(block: Blockly.Block) {
  const servo = block.getFieldValue('SERVO');
  const angle = pythonGenerator.valueToCode(block, 'ANGLE', pyGen.ORDER_NONE) || '90';
  return `otto.servos["${servo}"].write(${angle})\n`;
};

export {};
