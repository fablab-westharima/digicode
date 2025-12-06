/**
 * MicroPython OTTO Ninjaロボットブロック
 * UIFlow2スタイル - 歩行/走行変形モード
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const NINJA_COLOR = '#9C27B0';

// ESP32 PWM対応ピン
const SERVO_PIN_OPTIONS: [string, string][] = [
  ['GPIO13', '13'], ['GPIO14', '14'], ['GPIO15', '15'],
  ['GPIO27', '27'], ['GPIO26', '26'], ['GPIO25', '25'],
  ['GPIO33', '33'], ['GPIO32', '32'],
  ['GPIO21', '21'], ['GPIO22', '22'], ['GPIO23', '23'],
];

// ========================================
// OTTO Ninja 初期化
// ========================================
Blockly.Blocks['mp_otto_ninja_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🐱 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_INIT_LABEL || 'OTTO Ninja Init'));
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_INIT_LEFTLEG || 'Left Leg')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_LL')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_INIT_RIGHTLEG || 'Right Leg')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_RL');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_INIT_LEFTFOOT || 'Left Foot')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_LF')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_INIT_RIGHTFOOT || 'Right Foot')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_RF');
    this.setFieldValue('27', 'PIN_LL');
    this.setFieldValue('15', 'PIN_RL');
    this.setFieldValue('14', 'PIN_LF');
    this.setFieldValue('13', 'PIN_RF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_INIT_TOOLTIP || 'Initialize OTTO Ninja robot (walk/roll transformation)');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_init'] = function(block: Blockly.Block) {
  const pinLL = block.getFieldValue('PIN_LL');
  const pinRL = block.getFieldValue('PIN_RL');
  const pinLF = block.getFieldValue('PIN_LF');
  const pinRF = block.getFieldValue('PIN_RF');

  pyGen.definitions_['import_machine'] = 'from machine import Pin, PWM';
  pyGen.definitions_['import_time'] = 'import time';

  // サーボ制御用のヘルパー関数（Otto用と共通）
  if (!pyGen.definitions_['servo_class']) {
    pyGen.definitions_['servo_class'] = `
class Servo:
    def __init__(self, pin):
        self.pwm = PWM(Pin(pin), freq=50)
        self.angle = 90

    def write(self, angle):
        angle = max(0, min(180, angle))
        self.angle = angle
        duty = int(26 + (angle / 180) * 102)
        self.pwm.duty(duty)

    def read(self):
        return self.angle
`;
  }

  // OttoNinjaクラス定義
  pyGen.definitions_['otto_ninja_class'] = `
class OttoNinja:
    # モード定数
    WALK_MODE = 0
    ROLL_MODE = 1

    def __init__(self, ll, rl, lf, rf):
        self.servos = {
            'LL': Servo(ll),
            'RL': Servo(rl),
            'LF': Servo(lf),
            'RF': Servo(rf),
        }
        self.mode = self.WALK_MODE
        self.home()

    def home(self):
        for servo in self.servos.values():
            servo.write(90)
        time.sleep_ms(300)

    def _move(self, positions, duration=500):
        for name, angle in positions.items():
            self.servos[name].write(angle)
        time.sleep_ms(duration)

    def set_mode(self, mode):
        self.mode = mode
        if mode == self.ROLL_MODE:
            self.transform_roll()
        else:
            self.transform_walk()

    def transform_walk(self):
        # 歩行モードに変形（直立）
        self._move({'LL': 90, 'RL': 90, 'LF': 90, 'RF': 90}, 500)
        self.mode = self.WALK_MODE

    def transform_roll(self):
        # 走行モードに変形（足首を曲げてホイール接地）
        self._move({'LL': 90, 'RL': 90, 'LF': 0, 'RF': 180}, 500)
        self.mode = self.ROLL_MODE

    def align(self):
        # キャリブレーション位置（90度）
        for servo in self.servos.values():
            servo.write(90)

    # === 歩行モード動作 ===
    def walk(self, steps=2, speed=1000, direction=1):
        if self.mode != self.WALK_MODE:
            return
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
        if self.mode != self.WALK_MODE:
            return
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

    def trot(self, steps=4, speed=800):
        if self.mode != self.WALK_MODE:
            return
        t = speed // 4
        for _ in range(steps):
            self._move({'LL': 70, 'RF': 70}, t)
            self._move({'LL': 110, 'RF': 110}, t)
            self._move({'RL': 70, 'LF': 70}, t)
            self._move({'RL': 110, 'LF': 110}, t)
        self.home()

    def stop_walk(self):
        self.home()

    # === 走行モード動作 ===
    def roll(self, speed=50, duration=1000, direction=1):
        if self.mode != self.ROLL_MODE:
            return
        # 連続回転サーボとして動作
        # 速度: -100〜100
        left_angle = 90 + speed * direction * 0.9
        right_angle = 90 - speed * direction * 0.9
        self._move({'LL': int(left_angle), 'RL': int(right_angle)}, duration)

    def roll_rotate(self, speed=50, duration=500, direction=1):
        if self.mode != self.ROLL_MODE:
            return
        angle = 90 + speed * direction * 0.9
        self._move({'LL': int(angle), 'RL': int(angle)}, duration)

    def stop_roll(self):
        if self.mode == self.ROLL_MODE:
            self._move({'LL': 90, 'RL': 90}, 100)

    # === ジェスチャー ===
    def pushup(self, steps=2, speed=800):
        t = speed // 2
        for _ in range(steps):
            self._move({'LF': 45, 'RF': 135}, t)
            self._move({'LF': 90, 'RF': 90}, t)

    def lateral(self, steps=2, speed=1000, direction=1):
        t = speed // 2
        for _ in range(steps):
            if direction > 0:
                self._move({'LF': 60, 'RF': 60}, t)
            else:
                self._move({'LF': 120, 'RF': 120}, t)
            self.home()

    def dance(self, steps=4, speed=600):
        t = speed // 4
        for _ in range(steps):
            self._move({'LF': 60, 'RF': 60, 'LL': 70, 'RL': 70}, t)
            self._move({'LF': 120, 'RF': 120, 'LL': 110, 'RL': 110}, t)
            self._move({'LF': 60, 'RF': 120, 'LL': 70, 'RL': 110}, t)
            self._move({'LF': 120, 'RF': 60, 'LL': 110, 'RL': 70}, t)
        self.home()
`;

  pyGen.definitions_['otto_ninja_instance'] = `ninja = OttoNinja(${pinLL}, ${pinRL}, ${pinLF}, ${pinRF})`;

  return '';
};

// ========================================
// OTTO Ninja モード切替
// ========================================
Blockly.Blocks['mp_otto_ninja_mode'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🔄 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_MODE_LABEL || 'Ninja Mode'))
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_MODE_WALKMODE || 'Walk Mode', 'WALK_MODE'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_MODE_ROLLMODE || 'Roll Mode', 'ROLL_MODE']
      ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_MODE_TOOLTIP || 'Switch Ninja operation mode');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_mode'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `ninja.set_mode(ninja.${mode})\n`;
};

// ========================================
// OTTO Ninja 変形
// ========================================
Blockly.Blocks['mp_otto_ninja_transform'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('✨ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TRANSFORM_LABEL || 'Ninja Transform'))
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TRANSFORM_WALKFORM || 'Walk Form', 'walk'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TRANSFORM_ROLLFORM || 'Roll Form', 'roll']
      ]), 'FORM');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TRANSFORM_TOOLTIP || 'Transform Ninja');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_transform'] = function(block: Blockly.Block) {
  const form = block.getFieldValue('FORM');
  if (form === 'walk') {
    return 'ninja.transform_walk()\n';
  } else {
    return 'ninja.transform_roll()\n';
  }
};

// ========================================
// OTTO Ninja アライン（キャリブレーション）
// ========================================
Blockly.Blocks['mp_otto_ninja_align'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🔧 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ALIGN_LABEL || 'Ninja Align (90°)'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ALIGN_TOOLTIP || 'Set all servos to 90 degrees (for calibration)');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_align'] = function() {
  return 'ninja.align()\n';
};

// ========================================
// OTTO Ninja ホーム
// ========================================
Blockly.Blocks['mp_otto_ninja_home'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🏠 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_HOME_LABEL || 'Ninja Home'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_HOME_TOOLTIP || 'Return to home position');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_home'] = function() {
  return 'ninja.home()\n';
};

// ========================================
// OTTO Ninja 歩行
// ========================================
Blockly.Blocks['mp_otto_ninja_walk'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🚶 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_WALK_LABEL || 'Ninja Walk'))
      .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_WALK_STEPS || 'steps')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_WALK_FORWARD || 'Forward', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_WALK_BACKWARD || 'Backward', '-1']
      ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_WALK_TOOLTIP || 'Walk in walk mode');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_walk'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `ninja.walk(${steps}, 1000, ${direction})\n`;
};

// ========================================
// OTTO Ninja 回転
// ========================================
Blockly.Blocks['mp_otto_ninja_turn'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('↻ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TURN_LABEL || 'Ninja Turn'))
      .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TURN_TIMES || 'times')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TURN_LEFT || 'Left', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TURN_RIGHT || 'Right', '-1']
      ]), 'DIRECTION');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TURN_TOOLTIP || 'Turn in walk mode');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_turn'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  const direction = block.getFieldValue('DIRECTION');
  return `ninja.turn(${steps}, 1000, ${direction})\n`;
};

// ========================================
// OTTO Ninja トロット
// ========================================
Blockly.Blocks['mp_otto_ninja_trot'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🐎 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TROT_LABEL || 'Ninja Trot'))
      .appendField(new Blockly.FieldNumber(4, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TROT_STEPS || 'steps');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_TROT_TOOLTIP || 'Trot gait (diagonal walk)');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_trot'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `ninja.trot(${steps}, 800)\n`;
};

// ========================================
// OTTO Ninja 歩行停止
// ========================================
Blockly.Blocks['mp_otto_ninja_stop'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('⏹️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_STOP_LABEL || 'Ninja Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_STOP_TOOLTIP || 'Stop and return to home position');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_stop'] = function() {
  return 'ninja.stop_walk()\n';
};

// ========================================
// OTTO Ninja 走行
// ========================================
Blockly.Blocks['mp_otto_ninja_roll'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🛞 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_LABEL || 'Ninja Roll'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_VERYSLOW || 'Very Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_FAST || 'Fast', '80'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_FASTEST || 'Fastest', '100']
      ]), 'SPEED')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_FORWARD || 'Forward', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_BACKWARD || 'Backward', '-1']
      ]), 'DIRECTION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(1000, 100, 10000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLL_TOOLTIP || 'Move in roll mode');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_roll'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const direction = block.getFieldValue('DIRECTION');
  const duration = block.getFieldValue('DURATION');
  return `ninja.roll(${speed}, ${duration}, ${direction})\n`;
};

// ========================================
// OTTO Ninja 走行回転
// ========================================
Blockly.Blocks['mp_otto_ninja_roll_rotate'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('↻ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_LABEL || 'Ninja Roll Rotate'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_SLOW || 'Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_FAST || 'Fast', '80']
      ]), 'SPEED')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_LEFT || 'Left', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_RIGHT || 'Right', '-1']
      ]), 'DIRECTION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(500, 100, 5000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_ROLLROTATE_TOOLTIP || 'Rotate in roll mode');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_roll_rotate'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const direction = block.getFieldValue('DIRECTION');
  const duration = block.getFieldValue('DURATION');
  return `ninja.roll_rotate(${speed}, ${duration}, ${direction})\n`;
};

// ========================================
// OTTO Ninja 腕立て
// ========================================
Blockly.Blocks['mp_otto_ninja_pushup'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('💪 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_PUSHUP_LABEL || 'Ninja Pushup'))
      .appendField(new Blockly.FieldNumber(2, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_PUSHUP_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_PUSHUP_TOOLTIP || 'Perform pushup-like motion');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_pushup'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `ninja.pushup(${steps}, 800)\n`;
};

// ========================================
// OTTO Ninja ダンス
// ========================================
Blockly.Blocks['mp_otto_ninja_dance'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('💃 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_DANCE_LABEL || 'Ninja Dance'))
      .appendField(new Blockly.FieldNumber(4, 1, 10), 'STEPS')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_DANCE_TIMES || 'times');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NINJA_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTONINJA_DANCE_TOOLTIP || 'Make Ninja dance');
  }
};

pythonGenerator.forBlock['mp_otto_ninja_dance'] = function(block: Blockly.Block) {
  const steps = block.getFieldValue('STEPS');
  return `ninja.dance(${steps}, 600)\n`;
};

export {};
