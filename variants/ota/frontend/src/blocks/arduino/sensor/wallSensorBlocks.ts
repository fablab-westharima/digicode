/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * 壁センサーブロック定義
 * マイクロマウス用IR距離センサー
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// ========================================
// 壁センサー初期化（4方向）
// ========================================
Blockly.Blocks['wall_sensor_init'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_INIT || 'Initialize Wall Sensors');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_FRONTLEFT || 'Front Left')
      .appendField(new Blockly.FieldNumber(36, 0, 39), 'FRONT_LEFT')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_FRONTRIGHT || 'Front Right')
      .appendField(new Blockly.FieldNumber(39, 0, 39), 'FRONT_RIGHT');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_LEFT || 'Left')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'LEFT')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_RIGHT || 'Right')
      .appendField(new Blockly.FieldNumber(35, 0, 39), 'RIGHT');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_THRESHOLD || 'Threshold')
      .appendField(new Blockly.FieldNumber(1500, 0, 4095), 'THRESHOLD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_WALL_INITTOOLTIP || 'Initialize wall sensors');
  }
};

javascriptGenerator.forBlock['wall_sensor_init'] = function(block: Blockly.Block) {
  const frontLeft = block.getFieldValue('FRONT_LEFT');
  const frontRight = block.getFieldValue('FRONT_RIGHT');
  const left = block.getFieldValue('LEFT');
  const right = block.getFieldValue('RIGHT');
  const threshold = block.getFieldValue('THRESHOLD');

  javascriptGenerator.definitions_['wall_sensor_vars'] =
    `// 壁センサー変数\n` +
    `#define WALL_FRONT_LEFT_PIN ${frontLeft}\n` +
    `#define WALL_FRONT_RIGHT_PIN ${frontRight}\n` +
    `#define WALL_LEFT_PIN ${left}\n` +
    `#define WALL_RIGHT_PIN ${right}\n` +
    `#define WALL_THRESHOLD ${threshold}\n` +
    `int wallFrontLeft = 0;\n` +
    `int wallFrontRight = 0;\n` +
    `int wallLeft = 0;\n` +
    `int wallRight = 0;\n`;

  javascriptGenerator.definitions_['wall_sensor_funcs'] =
    `// 壁センサー読み取り\n` +
    `void readWallSensors() {\n` +
    `  wallFrontLeft = analogRead(WALL_FRONT_LEFT_PIN);\n` +
    `  wallFrontRight = analogRead(WALL_FRONT_RIGHT_PIN);\n` +
    `  wallLeft = analogRead(WALL_LEFT_PIN);\n` +
    `  wallRight = analogRead(WALL_RIGHT_PIN);\n` +
    `}\n\n` +
    `bool hasWallFront() {\n` +
    `  readWallSensors();\n` +
    `  return (wallFrontLeft > WALL_THRESHOLD) || (wallFrontRight > WALL_THRESHOLD);\n` +
    `}\n\n` +
    `bool hasWallLeft() {\n` +
    `  readWallSensors();\n` +
    `  return wallLeft > WALL_THRESHOLD;\n` +
    `}\n\n` +
    `bool hasWallRight() {\n` +
    `  readWallSensors();\n` +
    `  return wallRight > WALL_THRESHOLD;\n` +
    `}\n\n` +
    `// 壁との距離に基づくずれ量計算（左右センサー使用）\n` +
    `int getWallError() {\n` +
    `  readWallSensors();\n` +
    `  // 両壁がある場合\n` +
    `  if (wallLeft > WALL_THRESHOLD && wallRight > WALL_THRESHOLD) {\n` +
    `    return wallLeft - wallRight; // 正=左に近い、負=右に近い\n` +
    `  }\n` +
    `  // 左壁のみ\n` +
    `  if (wallLeft > WALL_THRESHOLD) {\n` +
    `    return (wallLeft - WALL_THRESHOLD) / 2;\n` +
    `  }\n` +
    `  // 右壁のみ\n` +
    `  if (wallRight > WALL_THRESHOLD) {\n` +
    `    return -(wallRight - WALL_THRESHOLD) / 2;\n` +
    `  }\n` +
    `  return 0;\n` +
    `}\n`;

  javascriptGenerator.setups_['wall_sensor_setup'] =
    `// 壁センサー初期化\n` +
    `pinMode(WALL_FRONT_LEFT_PIN, INPUT);\n` +
    `pinMode(WALL_FRONT_RIGHT_PIN, INPUT);\n` +
    `pinMode(WALL_LEFT_PIN, INPUT);\n` +
    `pinMode(WALL_RIGHT_PIN, INPUT);\n`;

  return '';
};

