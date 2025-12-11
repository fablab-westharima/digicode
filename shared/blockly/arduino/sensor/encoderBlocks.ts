/**
 * エンコーダーブロック定義
 * ロータリーエンコーダーによる速度・距離計測用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// ========================================
// エンコーダー初期化（2輪）
// ========================================
Blockly.Blocks['encoder_init'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_INIT || 'Initialize Encoder (2 wheels)');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_LEFTA || 'Left A')
      .appendField(new Blockly.FieldNumber(25, 0, 39), 'LEFT_A')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_LEFTB || 'Left B')
      .appendField(new Blockly.FieldNumber(26, 0, 39), 'LEFT_B');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_RIGHTA || 'Right A')
      .appendField(new Blockly.FieldNumber(27, 0, 39), 'RIGHT_A')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_RIGHTB || 'Right B')
      .appendField(new Blockly.FieldNumber(14, 0, 39), 'RIGHT_B');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_PPR || 'Pulses/Rev')
      .appendField(new Blockly.FieldNumber(360, 1, 10000), 'PPR');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_WHEELDIAMETER || 'Wheel Diameter (mm)')
      .appendField(new Blockly.FieldNumber(40, 1, 500), 'WHEEL_DIAMETER');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_INITTOOLTIP || 'Initialize rotary encoders');
  }
};

javascriptGenerator.forBlock['encoder_init'] = function(block: Blockly.Block) {
  const leftA = block.getFieldValue('LEFT_A');
  const leftB = block.getFieldValue('LEFT_B');
  const rightA = block.getFieldValue('RIGHT_A');
  const rightB = block.getFieldValue('RIGHT_B');
  const ppr = block.getFieldValue('PPR');
  const wheelDiameter = block.getFieldValue('WHEEL_DIAMETER');

  javascriptGenerator.definitions_['encoder_vars'] =
    `// エンコーダー変数\n` +
    `#define ENCODER_LEFT_A ${leftA}\n` +
    `#define ENCODER_LEFT_B ${leftB}\n` +
    `#define ENCODER_RIGHT_A ${rightA}\n` +
    `#define ENCODER_RIGHT_B ${rightB}\n` +
    `#define ENCODER_PPR ${ppr}\n` +
    `#define WHEEL_DIAMETER ${wheelDiameter}.0\n` +
    `#define WHEEL_CIRCUMFERENCE (WHEEL_DIAMETER * PI)\n` +
    `volatile long encoderLeftCount = 0;\n` +
    `volatile long encoderRightCount = 0;\n` +
    `long lastEncoderLeftCount = 0;\n` +
    `long lastEncoderRightCount = 0;\n` +
    `unsigned long lastEncoderTime = 0;\n` +
    `float leftSpeed = 0;\n` +
    `float rightSpeed = 0;\n`;

  javascriptGenerator.definitions_['encoder_isr'] =
    `// エンコーダー割り込みハンドラ\n` +
    `void IRAM_ATTR encoderLeftISR() {\n` +
    `  if (digitalRead(ENCODER_LEFT_B)) {\n` +
    `    encoderLeftCount++;\n` +
    `  } else {\n` +
    `    encoderLeftCount--;\n` +
    `  }\n` +
    `}\n\n` +
    `void IRAM_ATTR encoderRightISR() {\n` +
    `  if (digitalRead(ENCODER_RIGHT_B)) {\n` +
    `    encoderRightCount++;\n` +
    `  } else {\n` +
    `    encoderRightCount--;\n` +
    `  }\n` +
    `}\n`;

  javascriptGenerator.definitions_['encoder_funcs'] =
    `// エンコーダー関数\n` +
    `void updateEncoderSpeed() {\n` +
    `  unsigned long now = millis();\n` +
    `  unsigned long dt = now - lastEncoderTime;\n` +
    `  if (dt >= 20) { // 20ms毎に更新\n` +
    `    long leftDelta = encoderLeftCount - lastEncoderLeftCount;\n` +
    `    long rightDelta = encoderRightCount - lastEncoderRightCount;\n` +
    `    // mm/s で計算\n` +
    `    leftSpeed = (leftDelta * WHEEL_CIRCUMFERENCE / ENCODER_PPR) / (dt / 1000.0);\n` +
    `    rightSpeed = (rightDelta * WHEEL_CIRCUMFERENCE / ENCODER_PPR) / (dt / 1000.0);\n` +
    `    lastEncoderLeftCount = encoderLeftCount;\n` +
    `    lastEncoderRightCount = encoderRightCount;\n` +
    `    lastEncoderTime = now;\n` +
    `  }\n` +
    `}\n\n` +
    `float getEncoderDistanceLeft() {\n` +
    `  return encoderLeftCount * WHEEL_CIRCUMFERENCE / ENCODER_PPR;\n` +
    `}\n\n` +
    `float getEncoderDistanceRight() {\n` +
    `  return encoderRightCount * WHEEL_CIRCUMFERENCE / ENCODER_PPR;\n` +
    `}\n\n` +
    `float getEncoderDistance() {\n` +
    `  return (getEncoderDistanceLeft() + getEncoderDistanceRight()) / 2.0;\n` +
    `}\n\n` +
    `float getEncoderSpeed() {\n` +
    `  updateEncoderSpeed();\n` +
    `  return (leftSpeed + rightSpeed) / 2.0;\n` +
    `}\n`;

  javascriptGenerator.setups_['encoder_setup'] =
    `// エンコーダー初期化\n` +
    `pinMode(ENCODER_LEFT_A, INPUT_PULLUP);\n` +
    `pinMode(ENCODER_LEFT_B, INPUT_PULLUP);\n` +
    `pinMode(ENCODER_RIGHT_A, INPUT_PULLUP);\n` +
    `pinMode(ENCODER_RIGHT_B, INPUT_PULLUP);\n` +
    `attachInterrupt(digitalPinToInterrupt(ENCODER_LEFT_A), encoderLeftISR, RISING);\n` +
    `attachInterrupt(digitalPinToInterrupt(ENCODER_RIGHT_A), encoderRightISR, RISING);\n` +
    `lastEncoderTime = millis();\n`;

  return '';
};

// ========================================
// 走行距離取得
// ========================================
Blockly.Blocks['encoder_distance'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_DISTANCE || 'Travel Distance')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_AVERAGE || 'Average', 'AVG'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_LEFTWHEEL || 'Left Wheel', 'LEFT'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_RIGHTWHEEL || 'Right Wheel', 'RIGHT']
      ]), 'WHEEL');
    this.setOutput(true, 'Number');
    this.setColour('#795548');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_DISTANCETOOLTIP || 'Get travel distance from encoder');
  }
};

javascriptGenerator.forBlock['encoder_distance'] = function(block: Blockly.Block) {
  const wheel = block.getFieldValue('WHEEL');
  let code = '';
  switch (wheel) {
    case 'LEFT':
      code = 'getEncoderDistanceLeft()';
      break;
    case 'RIGHT':
      code = 'getEncoderDistanceRight()';
      break;
    default:
      code = 'getEncoderDistance()';
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 速度取得
// ========================================
Blockly.Blocks['encoder_speed'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_SPEED || 'Speed (mm/s)')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_AVERAGE || 'Average', 'AVG'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_LEFTWHEEL || 'Left Wheel', 'LEFT'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_RIGHTWHEEL || 'Right Wheel', 'RIGHT']
      ]), 'WHEEL');
    this.setOutput(true, 'Number');
    this.setColour('#795548');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_SPEEDTOOLTIP || 'Get current speed');
  }
};

javascriptGenerator.forBlock['encoder_speed'] = function(block: Blockly.Block) {
  const wheel = block.getFieldValue('WHEEL');
  let code = '';
  switch (wheel) {
    case 'LEFT':
      code = '(updateEncoderSpeed(), leftSpeed)';
      break;
    case 'RIGHT':
      code = '(updateEncoderSpeed(), rightSpeed)';
      break;
    default:
      code = 'getEncoderSpeed()';
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// カウント取得
// ========================================
Blockly.Blocks['encoder_count'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_COUNT || 'Pulse Count')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_LEFTWHEEL || 'Left Wheel', 'LEFT'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_RIGHTWHEEL || 'Right Wheel', 'RIGHT']
      ]), 'WHEEL');
    this.setOutput(true, 'Number');
    this.setColour('#795548');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_COUNTTOOLTIP || 'Get encoder pulse count');
  }
};

javascriptGenerator.forBlock['encoder_count'] = function(block: Blockly.Block) {
  const wheel = block.getFieldValue('WHEEL');
  const code = wheel === 'LEFT' ? 'encoderLeftCount' : 'encoderRightCount';
  return [code, Order.ATOMIC];
};

// ========================================
// カウントリセット
// ========================================
Blockly.Blocks['encoder_reset'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_RESET || 'Reset Encoder');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_RESETTOOLTIP || 'Reset encoder count');
  }
};

javascriptGenerator.forBlock['encoder_reset'] = function() {
  return `// エンコーダーリセット\n` +
    `encoderLeftCount = 0;\n` +
    `encoderRightCount = 0;\n` +
    `lastEncoderLeftCount = 0;\n` +
    `lastEncoderRightCount = 0;\n`;
};

// ========================================
// 指定距離まで待機
// ========================================
Blockly.Blocks['encoder_wait_distance'] = {
  init: function() {
    this.appendValueInput('DISTANCE')
      .setCheck('Number')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_WAITDISTANCE || 'Distance');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_WAITUNTIL || 'mm and wait');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_ENCODER_WAITDISTANCETOOLTIP || 'Wait until specified distance');
  }
};

javascriptGenerator.forBlock['encoder_wait_distance'] = function(block: Blockly.Block) {
  const distance = javascriptGenerator.valueToCode(block, 'DISTANCE', Order.ATOMIC) || '100';

  return `// 指定距離まで待機\n` +
    `{\n` +
    `  float startDist = getEncoderDistance();\n` +
    `  while (abs(getEncoderDistance() - startDist) < ${distance}) {\n` +
    `    delay(1);\n` +
    `  }\n` +
    `}\n`;
};

export {};
