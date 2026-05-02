/**
 * 差動駆動ブロック定義
 * 2輪ロボット用の高レベル制御
 * エンコーダー連携で精密な距離・角度制御が可能
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

const DIFF_DRIVE_COLOR = '#00897B';

// ========================================
// 差動駆動 初期化
// ========================================
Blockly.Blocks['diff_drive_init'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_INIT || 'Differential Drive Init'));
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_LEFTMOTOR || 'Left Motor IN1')
      .appendField(new Blockly.FieldNumber(16, 0, 39), 'L_IN1')
      .appendField(' IN2')
      .appendField(new Blockly.FieldNumber(17, 0, 39), 'L_IN2')
      .appendField(' ENA')
      .appendField(new Blockly.FieldNumber(5, 0, 39), 'L_ENA');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_RIGHTMOTOR || 'Right Motor IN1')
      .appendField(new Blockly.FieldNumber(23, 0, 39), 'R_IN1')
      .appendField(' IN2')
      .appendField(new Blockly.FieldNumber(22, 0, 39), 'R_IN2')
      .appendField(' ENB')
      .appendField(new Blockly.FieldNumber(21, 0, 39), 'R_ENB');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_TRACKWIDTH || 'Track Width(mm)')
      .appendField(new Blockly.FieldNumber(100, 1, 1000), 'TRACK_WIDTH');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_INITTOOLTIP || 'Initialize differential drive robot');
  }
};

javascriptGenerator.forBlock['diff_drive_init'] = function(block: Blockly.Block) {
  const lIn1 = block.getFieldValue('L_IN1');
  const lIn2 = block.getFieldValue('L_IN2');
  const lEna = block.getFieldValue('L_ENA');
  const rIn1 = block.getFieldValue('R_IN1');
  const rIn2 = block.getFieldValue('R_IN2');
  const rEnb = block.getFieldValue('R_ENB');
  const trackWidth = block.getFieldValue('TRACK_WIDTH');

  javascriptGenerator.definitions_['diff_drive_vars'] =
    `// 差動駆動 変数\n` +
    `#define DIFF_L_IN1 ${lIn1}\n` +
    `#define DIFF_L_IN2 ${lIn2}\n` +
    `#define DIFF_L_ENA ${lEna}\n` +
    `#define DIFF_R_IN1 ${rIn1}\n` +
    `#define DIFF_R_IN2 ${rIn2}\n` +
    `#define DIFF_R_ENB ${rEnb}\n` +
    `#define TRACK_WIDTH ${trackWidth}.0\n` +
    `int diffLeftSpeed = 0;\n` +
    `int diffRightSpeed = 0;\n`;

  javascriptGenerator.definitions_['diff_drive_funcs'] =
    `// 差動駆動 関数\n` +
    `void diffSetMotors(int leftSpeed, int rightSpeed) {\n` +
    `  diffLeftSpeed = leftSpeed;\n` +
    `  diffRightSpeed = rightSpeed;\n` +
    `  // 左モーター\n` +
    `  if (leftSpeed >= 0) {\n` +
    `    digitalWrite(DIFF_L_IN1, HIGH);\n` +
    `    digitalWrite(DIFF_L_IN2, LOW);\n` +
    `    analogWrite(DIFF_L_ENA, leftSpeed);\n` +
    `  } else {\n` +
    `    digitalWrite(DIFF_L_IN1, LOW);\n` +
    `    digitalWrite(DIFF_L_IN2, HIGH);\n` +
    `    analogWrite(DIFF_L_ENA, -leftSpeed);\n` +
    `  }\n` +
    `  // 右モーター\n` +
    `  if (rightSpeed >= 0) {\n` +
    `    digitalWrite(DIFF_R_IN1, HIGH);\n` +
    `    digitalWrite(DIFF_R_IN2, LOW);\n` +
    `    analogWrite(DIFF_R_ENB, rightSpeed);\n` +
    `  } else {\n` +
    `    digitalWrite(DIFF_R_IN1, LOW);\n` +
    `    digitalWrite(DIFF_R_IN2, HIGH);\n` +
    `    analogWrite(DIFF_R_ENB, -rightSpeed);\n` +
    `  }\n` +
    `}\n\n` +
    `void diffStop(bool brake = true) {\n` +
    `  if (brake) {\n` +
    `    digitalWrite(DIFF_L_IN1, HIGH);\n` +
    `    digitalWrite(DIFF_L_IN2, HIGH);\n` +
    `    digitalWrite(DIFF_R_IN1, HIGH);\n` +
    `    digitalWrite(DIFF_R_IN2, HIGH);\n` +
    `  } else {\n` +
    `    digitalWrite(DIFF_L_IN1, LOW);\n` +
    `    digitalWrite(DIFF_L_IN2, LOW);\n` +
    `    digitalWrite(DIFF_R_IN1, LOW);\n` +
    `    digitalWrite(DIFF_R_IN2, LOW);\n` +
    `  }\n` +
    `  analogWrite(DIFF_L_ENA, 0);\n` +
    `  analogWrite(DIFF_R_ENB, 0);\n` +
    `  diffLeftSpeed = 0;\n` +
    `  diffRightSpeed = 0;\n` +
    `}\n`;

  javascriptGenerator.setups_['diff_drive_setup'] =
    `// 差動駆動 初期化\n` +
    `pinMode(DIFF_L_IN1, OUTPUT);\n` +
    `pinMode(DIFF_L_IN2, OUTPUT);\n` +
    `pinMode(DIFF_L_ENA, OUTPUT);\n` +
    `pinMode(DIFF_R_IN1, OUTPUT);\n` +
    `pinMode(DIFF_R_IN2, OUTPUT);\n` +
    `pinMode(DIFF_R_ENB, OUTPUT);\n`;

  return '';
};

// ========================================
// 速度設定（左右独立）
// ========================================
Blockly.Blocks['diff_drive_set_speed'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_SETSPEED || 'Set Speed'));
    this.appendValueInput('LEFT')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_LEFT || 'Left');
    this.appendValueInput('RIGHT')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_RIGHT || 'Right');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_SETSPEEDTOOLTIP || 'Set left/right motor speeds (-255 to 255)');
  }
};

javascriptGenerator.forBlock['diff_drive_set_speed'] = function(block: Blockly.Block) {
  const left = javascriptGenerator.valueToCode(block, 'LEFT', Order.ATOMIC) || '0';
  const right = javascriptGenerator.valueToCode(block, 'RIGHT', Order.ATOMIC) || '0';
  // String().toInt() wrap: see U3 fix dad01c7. Required after setCheck removal
  // so any output type (BLE String / variable / expression) compiles.
  return `diffSetMotors(String(${left}).toInt(), String(${right}).toInt());\n`;
};

// ========================================
// 前進
// ========================================
Blockly.Blocks['diff_drive_forward'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_FORWARD || 'Forward'));
    this.appendValueInput('SPEED')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_SPEED || 'Speed');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_FORWARDTOOLTIP || 'Move forward at specified speed (0-255)');
  }
};

javascriptGenerator.forBlock['diff_drive_forward'] = function(block: Blockly.Block) {
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '150';
  // String().toInt() wrap (BLE-safe).
  return `{ int _s = String(${speed}).toInt(); diffSetMotors(_s, _s); }\n`;
};

// ========================================
// 後退
// ========================================
Blockly.Blocks['diff_drive_backward'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_BACKWARD || 'Backward'));
    this.appendValueInput('SPEED')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_SPEED || 'Speed');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_BACKWARDTOOLTIP || 'Move backward at specified speed (0-255)');
  }
};

javascriptGenerator.forBlock['diff_drive_backward'] = function(block: Blockly.Block) {
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '150';
  // String().toInt() wrap, then negate (BLE-safe).
  return `{ int _s = String(${speed}).toInt(); diffSetMotors(-_s, -_s); }\n`;
};

// ========================================
// 停止
// ========================================
Blockly.Blocks['diff_drive_stop'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_STOP || 'Stop'))
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_DIFFDRIVE_BRAKE || 'Brake', 'BRAKE'],
        [Blockly.Msg.BLOCKS_DIFFDRIVE_FREE || 'Free', 'FREE']
      ]), 'MODE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_STOPTOOLTIP || 'Brake=immediate stop, Free=coast to stop');
  }
};

javascriptGenerator.forBlock['diff_drive_stop'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  return `diffStop(${mode === 'BRAKE' ? 'true' : 'false'});\n`;
};

// ========================================
// 旋回（その場回転）
// ========================================
Blockly.Blocks['diff_drive_spin'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_SPIN || 'Spin in Place'))
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_DIFFDRIVE_RIGHT || 'Right', 'RIGHT'],
        [Blockly.Msg.BLOCKS_DIFFDRIVE_LEFT || 'Left', 'LEFT']
      ]), 'DIRECTION');
    this.appendValueInput('SPEED')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_SPEED || 'Speed');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_SPINTOOLTIP || 'Rotate left or right in place');
  }
};

javascriptGenerator.forBlock['diff_drive_spin'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '150';
  // String().toInt() wrap (BLE-safe).
  if (direction === 'RIGHT') {
    return `{ int _s = String(${speed}).toInt(); diffSetMotors(_s, -_s); }\n`;
  } else {
    return `{ int _s = String(${speed}).toInt(); diffSetMotors(-_s, _s); }\n`;
  }
};

// ========================================
// カーブ走行
// ========================================
Blockly.Blocks['diff_drive_curve'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_CURVE || 'Curve'))
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_DIFFDRIVE_RIGHT || 'Right', 'RIGHT'],
        [Blockly.Msg.BLOCKS_DIFFDRIVE_LEFT || 'Left', 'LEFT']
      ]), 'DIRECTION');
    this.appendValueInput('SPEED')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_SPEED || 'Speed');
    this.appendValueInput('RATIO')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_CURVATURE || 'Curvature(0-100%)');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_CURVETOOLTIP || 'Curve driving. Curvature 0%=straight, 100%=spin');
  }
};

javascriptGenerator.forBlock['diff_drive_curve'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '150';
  const ratio = javascriptGenerator.valueToCode(block, 'RATIO', Order.ATOMIC) || '50';

  javascriptGenerator.definitions_['diff_curve_func'] =
    `// カーブ計算\n` +
    `void diffCurve(int speed, int ratio, bool turnRight) {\n` +
    `  int outerSpeed = speed;\n` +
    `  int innerSpeed = speed * (100 - ratio) / 100;\n` +
    `  if (turnRight) {\n` +
    `    diffSetMotors(outerSpeed, innerSpeed);\n` +
    `  } else {\n` +
    `    diffSetMotors(innerSpeed, outerSpeed);\n` +
    `  }\n` +
    `}\n`;

  // String().toInt() wrap (BLE-safe).
  return `diffCurve(String(${speed}).toInt(), String(${ratio}).toInt(), ${direction === 'RIGHT' ? 'true' : 'false'});\n`;
};

// ========================================
// 直進（距離指定・エンコーダー使用）
// ========================================
Blockly.Blocks['diff_drive_forward_distance'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_FORWARDDISTANCE || 'Forward Distance'));
    this.appendValueInput('DISTANCE')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_DISTANCE || 'Distance(mm)');
    this.appendValueInput('SPEED')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_SPEED || 'Speed');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_FORWARDDISTANCETOOLTIP || 'Drive forward specified distance (encoder required)');
  }
};

javascriptGenerator.forBlock['diff_drive_forward_distance'] = function(block: Blockly.Block) {
  const distance = javascriptGenerator.valueToCode(block, 'DISTANCE', Order.ATOMIC) || '100';
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '150';

  javascriptGenerator.definitions_['diff_forward_dist_func'] =
    `// 距離指定直進\n` +
    `void diffForwardDistance(float distance, int speed) {\n` +
    `  encoderLeftCount = 0;\n` +
    `  encoderRightCount = 0;\n` +
    `  diffSetMotors(speed, speed);\n` +
    `  while (getEncoderDistance() < distance) {\n` +
    `    delay(1);\n` +
    `  }\n` +
    `  diffStop(true);\n` +
    `}\n`;

  // String().toFloat() for distance (float param), String().toInt() for speed.
  return `diffForwardDistance(String(${distance}).toFloat(), String(${speed}).toInt());\n`;
};

// ========================================
// 回転（角度指定・エンコーダー使用）
// ========================================
Blockly.Blocks['diff_drive_rotate_angle'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_ROTATEANGLE || 'Rotate'));
    this.appendValueInput('ANGLE')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_ANGLE || 'Angle(degrees)');
    this.appendValueInput('SPEED')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_SPEED || 'Speed');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_DIRECTION || 'Direction')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_DIFFDRIVE_RIGHT || 'Right', 'RIGHT'],
        [Blockly.Msg.BLOCKS_DIFFDRIVE_LEFT || 'Left', 'LEFT']
      ]), 'DIRECTION');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_ROTATEANGLETOOLTIP || 'Rotate specified angle (encoder required)');
  }
};

javascriptGenerator.forBlock['diff_drive_rotate_angle'] = function(block: Blockly.Block) {
  const angle = javascriptGenerator.valueToCode(block, 'ANGLE', Order.ATOMIC) || '90';
  const speed = javascriptGenerator.valueToCode(block, 'SPEED', Order.ATOMIC) || '100';
  const direction = block.getFieldValue('DIRECTION');

  javascriptGenerator.definitions_['diff_rotate_func'] =
    `// 角度指定回転\n` +
    `void diffRotateAngle(float angle, int speed, bool turnRight) {\n` +
    `  // 回転距離 = (トレッド幅 × π × 角度) / 360\n` +
    `  float arcLength = (TRACK_WIDTH * PI * angle) / 360.0;\n` +
    `  encoderLeftCount = 0;\n` +
    `  encoderRightCount = 0;\n` +
    `  if (turnRight) {\n` +
    `    diffSetMotors(speed, -speed);\n` +
    `  } else {\n` +
    `    diffSetMotors(-speed, speed);\n` +
    `  }\n` +
    `  while (abs(getEncoderDistanceLeft()) < arcLength) {\n` +
    `    delay(1);\n` +
    `  }\n` +
    `  diffStop(true);\n` +
    `}\n`;

  // String().toFloat() for angle (float param), String().toInt() for speed.
  return `diffRotateAngle(String(${angle}).toFloat(), String(${speed}).toInt(), ${direction === 'RIGHT' ? 'true' : 'false'});\n`;
};

// ========================================
// ライントレース走行（PID連携）
// ========================================
Blockly.Blocks['diff_drive_line_trace'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_LINETRACE || 'Line Trace'));
    this.appendValueInput('BASE_SPEED')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_BASESPEED || 'Base Speed');
    this.appendValueInput('ERROR')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_ERROR || 'Error');
    this.appendValueInput('CORRECTION')
      .appendField(Blockly.Msg.BLOCKS_DIFFDRIVE_PIDCORRECTION || 'PID Correction');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_LINETRACETOOLTIP || 'Line trace driving with PID correction');
  }
};

javascriptGenerator.forBlock['diff_drive_line_trace'] = function(block: Blockly.Block) {
  const baseSpeed = javascriptGenerator.valueToCode(block, 'BASE_SPEED', Order.ATOMIC) || '150';
  const correction = javascriptGenerator.valueToCode(block, 'CORRECTION', Order.ATOMIC) || '0';

  // String().toInt() wrap (BLE-safe). Hoisted to locals so each operand is
  // coerced once even if used in two `constrain` calls.
  return `// ライントレース\n` +
    `{\n` +
    `  int _b = String(${baseSpeed}).toInt();\n` +
    `  int _c = String(${correction}).toInt();\n` +
    `  int leftSpeed = constrain(_b - _c, -255, 255);\n` +
    `  int rightSpeed = constrain(_b + _c, -255, 255);\n` +
    `  diffSetMotors(leftSpeed, rightSpeed);\n` +
    `}\n`;
};

// ========================================
// 現在速度取得
// ========================================
Blockly.Blocks['diff_drive_get_speed'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🚗 ' + (Blockly.Msg.BLOCKS_DIFFDRIVE_GETSPEED || 'Current Speed'))
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_DIFFDRIVE_LEFT || 'Left', 'LEFT'],
        [Blockly.Msg.BLOCKS_DIFFDRIVE_RIGHT || 'Right', 'RIGHT']
      ]), 'MOTOR');
    this.setOutput(true, 'Number');
    this.setColour(DIFF_DRIVE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DIFFDRIVE_GETSPEEDTOOLTIP || 'Get currently set motor speed');
  }
};

javascriptGenerator.forBlock['diff_drive_get_speed'] = function(block: Blockly.Block) {
  const motor = block.getFieldValue('MOTOR');
  const varName = motor === 'LEFT' ? 'diffLeftSpeed' : 'diffRightSpeed';
  return [varName, Order.ATOMIC];
};

export {};
