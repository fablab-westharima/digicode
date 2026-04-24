/**
 * QTRセンサーブロック定義
 * Pololu QTR-8A / QTR-8RC 高速ラインセンサー用
 * 公式QTRSensorsライブラリ使用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// ========================================
// QTR-8A 初期化（アナログ・高速）
// ========================================
Blockly.Blocks['qtr_8a_init'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_QTR8AINIT || 'Initialize QTR-8A');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_SENSORCOUNT || 'Sensor Count')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT8 || '8', '8'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT6 || '6', '6'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT4 || '4', '4'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT3 || '3', '3']
      ]), 'COUNT');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS1 || 'S1')
      .appendField(new Blockly.FieldNumber(36, 0, 39), 'PIN1')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS2 || 'S2')
      .appendField(new Blockly.FieldNumber(39, 0, 39), 'PIN2');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS3 || 'S3')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN3')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS4 || 'S4')
      .appendField(new Blockly.FieldNumber(35, 0, 39), 'PIN4');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS5 || 'S5')
      .appendField(new Blockly.FieldNumber(32, 0, 39), 'PIN5')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS6 || 'S6')
      .appendField(new Blockly.FieldNumber(33, 0, 39), 'PIN6');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS7 || 'S7')
      .appendField(new Blockly.FieldNumber(25, 0, 39), 'PIN7')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS8 || 'S8')
      .appendField(new Blockly.FieldNumber(26, 0, 39), 'PIN8');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTERPIN || 'Emitter Pin')
      .appendField(new Blockly.FieldNumber(27, 0, 39), 'EMITTER')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTERNONE || '(0=None)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_QTR8AINITTOOLTIP || 'Initialize QTR-8A analog line sensor');
  }
};

javascriptGenerator.forBlock['qtr_8a_init'] = function(block: Blockly.Block) {
  const count = block.getFieldValue('COUNT');
  const pin1 = block.getFieldValue('PIN1');
  const pin2 = block.getFieldValue('PIN2');
  const pin3 = block.getFieldValue('PIN3');
  const pin4 = block.getFieldValue('PIN4');
  const pin5 = block.getFieldValue('PIN5');
  const pin6 = block.getFieldValue('PIN6');
  const pin7 = block.getFieldValue('PIN7');
  const pin8 = block.getFieldValue('PIN8');
  const emitter = block.getFieldValue('EMITTER');

  const pins = [pin1, pin2, pin3, pin4, pin5, pin6, pin7, pin8].slice(0, parseInt(count));

  javascriptGenerator.definitions_['qtr_include'] =
    `#include <QTRSensors.h>\n`;

  javascriptGenerator.definitions_['qtr_vars'] =
    `// QTRセンサー変数\n` +
    `#define QTR_SENSOR_COUNT ${count}\n` +
    `QTRSensors qtr;\n` +
    `uint16_t qtrSensorValues[QTR_SENSOR_COUNT];\n` +
    `bool qtrCalibrated = false;\n`;

  javascriptGenerator.setups_['qtr_setup'] =
    `// QTR-8A初期化\n` +
    `qtr.setTypeAnalog();\n` +
    `qtr.setSensorPins((const uint8_t[]){${pins.join(', ')}}, QTR_SENSOR_COUNT);\n` +
    (emitter !== 0 ? `qtr.setEmitterPin(${emitter});\n` : '');

  return '';
};

// ========================================
// QTR-8RC 初期化（デジタル）
// ========================================
Blockly.Blocks['qtr_8rc_init'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_QTR8RCINIT || 'Initialize QTR-8RC');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_SENSORCOUNT || 'Sensor Count')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT8 || '8', '8'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT6 || '6', '6'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT4 || '4', '4'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_COUNT3 || '3', '3']
      ]), 'COUNT');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS1 || 'S1')
      .appendField(new Blockly.FieldNumber(13, 0, 39), 'PIN1')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS2 || 'S2')
      .appendField(new Blockly.FieldNumber(12, 0, 39), 'PIN2');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS3 || 'S3')
      .appendField(new Blockly.FieldNumber(14, 0, 39), 'PIN3')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS4 || 'S4')
      .appendField(new Blockly.FieldNumber(27, 0, 39), 'PIN4');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS5 || 'S5')
      .appendField(new Blockly.FieldNumber(26, 0, 39), 'PIN5')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS6 || 'S6')
      .appendField(new Blockly.FieldNumber(25, 0, 39), 'PIN6');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS7 || 'S7')
      .appendField(new Blockly.FieldNumber(33, 0, 39), 'PIN7')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_PINS8 || 'S8')
      .appendField(new Blockly.FieldNumber(32, 0, 39), 'PIN8');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTERPIN || 'Emitter Pin')
      .appendField(new Blockly.FieldNumber(4, 0, 39), 'EMITTER')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTERNONE || '(0=None)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_QTR8RCINITTOOLTIP || 'Initialize QTR-8RC digital line sensor');
  }
};

javascriptGenerator.forBlock['qtr_8rc_init'] = function(block: Blockly.Block) {
  const count = block.getFieldValue('COUNT');
  const pin1 = block.getFieldValue('PIN1');
  const pin2 = block.getFieldValue('PIN2');
  const pin3 = block.getFieldValue('PIN3');
  const pin4 = block.getFieldValue('PIN4');
  const pin5 = block.getFieldValue('PIN5');
  const pin6 = block.getFieldValue('PIN6');
  const pin7 = block.getFieldValue('PIN7');
  const pin8 = block.getFieldValue('PIN8');
  const emitter = block.getFieldValue('EMITTER');

  const pins = [pin1, pin2, pin3, pin4, pin5, pin6, pin7, pin8].slice(0, parseInt(count));

  javascriptGenerator.definitions_['qtr_include'] =
    `#include <QTRSensors.h>\n`;

  javascriptGenerator.definitions_['qtr_vars'] =
    `// QTRセンサー変数\n` +
    `#define QTR_SENSOR_COUNT ${count}\n` +
    `QTRSensors qtr;\n` +
    `uint16_t qtrSensorValues[QTR_SENSOR_COUNT];\n` +
    `bool qtrCalibrated = false;\n`;

  javascriptGenerator.setups_['qtr_setup'] =
    `// QTR-8RC初期化\n` +
    `qtr.setTypeRC();\n` +
    `qtr.setSensorPins((const uint8_t[]){${pins.join(', ')}}, QTR_SENSOR_COUNT);\n` +
    (emitter !== 0 ? `qtr.setEmitterPin(${emitter});\n` : '');

  return '';
};

// ========================================
// QTRキャリブレーション
// ========================================
Blockly.Blocks['qtr_calibrate'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_CALIBRATE || 'QTR Calibration');
    this.appendValueInput('SAMPLES')
      .setCheck('Number')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_SAMPLES || 'Samples');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_CALIBRATEHINT || '(Move over line during calibration)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_CALIBRATETOOLTIP || 'Calibrate QTR sensors');
  }
};

javascriptGenerator.forBlock['qtr_calibrate'] = function(block: Blockly.Block) {
  const samples = javascriptGenerator.valueToCode(block, 'SAMPLES', Order.ATOMIC) || '400';

  return `// QTRキャリブレーション\n` +
    `for (int i = 0; i < ${samples}; i++) {\n` +
    `  qtr.calibrate();\n` +
    `  delay(2);\n` +
    `}\n` +
    `qtrCalibrated = true;\n`;
};

// ========================================
// 自動キャリブレーション（回転）
// ========================================
Blockly.Blocks['qtr_auto_calibrate'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_AUTOCALIBRATE || 'QTR Auto Calibrate');
    this.appendValueInput('DURATION')
      .setCheck('Number')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_DURATION || 'Duration (ms)');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_AUTOCALIBRATEHINT || '(Rotate robot during calibration)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_AUTOCALIBRATETOOLTIP || 'Auto calibrate while moving');
  }
};

javascriptGenerator.forBlock['qtr_auto_calibrate'] = function(block: Blockly.Block) {
  const duration = javascriptGenerator.valueToCode(block, 'DURATION', Order.ATOMIC) || '5000';

  return `// QTR自動キャリブレーション\n` +
    `{\n` +
    `  unsigned long startTime = millis();\n` +
    `  while (millis() - startTime < ${duration}) {\n` +
    `    qtr.calibrate();\n` +
    `    delay(2);\n` +
    `  }\n` +
    `  qtrCalibrated = true;\n` +
    `}\n`;
};

// ========================================
// ライン位置取得（高速）
// ========================================
Blockly.Blocks['qtr_line_position'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_LINEPOSITION || 'QTR Line Position');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_LINECOLOR || 'Line Color')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_QTR_WHITEONBLACK || 'White on Black', 'WHITE'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_BLACKONWHITE || 'Black on White', 'BLACK']
      ]), 'COLOR');
    this.setOutput(true, 'Number');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_LINEPOSITIONTOOLTIP || 'Get line position');
  }
};

javascriptGenerator.forBlock['qtr_line_position'] = function(block: Blockly.Block) {
  const color = block.getFieldValue('COLOR');
  if (color === 'WHITE') {
    return [`qtr.readLineWhite(qtrSensorValues)`, Order.FUNCTION_CALL];
  } else {
    return [`qtr.readLineBlack(qtrSensorValues)`, Order.FUNCTION_CALL];
  }
};

// ========================================
// ライン位置取得（-1000〜1000正規化）
// ========================================
Blockly.Blocks['qtr_line_position_normalized'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_LINEPOSITIONNORMALIZED || 'QTR Line Position (-1000~1000)');
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_LINECOLOR || 'Line Color')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_QTR_WHITEONBLACK || 'White on Black', 'WHITE'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_BLACKONWHITE || 'Black on White', 'BLACK']
      ]), 'COLOR');
    this.setOutput(true, 'Number');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_LINEPOSITIONNORMALIZEDTOOLTIP || 'Get normalized line position');
  }
};

javascriptGenerator.forBlock['qtr_line_position_normalized'] = function(block: Blockly.Block) {
  const color = block.getFieldValue('COLOR');

  javascriptGenerator.definitions_['qtr_normalized_func'] =
    `// 正規化されたライン位置取得\n` +
    `int getQtrLineNormalized(bool readWhite) {\n` +
    `  uint16_t pos;\n` +
    `  if (readWhite) {\n` +
    `    pos = qtr.readLineWhite(qtrSensorValues);\n` +
    `  } else {\n` +
    `    pos = qtr.readLineBlack(qtrSensorValues);\n` +
    `  }\n` +
    `  // 0〜(QTR_SENSOR_COUNT-1)*1000 を -1000〜1000 に変換\n` +
    `  int center = (QTR_SENSOR_COUNT - 1) * 500;\n` +
    `  return map(pos, 0, (QTR_SENSOR_COUNT - 1) * 1000, -1000, 1000);\n` +
    `}\n`;

  const readWhite = color === 'WHITE' ? 'true' : 'false';
  return [`getQtrLineNormalized(${readWhite})`, Order.FUNCTION_CALL];
};

// ========================================
// 個別センサー値取得
// ========================================
Blockly.Blocks['qtr_sensor_value'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_SENSORVALUE || 'QTR Sensor')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR1LEFT || 'S1 (Left)', '0'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR2 || 'S2', '1'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR3 || 'S3', '2'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR4 || 'S4', '3'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR5 || 'S5', '4'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR6 || 'S6', '5'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR7 || 'S7', '6'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_SENSOR8RIGHT || 'S8 (Right)', '7']
      ]), 'INDEX')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_VALUE || 'Value');
    this.setOutput(true, 'Number');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_SENSORVALUETOOLTIP || 'Get individual sensor value');
  }
};

javascriptGenerator.forBlock['qtr_sensor_value'] = function(block: Blockly.Block) {
  const index = block.getFieldValue('INDEX');

  javascriptGenerator.definitions_['qtr_get_value_func'] =
    `// センサー値取得\n` +
    `uint16_t getQtrSensorValue(int index) {\n` +
    `  qtr.readCalibrated(qtrSensorValues);\n` +
    `  return qtrSensorValues[index];\n` +
    `}\n`;

  return [`getQtrSensorValue(${index})`, Order.FUNCTION_CALL];
};

// ========================================
// 全センサー読み取り
// ========================================
Blockly.Blocks['qtr_read_all'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_READALL || 'Read All QTR Sensors');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_READALLTOOLTIP || 'Read all sensor values');
  }
};

javascriptGenerator.forBlock['qtr_read_all'] = function() {
  return `qtr.readCalibrated(qtrSensorValues);\n`;
};

// ========================================
// 生値読み取り（デバッグ用）
// ========================================
Blockly.Blocks['qtr_raw_value'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_RAWVALUE || 'QTR Sensor')
      .appendField(new Blockly.FieldNumber(0, 0, 7), 'INDEX')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_RAWVALUELABEL || 'Raw Value');
    this.setOutput(true, 'Number');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_RAWVALUETOOLTIP || 'Get raw sensor value');
  }
};

javascriptGenerator.forBlock['qtr_raw_value'] = function(block: Blockly.Block) {
  const index = block.getFieldValue('INDEX');

  javascriptGenerator.definitions_['qtr_get_raw_func'] =
    `// センサー生値取得\n` +
    `uint16_t getQtrRawValue(int index) {\n` +
    `  qtr.read(qtrSensorValues);\n` +
    `  return qtrSensorValues[index];\n` +
    `}\n`;

  return [`getQtrRawValue(${index})`, Order.FUNCTION_CALL];
};

// ========================================
// ライン検出判定
// ========================================
Blockly.Blocks['qtr_line_detected'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_LINEDETECTED || 'QTR Line Detected');
    this.appendValueInput('THRESHOLD')
      .setCheck('Number')
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_THRESHOLD || 'Threshold');
    this.setOutput(true, 'Boolean');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_LINEDETECTEDTOOLTIP || 'Check if line is detected');
  }
};

javascriptGenerator.forBlock['qtr_line_detected'] = function(block: Blockly.Block) {
  const threshold = javascriptGenerator.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '200';

  javascriptGenerator.definitions_['qtr_detected_func'] =
    `// ライン検出判定\n` +
    `bool isQtrLineDetected(uint16_t threshold) {\n` +
    `  qtr.readCalibrated(qtrSensorValues);\n` +
    `  for (int i = 0; i < QTR_SENSOR_COUNT; i++) {\n` +
    `    if (qtrSensorValues[i] > threshold) return true;\n` +
    `  }\n` +
    `  return false;\n` +
    `}\n`;

  return [`isQtrLineDetected(${threshold})`, Order.FUNCTION_CALL];
};

// ========================================
// キャリブレーション状態確認
// ========================================
Blockly.Blocks['qtr_is_calibrated'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_ISCALIBRATED || 'QTR Is Calibrated');
    this.setOutput(true, 'Boolean');
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_ISCALIBRATEDTOOLTIP || 'Check if QTR is calibrated');
  }
};

javascriptGenerator.forBlock['qtr_is_calibrated'] = function() {
  return ['qtrCalibrated', Order.ATOMIC];
};

// ========================================
// エミッター制御
// ========================================
Blockly.Blocks['qtr_emitter_control'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTERCONTROL || 'QTR Emitter')
      .appendField(new Blockly.FieldDropdown([
        [Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTERON || 'ON', 'ON'],
        [Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTEROFF || 'OFF', 'OFF']
      ]), 'STATE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_SENSOR_QTR_EMITTERCONTROLTOOLTIP || 'Control IR emitter');
  }
};

javascriptGenerator.forBlock['qtr_emitter_control'] = function(block: Blockly.Block) {
  const state = block.getFieldValue('STATE');
  if (state === 'ON') {
    return `qtr.emittersOn();\n`;
  } else {
    return `qtr.emittersOff();\n`;
  }
};

export {};
