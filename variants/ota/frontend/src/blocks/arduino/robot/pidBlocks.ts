/**
 * PID制御ブロック定義
 * ライントレース、マイクロマウス用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// ========================================
// PID制御初期化
// ========================================
Blockly.Blocks['pid_init'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 ' + (Blockly.Msg.BLOCKS_PID_INIT || 'PID Control Init'));
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_PID_NAME || 'Name')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_PID_LINEFOLLOW || 'Line Follow', 'line'],
        [Blockly.Msg.BLOCKS_PID_WALLCONTROL || 'Wall Control', 'wall'],
        [Blockly.Msg.BLOCKS_PID_SPEEDCONTROL || 'Speed Control', 'speed'],
        [Blockly.Msg.BLOCKS_PID_ANGLECONTROL || 'Angle Control', 'angle']
      ]), 'NAME');
    this.appendValueInput('KP')
      .setCheck('Number')
      .appendField('Kp');
    this.appendValueInput('KI')
      .setCheck('Number')
      .appendField('Ki');
    this.appendValueInput('KD')
      .setCheck('Number')
      .appendField('Kd');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_PID_INITTOOLTIP || 'Initialize PID controller');
  }
};

javascriptGenerator.forBlock['pid_init'] = function(block: Blockly.Block) {
  const name = block.getFieldValue('NAME');
  const kp = javascriptGenerator.valueToCode(block, 'KP', Order.ATOMIC) || '0.5';
  const ki = javascriptGenerator.valueToCode(block, 'KI', Order.ATOMIC) || '0.0';
  const kd = javascriptGenerator.valueToCode(block, 'KD', Order.ATOMIC) || '0.1';

  javascriptGenerator.definitions_[`pid_${name}_vars`] =
    `// PID制御変数 (${name})\n` +
    `// emits: pid_${name}_kp, pid_${name}_ki, pid_${name}_kd, pid_${name}_integral, pid_${name}_lastError, pid_${name}_lastTime\n` +
    `float pid_${name}_kp = ${kp};\n` +
    `float pid_${name}_ki = ${ki};\n` +
    `float pid_${name}_kd = ${kd};\n` +
    `float pid_${name}_integral = 0;\n` +
    `float pid_${name}_lastError = 0;\n` +
    `unsigned long pid_${name}_lastTime = 0;\n`;

  // post-Phase 4-4 commit 2-1 (case_0164 fix): pid_get_speed reads
  // pidLeftSpeed/pidRightSpeed which are otherwise only declared by
  // pid_motor_speeds. In singleton strategy (pid_init + pid_get_speed
  // without pid_motor_speeds) the read fails. Declaring the same vars
  // here under the same definitions_ key ('pid_motor_vars') makes
  // pid_init self-sufficient — generator.definitions_ dedupe ensures
  // the declaration emits exactly once even when both pid_init and
  // pid_motor_speeds are present.
  // See rules/digicode/03-block-workflow.md "Init block protocol".
  javascriptGenerator.definitions_['pid_motor_vars'] =
    `// PIDモーター速度変数\n` +
    `// emits: pidLeftSpeed, pidRightSpeed (singleton-strategy survivability — pid_get_speed depends on these)\n` +
    `int pidLeftSpeed = 0;\n` +
    `int pidRightSpeed = 0;\n`;

  javascriptGenerator.definitions_['pid_calc_func'] =
    `// PID計算関数\n` +
    `float pidCalculate(float error, float &integral, float &lastError, \n` +
    `                   unsigned long &lastTime, float kp, float ki, float kd,\n` +
    `                   float integralLimit = 1000) {\n` +
    `  unsigned long now = millis();\n` +
    `  float dt = (now - lastTime) / 1000.0;\n` +
    `  if (lastTime == 0 || dt > 1.0) dt = 0.02; // 初回or時間飛びすぎ\n` +
    `  \n` +
    `  // P項\n` +
    `  float p = kp * error;\n` +
    `  \n` +
    `  // I項 (積分上限あり)\n` +
    `  integral += error * dt;\n` +
    `  integral = constrain(integral, -integralLimit, integralLimit);\n` +
    `  float i = ki * integral;\n` +
    `  \n` +
    `  // D項\n` +
    `  float d = 0;\n` +
    `  if (dt > 0) {\n` +
    `    d = kd * (error - lastError) / dt;\n` +
    `  }\n` +
    `  \n` +
    `  lastError = error;\n` +
    `  lastTime = now;\n` +
    `  \n` +
    `  return p + i + d;\n` +
    `}\n`;

  return '';
};

// ========================================
// PID計算
// ========================================
Blockly.Blocks['pid_calculate'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 ' + (Blockly.Msg.BLOCKS_PID_CALCULATE || 'PID'))
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_PID_LINEFOLLOW || 'Line Follow', 'line'],
        [Blockly.Msg.BLOCKS_PID_WALLCONTROL || 'Wall Control', 'wall'],
        [Blockly.Msg.BLOCKS_PID_SPEEDCONTROL || 'Speed Control', 'speed'],
        [Blockly.Msg.BLOCKS_PID_ANGLECONTROL || 'Angle Control', 'angle']
      ]), 'NAME');
    this.appendValueInput('ERROR')
      .setCheck('Number')
      .appendField(Blockly.Msg.BLOCKS_PID_ERROR || 'Error');
    this.setOutput(true, 'Number');
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_PID_CALCULATETOOLTIP || 'Calculate PID control output');
  }
};

javascriptGenerator.forBlock['pid_calculate'] = function(block: Blockly.Block) {
  const name = block.getFieldValue('NAME');
  const error = javascriptGenerator.valueToCode(block, 'ERROR', Order.ATOMIC) || '0';

  const code = `pidCalculate(${error}, pid_${name}_integral, pid_${name}_lastError, ` +
    `pid_${name}_lastTime, pid_${name}_kp, pid_${name}_ki, pid_${name}_kd)`;
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// PIDゲイン設定
// ========================================
Blockly.Blocks['pid_set_gains'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 PID')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_PID_LINEFOLLOW || 'Line Follow', 'line'],
        [Blockly.Msg.BLOCKS_PID_WALLCONTROL || 'Wall Control', 'wall'],
        [Blockly.Msg.BLOCKS_PID_SPEEDCONTROL || 'Speed Control', 'speed'],
        [Blockly.Msg.BLOCKS_PID_ANGLECONTROL || 'Angle Control', 'angle']
      ]), 'NAME')
      .appendField(Blockly.Msg.BLOCKS_PID_SETGAINS || 'Set Gains');
    this.appendValueInput('KP')
      .setCheck('Number')
      .appendField('Kp');
    this.appendValueInput('KI')
      .setCheck('Number')
      .appendField('Ki');
    this.appendValueInput('KD')
      .setCheck('Number')
      .appendField('Kd');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_PID_SETGAINSTOOLTIP || 'Dynamically change PID gains');
  }
};

javascriptGenerator.forBlock['pid_set_gains'] = function(block: Blockly.Block) {
  const name = block.getFieldValue('NAME');
  const kp = javascriptGenerator.valueToCode(block, 'KP', Order.ATOMIC) || '0.5';
  const ki = javascriptGenerator.valueToCode(block, 'KI', Order.ATOMIC) || '0.0';
  const kd = javascriptGenerator.valueToCode(block, 'KD', Order.ATOMIC) || '0.1';

  return `// PIDゲイン更新 (${name})\n` +
    `pid_${name}_kp = ${kp};\n` +
    `pid_${name}_ki = ${ki};\n` +
    `pid_${name}_kd = ${kd};\n`;
};

// ========================================
// PIDリセット
// ========================================
Blockly.Blocks['pid_reset'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 PID')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_PID_LINEFOLLOW || 'Line Follow', 'line'],
        [Blockly.Msg.BLOCKS_PID_WALLCONTROL || 'Wall Control', 'wall'],
        [Blockly.Msg.BLOCKS_PID_SPEEDCONTROL || 'Speed Control', 'speed'],
        [Blockly.Msg.BLOCKS_PID_ANGLECONTROL || 'Angle Control', 'angle']
      ]), 'NAME')
      .appendField(Blockly.Msg.BLOCKS_PID_RESET || 'Reset');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_PID_RESETTOOLTIP || 'Reset PID integral and derivative values');
  }
};

javascriptGenerator.forBlock['pid_reset'] = function(block: Blockly.Block) {
  const name = block.getFieldValue('NAME');

  return `// PIDリセット (${name})\n` +
    `pid_${name}_integral = 0;\n` +
    `pid_${name}_lastError = 0;\n` +
    `pid_${name}_lastTime = 0;\n`;
};

// ========================================
// 両輪速度を一度に計算
// ========================================
Blockly.Blocks['pid_motor_speeds'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 ' + (Blockly.Msg.BLOCKS_PID_MOTORSPEEDCALC || 'PID Motor Speed Calc'));
    this.appendValueInput('BASE_SPEED')
      .setCheck('Number')
      .appendField(Blockly.Msg.BLOCKS_PID_BASESPEED || 'Base Speed');
    this.appendValueInput('ERROR')
      .setCheck('Number')
      .appendField(Blockly.Msg.BLOCKS_PID_ERROR || 'Error');
    this.appendDummyInput()
      .appendField('PID')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_PID_LINEFOLLOW || 'Line Follow', 'line'],
        [Blockly.Msg.BLOCKS_PID_WALLCONTROL || 'Wall Control', 'wall']
      ]), 'NAME');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_PID_MOTORSPEEDCALCTOOLTIP || 'Calculate left/right motor speeds with PID and store in global variables');
  }
};

javascriptGenerator.forBlock['pid_motor_speeds'] = function(block: Blockly.Block) {
  const name = block.getFieldValue('NAME');
  const baseSpeed = javascriptGenerator.valueToCode(block, 'BASE_SPEED', Order.ATOMIC) || '150';
  const error = javascriptGenerator.valueToCode(block, 'ERROR', Order.ATOMIC) || '0';

  javascriptGenerator.definitions_['pid_motor_vars'] =
    `// PIDモーター速度変数\n` +
    `// emits: pidLeftSpeed, pidRightSpeed (also emitted by pid_init for singleton survivability — same definitions_ key dedupes)\n` +
    `int pidLeftSpeed = 0;\n` +
    `int pidRightSpeed = 0;\n`;

  return `// PIDでモーター速度計算\n` +
    `{\n` +
    `  float pidOutput = pidCalculate(${error}, pid_${name}_integral, pid_${name}_lastError, ` +
    `pid_${name}_lastTime, pid_${name}_kp, pid_${name}_ki, pid_${name}_kd);\n` +
    `  pidLeftSpeed = constrain(${baseSpeed} - pidOutput, -255, 255);\n` +
    `  pidRightSpeed = constrain(${baseSpeed} + pidOutput, -255, 255);\n` +
    `}\n`;
};

// ========================================
// 計算済み速度取得
// ========================================
Blockly.Blocks['pid_get_speed'] = {
  init: function() {
    this.appendDummyInput()
      .appendField('🎯 ' + (Blockly.Msg.BLOCKS_PID_GETSPEED || 'PID Calculated'))
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_PID_LEFT || 'Left', 'LEFT'],
        [Blockly.Msg.BLOCKS_PID_RIGHT || 'Right', 'RIGHT']
      ]), 'SIDE')
      .appendField(Blockly.Msg.BLOCKS_PID_MOTORSPEED || 'Motor Speed');
    this.setOutput(true, 'Number');
    this.setColour('#3F51B5');
    this.setTooltip(Blockly.Msg.BLOCKS_PID_GETSPEEDTOOLTIP || 'Get PID-calculated left/right motor speed');
  }
};

javascriptGenerator.forBlock['pid_get_speed'] = function(block: Blockly.Block) {
  const side = block.getFieldValue('SIDE');
  // requires: pidLeftSpeed, pidRightSpeed (declared by pid_init or pid_motor_speeds
  // — see rules/digicode/03-block-workflow.md "Init block protocol")
  const code = side === 'LEFT'
    ? '/* requires: pidLeftSpeed */ pidLeftSpeed'
    : '/* requires: pidRightSpeed */ pidRightSpeed';
  return [code, Order.ATOMIC];
};

export {};
