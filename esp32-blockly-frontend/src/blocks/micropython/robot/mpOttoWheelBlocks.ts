/**
 * MicroPython OTTO Wheelロボットブロック
 * UIFlow2スタイル - 連続回転サーボ(PWM)直接制御
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const WHEEL_COLOR = '#4CAF50';

// ESP32 PWM対応ピン
const SERVO_PIN_OPTIONS: [string, string][] = [
  ['GPIO13', '13'], ['GPIO14', '14'], ['GPIO15', '15'],
  ['GPIO27', '27'], ['GPIO26', '26'], ['GPIO25', '25'],
  ['GPIO33', '33'], ['GPIO32', '32'],
  ['GPIO21', '21'], ['GPIO22', '22'], ['GPIO23', '23'],
];

// ========================================
// OTTO Wheel 初期化
// ========================================
Blockly.Blocks['mp_otto_wheel_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🛞 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_INIT_LABEL || 'OTTO Wheel Init'));
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_INIT_LEFTWHEEL || 'Left Wheel')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_L')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_INIT_RIGHTWHEEL || 'Right Wheel')
      .appendField(new Blockly.FieldDropdown(SERVO_PIN_OPTIONS), 'PIN_R');
    this.setFieldValue('14', 'PIN_L');
    this.setFieldValue('13', 'PIN_R');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_INIT_TOOLTIP || 'Initialize OTTO Wheel robot (continuous rotation servo)');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_init'] = function(block: Blockly.Block) {
  const pinL = block.getFieldValue('PIN_L');
  const pinR = block.getFieldValue('PIN_R');

  pyGen.definitions_['import_machine'] = 'from machine import Pin, PWM';
  pyGen.definitions_['import_time'] = 'import time';

  // 連続回転サーボ用クラス
  pyGen.definitions_['wheel_servo_class'] = `
class WheelServo:
    def __init__(self, pin, reverse=False):
        self.pwm = PWM(Pin(pin), freq=50)
        self.reverse = reverse
        self.stop()

    def set_speed(self, speed):
        # speed: -100〜100 (負=後退, 0=停止, 正=前進)
        speed = max(-100, min(100, speed))
        if self.reverse:
            speed = -speed
        # 連続回転サーボ: 停止=1.5ms, 全速前進=2ms, 全速後退=1ms
        # duty: 停止=77, 前進=51-77, 後退=77-102
        duty = int(77 - speed * 0.26)
        self.pwm.duty(duty)

    def stop(self):
        self.set_speed(0)
`;

  // OttoWheelクラス定義
  pyGen.definitions_['otto_wheel_class'] = `
class OttoWheel:
    def __init__(self, left_pin, right_pin):
        self.left = WheelServo(left_pin, reverse=False)
        self.right = WheelServo(right_pin, reverse=True)

    def forward(self, speed=50, duration=1000):
        self.left.set_speed(speed)
        self.right.set_speed(speed)
        time.sleep_ms(duration)

    def backward(self, speed=50, duration=1000):
        self.left.set_speed(-speed)
        self.right.set_speed(-speed)
        time.sleep_ms(duration)

    def turn_left(self, speed=50, duration=500):
        self.left.set_speed(-speed)
        self.right.set_speed(speed)
        time.sleep_ms(duration)

    def turn_right(self, speed=50, duration=500):
        self.left.set_speed(speed)
        self.right.set_speed(-speed)
        time.sleep_ms(duration)

    def spin_left(self, speed=50, duration=500):
        self.left.set_speed(-speed)
        self.right.set_speed(speed)
        time.sleep_ms(duration)

    def spin_right(self, speed=50, duration=500):
        self.left.set_speed(speed)
        self.right.set_speed(-speed)
        time.sleep_ms(duration)

    def stop(self):
        self.left.stop()
        self.right.stop()

    def set_motors(self, left_speed, right_speed):
        self.left.set_speed(left_speed)
        self.right.set_speed(right_speed)
`;

  pyGen.definitions_['otto_wheel_instance'] = `wheel = OttoWheel(${pinL}, ${pinR})`;

  return '';
};

// ========================================
// OTTO Wheel 前進
// ========================================
Blockly.Blocks['mp_otto_wheel_forward'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('⬆️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_LABEL || 'Forward'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_SLOW || 'Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_FAST || 'Fast', '80'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_FASTEST || 'Fastest', '100']
      ]), 'SPEED')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(1000, 100, 10000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_FORWARD_TOOLTIP || 'Move forward');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_forward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const duration = block.getFieldValue('DURATION');
  return `wheel.forward(${speed}, ${duration})\n`;
};

// ========================================
// OTTO Wheel 後退
// ========================================
Blockly.Blocks['mp_otto_wheel_backward'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('⬇️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_LABEL || 'Backward'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_SLOW || 'Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_FAST || 'Fast', '80'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_FASTEST || 'Fastest', '100']
      ]), 'SPEED')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(1000, 100, 10000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_BACKWARD_TOOLTIP || 'Move backward');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_backward'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const duration = block.getFieldValue('DURATION');
  return `wheel.backward(${speed}, ${duration})\n`;
};

// ========================================
// OTTO Wheel 左折
// ========================================
Blockly.Blocks['mp_otto_wheel_turn_left'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('⬅️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_LABEL || 'Turn Left'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_SLOW || 'Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_FAST || 'Fast', '80']
      ]), 'SPEED')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(500, 100, 5000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNLEFT_TOOLTIP || 'Turn left');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_turn_left'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const duration = block.getFieldValue('DURATION');
  return `wheel.turn_left(${speed}, ${duration})\n`;
};

// ========================================
// OTTO Wheel 右折
// ========================================
Blockly.Blocks['mp_otto_wheel_turn_right'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('➡️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_LABEL || 'Turn Right'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_SLOW || 'Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_FAST || 'Fast', '80']
      ]), 'SPEED')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(500, 100, 5000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_TURNRIGHT_TOOLTIP || 'Turn right');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_turn_right'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const duration = block.getFieldValue('DURATION');
  return `wheel.turn_right(${speed}, ${duration})\n`;
};

// ========================================
// OTTO Wheel スピン（左回転）
// ========================================
Blockly.Blocks['mp_otto_wheel_spin_left'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('↺ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_LABEL || 'Spin Left'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_SLOW || 'Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_FAST || 'Fast', '80']
      ]), 'SPEED')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(500, 100, 5000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINLEFT_TOOLTIP || 'Spin left in place');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_spin_left'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const duration = block.getFieldValue('DURATION');
  return `wheel.spin_left(${speed}, ${duration})\n`;
};

// ========================================
// OTTO Wheel スピン（右回転）
// ========================================
Blockly.Blocks['mp_otto_wheel_spin_right'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('↻ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_LABEL || 'Spin Right'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_SPEED || 'Speed')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_SLOW || 'Slow', '30'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_NORMAL || 'Normal', '50'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_FAST || 'Fast', '80']
      ]), 'SPEED')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_TIME || 'Time')
      .appendField(new Blockly.FieldNumber(500, 100, 5000), 'DURATION')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_SPINRIGHT_TOOLTIP || 'Spin right in place');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_spin_right'] = function(block: Blockly.Block) {
  const speed = block.getFieldValue('SPEED');
  const duration = block.getFieldValue('DURATION');
  return `wheel.spin_right(${speed}, ${duration})\n`;
};

// ========================================
// OTTO Wheel 停止
// ========================================
Blockly.Blocks['mp_otto_wheel_stop'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('⏹️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_STOP_LABEL || 'Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_STOP_TOOLTIP || 'Stop the robot');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_stop'] = function() {
  return 'wheel.stop()\n';
};

// ========================================
// OTTO Wheel モーター直接制御
// ========================================
Blockly.Blocks['mp_otto_wheel_motors'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('LEFT')
      .setCheck('Number')
      .appendField('🔧 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_MOTORS_LABEL || 'Motor Control'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_MOTORS_LEFT || 'Left');
    this.appendValueInput('RIGHT')
      .setCheck('Number')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_MOTORS_RIGHT || 'Right');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(WHEEL_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_OTTOWHEEL_MOTORS_TOOLTIP || 'Directly control left and right motor speeds (-100 to 100)');
  }
};

pythonGenerator.forBlock['mp_otto_wheel_motors'] = function(block: Blockly.Block) {
  const left = pythonGenerator.valueToCode(block, 'LEFT', pyGen.ORDER_NONE) || '0';
  const right = pythonGenerator.valueToCode(block, 'RIGHT', pyGen.ORDER_NONE) || '0';
  return `wheel.set_motors(${left}, ${right})\n`;
};

export {};