// ========================================
// 壁あり判定
// ========================================
Blockly.Blocks['wall_sensor_has_wall'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_HASWALL || 'Has Wall')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_WALL_DIRECTIONFRONT || 'Front', 'FRONT'],
        [Blockly.Msg.BLOCKS_SENSOR_WALL_DIRECTIONLEFT || 'Left', 'LEFT'],
        [Blockly.Msg.BLOCKS_SENSOR_WALL_DIRECTIONRIGHT || 'Right', 'RIGHT']
      ]), 'DIRECTION')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_HASWALLSUFFIX || '?');
    this.setOutput(true, 'Boolean');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_WALL_HASWALLTOOLTIP || 'Check if wall exists');
  }
};

javascriptGenerator.forBlock['wall_sensor_has_wall'] = function(block: Blockly.Block) {
  const direction = block.getFieldValue('DIRECTION');
  let code = '';
  switch (direction) {
    case 'FRONT':
      code = 'hasWallFront()';
      break;
    case 'LEFT':
      code = 'hasWallLeft()';
      break;
    case 'RIGHT':
      code = 'hasWallRight()';
      break;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// センサー値取得
// ========================================
Blockly.Blocks['wall_sensor_value'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_SENSORVALUE || 'Wall Sensor')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_WALL_SENSORFRONTLEFT || 'Front Left', 'FRONT_LEFT'],
        [Blockly.Msg.BLOCKS_SENSOR_WALL_SENSORFRONTRIGHT || 'Front Right', 'FRONT_RIGHT'],
        [Blockly.Msg.BLOCKS_SENSOR_WALL_SENSORLEFT || 'Left', 'LEFT'],
        [Blockly.Msg.BLOCKS_SENSOR_WALL_SENSORRIGHT || 'Right', 'RIGHT']
      ]), 'SENSOR')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_VALUE || 'Value');
    this.setOutput(true, 'Number');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_WALL_SENSORVALUETOOLTIP || 'Get wall sensor value');
  }
};

javascriptGenerator.forBlock['wall_sensor_value'] = function(block: Blockly.Block) {
  const sensor = block.getFieldValue('SENSOR');
  let code = '';
  switch (sensor) {
    case 'FRONT_LEFT':
      code = '(readWallSensors(), wallFrontLeft)';
      break;
    case 'FRONT_RIGHT':
      code = '(readWallSensors(), wallFrontRight)';
      break;
    case 'LEFT':
      code = '(readWallSensors(), wallLeft)';
      break;
    case 'RIGHT':
      code = '(readWallSensors(), wallRight)';
      break;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 壁からのずれ量
// ========================================
Blockly.Blocks['wall_sensor_error'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_ERROR || 'Wall Error');
    this.setOutput(true, 'Number');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_WALL_ERRORTOOLTIP || 'Get wall error for PID control');
  }
};

javascriptGenerator.forBlock['wall_sensor_error'] = function() {
  return ['getWallError()', Order.FUNCTION_CALL];
};

// ========================================
// 壁情報取得（3ビット）
// ========================================
Blockly.Blocks['wall_sensor_info'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_INFO || 'Wall Info (3-bit)');
    this.setOutput(true, 'Number');
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_WALL_INFOTOOLTIP || 'Get wall info as 3-bit value');
  }
};

javascriptGenerator.forBlock['wall_sensor_info'] = function() {
  javascriptGenerator.definitions_['wall_info_func'] =
    `int getWallInfo() {\n` +
    `  int info = 0;\n` +
    `  if (hasWallRight()) info |= 0x01;\n` +
    `  if (hasWallFront()) info |= 0x02;\n` +
    `  if (hasWallLeft()) info |= 0x04;\n` +
    `  return info;\n` +
    `}\n`;

  return ['getWallInfo()', Order.FUNCTION_CALL];
};

// ========================================
// 壁センサー読み取り（手動）
// ========================================
Blockly.Blocks['wall_sensor_read'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_READ || 'Read Wall Sensors');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_WALL_READTOOLTIP || 'Read all wall sensors');
  }
};

javascriptGenerator.forBlock['wall_sensor_read'] = function() {
  return 'readWallSensors();\n';
};

// ========================================
// 閾値変更
// ========================================
Blockly.Blocks['wall_sensor_set_threshold'] = {
  init: function() {
    this.appendValueInput('THRESHOLD')
      .setCheck('Number')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_SETTHRESHOLD || 'Set Wall Threshold');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_WALL_SETTHRESHOLDSUFFIX || '');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF5722');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_WALL_SETTHRESHOLDTOOLTIP || 'Set wall detection threshold');
  }
};

javascriptGenerator.forBlock['wall_sensor_set_threshold'] = function(block: Blockly.Block) {
  const threshold = javascriptGenerator.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '1500';

  javascriptGenerator.definitions_['wall_threshold_var'] =
    `int wallThreshold = WALL_THRESHOLD;\n`;

  return `wallThreshold = ${threshold};\n`;
};

export {};
