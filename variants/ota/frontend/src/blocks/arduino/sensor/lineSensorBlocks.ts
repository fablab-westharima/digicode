/**
 * ラインセンサーブロック定義
 * QTR-8RC、TCRT5000などのラインセンサー用
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// ========================================
// ラインセンサー初期化（動的ピン入力）
// ========================================
// デフォルトのピン番号
const DEFAULT_PINS: Record<number, number[]> = {
  2: [36, 39],
  3: [36, 34, 39],
  4: [36, 34, 35, 39],
  5: [36, 34, 32, 35, 39],
  6: [36, 34, 32, 33, 35, 39],
  8: [36, 34, 32, 33, 25, 26, 35, 39],
};

Blockly.Blocks['line_sensor_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_INIT || 'Initialize Line Sensors');
    this.appendDummyInput('COUNT_INPUT')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_COUNT || 'Sensor Count')
      .appendField(new Blockly.FieldDropdown(
        [
          [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_COUNT2 || '2', '2'],
          [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_COUNT3 || '3', '3'],
          [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_COUNT4 || '4', '4'],
          [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_COUNT5 || '5', '5'],
          [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_COUNT6 || '6', '6'],
          [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_COUNT8 || '8', '8']
        ],
        (this as any).updatePinInputs_.bind(this)
      ) as any, 'COUNT');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_INITTOOLTIP || 'Initialize line sensors');

    // 初期状態で2個のピン入力を追加
    (this as any).pinCount_ = 2;
    (this as any).updatePinInputs_('2');
  },

  pinCount_: 2,

  updatePinInputs_: function(this: Blockly.Block, newValue: string) {
    const newCount = parseInt(newValue, 10);
    // oldCount preserved for potential future use in incremental updates
    const _oldCount = (this as any).pinCount_ || 0;

    // 既存のピン入力を削除
    for (let i = 1; i <= 8; i++) {
      if (this.getInput(`PIN_ROW_${i}`)) {
        this.removeInput(`PIN_ROW_${i}`);
      }
    }

    // 新しいピン入力を追加（1行に3つまで）
    const defaults = DEFAULT_PINS[newCount] || [];
    let pinIndex = 0;
    let rowNum = 1;

    while (pinIndex < newCount) {
      const input = this.appendDummyInput(`PIN_ROW_${rowNum}`);

      // 1行に最大3つのピン入力
      for (let col = 0; col < 3 && pinIndex < newCount; col++) {
        const pinNum = pinIndex + 1;
        const defaultPin = defaults[pinIndex] || 36;

        if (col > 0) input.appendField(' ');
        input.appendField(`S${pinNum}`)
          .appendField(new Blockly.FieldNumber(defaultPin, 0, 39), `PIN${pinNum}`);

        pinIndex++;
      }
      rowNum++;
    }

    (this as any).pinCount_ = newCount;
    return newValue;
  },

  // ブロックの状態を保存（XMLシリアライズ用）
  mutationToDom: function(this: Blockly.Block) {
    const container = Blockly.utils.xml.createElement('mutation');
    container.setAttribute('pincount', String((this as any).pinCount_));
    return container;
  },

  // ブロックの状態を復元
  domToMutation: function(this: Blockly.Block, xmlElement: Element) {
    const count = xmlElement.getAttribute('pincount');
    if (count) {
      (this as any).pinCount_ = parseInt(count, 10);
      (this as any).updatePinInputs_(count);
      // ドロップダウンの値も更新
      this.setFieldValue(count, 'COUNT');
    }
  }
};

javascriptGenerator.forBlock['line_sensor_init'] = function(block: Blockly.Block) {
  const count = parseInt(block.getFieldValue('COUNT'), 10);

  // 各ピン番号を取得
  const pins: number[] = [];
  for (let i = 1; i <= count; i++) {
    pins.push(block.getFieldValue(`PIN${i}`) || 36);
  }
  const pinsStr = pins.join(', ');

  javascriptGenerator.definitions_['line_sensor_vars'] =
    `// ラインセンサー変数\n` +
    `#define LINE_SENSOR_COUNT ${count}\n` +
    `int lineSensorPins[LINE_SENSOR_COUNT] = {${pinsStr}};\n` +
    `int lineSensorValues[LINE_SENSOR_COUNT];\n` +
    `int lineSensorMin[LINE_SENSOR_COUNT];\n` +
    `int lineSensorMax[LINE_SENSOR_COUNT];\n` +
    `bool lineSensorCalibrated = false;\n`;

  javascriptGenerator.definitions_['line_sensor_funcs'] =
    `// ラインセンサー読み取り関数\n` +
    `void readLineSensors() {\n` +
    `  for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `    lineSensorValues[i] = analogRead(lineSensorPins[i]);\n` +
    `  }\n` +
    `}\n\n` +
    `// キャリブレーション済み値取得 (0-1000)\n` +
    `int getLineSensorCalibrated(int index) {\n` +
    `  if (!lineSensorCalibrated || index >= LINE_SENSOR_COUNT) return 0;\n` +
    `  int range = lineSensorMax[index] - lineSensorMin[index];\n` +
    `  if (range == 0) return 500;\n` +
    `  return constrain(map(lineSensorValues[index], lineSensorMin[index], lineSensorMax[index], 0, 1000), 0, 1000);\n` +
    `}\n\n` +
    `// ライン位置計算 (-1000=左端, 0=中央, 1000=右端)\n` +
    `int getLinePosition() {\n` +
    `  readLineSensors();\n` +
    `  long weightedSum = 0;\n` +
    `  long sum = 0;\n` +
    `  for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `    int value = getLineSensorCalibrated(i);\n` +
    `    weightedSum += (long)value * (i * 1000);\n` +
    `    sum += value;\n` +
    `  }\n` +
    `  if (sum == 0) return 0;\n` +
    `  return (weightedSum / sum) - ((LINE_SENSOR_COUNT - 1) * 500);\n` +
    `}\n`;

  javascriptGenerator.setups_['line_sensor_setup'] =
    `// ラインセンサー初期化\n` +
    `for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `  pinMode(lineSensorPins[i], INPUT);\n` +
    `  lineSensorMin[i] = 4095;\n` +
    `  lineSensorMax[i] = 0;\n` +
    `}\n`;

  return '';
};

// ========================================
// ラインセンサー簡易初期化（固定ピン）
// ========================================
Blockly.Blocks['line_sensor_init_simple'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_INITSIMPLE5 || 'Initialize 5-Point Line Sensor');
    this.appendDummyInput()
      .appendField('S1')
      .appendField(new Blockly.FieldNumber(36, 0, 39), 'PIN1')
      .appendField(' S2')
      .appendField(new Blockly.FieldNumber(39, 0, 39), 'PIN2')
      .appendField(' S3')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN3');
    this.appendDummyInput()
      .appendField('S4')
      .appendField(new Blockly.FieldNumber(35, 0, 39), 'PIN4')
      .appendField(' S5')
      .appendField(new Blockly.FieldNumber(32, 0, 39), 'PIN5');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_INITSIMPLE5TOOLTIP || 'Initialize 5-point line sensor');
  }
};

javascriptGenerator.forBlock['line_sensor_init_simple'] = function(block: Blockly.Block) {
  const pin1 = block.getFieldValue('PIN1');
  const pin2 = block.getFieldValue('PIN2');
  const pin3 = block.getFieldValue('PIN3');
  const pin4 = block.getFieldValue('PIN4');
  const pin5 = block.getFieldValue('PIN5');

  javascriptGenerator.definitions_['line_sensor_vars'] =
    `// ラインセンサー変数\n` +
    `#define LINE_SENSOR_COUNT 5\n` +
    `int lineSensorPins[LINE_SENSOR_COUNT] = {${pin1}, ${pin2}, ${pin3}, ${pin4}, ${pin5}};\n` +
    `int lineSensorValues[LINE_SENSOR_COUNT];\n` +
    `int lineSensorMin[LINE_SENSOR_COUNT];\n` +
    `int lineSensorMax[LINE_SENSOR_COUNT];\n` +
    `bool lineSensorCalibrated = false;\n`;

  javascriptGenerator.definitions_['line_sensor_funcs'] =
    `// ラインセンサー読み取り関数\n` +
    `void readLineSensors() {\n` +
    `  for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `    lineSensorValues[i] = analogRead(lineSensorPins[i]);\n` +
    `  }\n` +
    `}\n\n` +
    `// キャリブレーション済み値取得 (0-1000)\n` +
    `int getLineSensorCalibrated(int index) {\n` +
    `  if (!lineSensorCalibrated || index >= LINE_SENSOR_COUNT) return 0;\n` +
    `  int range = lineSensorMax[index] - lineSensorMin[index];\n` +
    `  if (range == 0) return 500;\n` +
    `  return constrain(map(lineSensorValues[index], lineSensorMin[index], lineSensorMax[index], 0, 1000), 0, 1000);\n` +
    `}\n\n` +
    `// ライン位置計算 (-1000=左端, 0=中央, 1000=右端)\n` +
    `int getLinePosition() {\n` +
    `  readLineSensors();\n` +
    `  long weightedSum = 0;\n` +
    `  long sum = 0;\n` +
    `  for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `    int value = getLineSensorCalibrated(i);\n` +
    `    weightedSum += (long)value * (i * 1000);\n` +
    `    sum += value;\n` +
    `  }\n` +
    `  if (sum == 0) return 0;\n` +
    `  return (weightedSum / sum) - ((LINE_SENSOR_COUNT - 1) * 500);\n` +
    `}\n`;

  javascriptGenerator.setups_['line_sensor_setup'] =
    `// ラインセンサー初期化\n` +
    `for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `  pinMode(lineSensorPins[i], INPUT);\n` +
    `  lineSensorMin[i] = 4095;\n` +
    `  lineSensorMax[i] = 0;\n` +
    `}\n`;

  return '';
};

// ========================================
// ラインセンサー簡易初期化（2個）
// ========================================
Blockly.Blocks['line_sensor_init_simple_2'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_INITTCRT || 'Initialize TCRT5000 (2 sensors)');
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_LEFTS1 || 'Left S1')
      .appendField(new Blockly.FieldNumber(36, 0, 39), 'PIN1')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_RIGHTS2 || 'Right S2')
      .appendField(new Blockly.FieldNumber(39, 0, 39), 'PIN2');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_INITTCRTTOOLTIP || 'Initialize 2-point line sensor');
  }
};

javascriptGenerator.forBlock['line_sensor_init_simple_2'] = function(block: Blockly.Block) {
  const pin1 = block.getFieldValue('PIN1');
  const pin2 = block.getFieldValue('PIN2');

  javascriptGenerator.definitions_['line_sensor_vars'] =
    `// ラインセンサー変数\n` +
    `#define LINE_SENSOR_COUNT 2\n` +
    `int lineSensorPins[LINE_SENSOR_COUNT] = {${pin1}, ${pin2}};\n` +
    `int lineSensorValues[LINE_SENSOR_COUNT];\n` +
    `int lineSensorMin[LINE_SENSOR_COUNT];\n` +
    `int lineSensorMax[LINE_SENSOR_COUNT];\n` +
    `bool lineSensorCalibrated = false;\n`;

  javascriptGenerator.definitions_['line_sensor_funcs'] =
    `// ラインセンサー読み取り関数\n` +
    `void readLineSensors() {\n` +
    `  for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `    lineSensorValues[i] = analogRead(lineSensorPins[i]);\n` +
    `  }\n` +
    `}\n\n` +
    `// キャリブレーション済み値取得 (0-1000)\n` +
    `int getLineSensorCalibrated(int index) {\n` +
    `  if (!lineSensorCalibrated || index >= LINE_SENSOR_COUNT) return 0;\n` +
    `  int range = lineSensorMax[index] - lineSensorMin[index];\n` +
    `  if (range == 0) return 500;\n` +
    `  return constrain(map(lineSensorValues[index], lineSensorMin[index], lineSensorMax[index], 0, 1000), 0, 1000);\n` +
    `}\n\n` +
    `// ライン位置計算 (-1000=左端, 0=中央, 1000=右端)\n` +
    `int getLinePosition() {\n` +
    `  readLineSensors();\n` +
    `  long weightedSum = 0;\n` +
    `  long sum = 0;\n` +
    `  for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `    int value = getLineSensorCalibrated(i);\n` +
    `    weightedSum += (long)value * (i * 1000);\n` +
    `    sum += value;\n` +
    `  }\n` +
    `  if (sum == 0) return 0;\n` +
    `  return (weightedSum / sum) - ((LINE_SENSOR_COUNT - 1) * 500);\n` +
    `}\n`;

  javascriptGenerator.setups_['line_sensor_setup'] =
    `// ラインセンサー初期化\n` +
    `for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `  pinMode(lineSensorPins[i], INPUT);\n` +
    `  lineSensorMin[i] = 4095;\n` +
    `  lineSensorMax[i] = 0;\n` +
    `}\n`;

  return '';
};

// ========================================
// キャリブレーション
// ========================================
Blockly.Blocks['line_sensor_calibrate'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_CALIBRATE || 'Calibrate Line Sensors');
    this.appendValueInput('DURATION')
      .setCheck('Number')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_DURATION || 'Duration (ms)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_CALIBRATETOOLTIP || 'Calibrate line sensors');
  }
};

javascriptGenerator.forBlock['line_sensor_calibrate'] = function(block: Blockly.Block) {
  const duration = javascriptGenerator.valueToCode(block, 'DURATION', Order.ATOMIC) || '3000';

  return `// ラインセンサーキャリブレーション\n` +
    `{\n` +
    `  unsigned long startTime = millis();\n` +
    `  while (millis() - startTime < ${duration}) {\n` +
    `    readLineSensors();\n` +
    `    for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `      if (lineSensorValues[i] < lineSensorMin[i]) lineSensorMin[i] = lineSensorValues[i];\n` +
    `      if (lineSensorValues[i] > lineSensorMax[i]) lineSensorMax[i] = lineSensorValues[i];\n` +
    `    }\n` +
    `    delay(10);\n` +
    `  }\n` +
    `  lineSensorCalibrated = true;\n` +
    `}\n`;
};

// ========================================
// ライン位置取得
// ========================================
Blockly.Blocks['line_sensor_position'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_POSITION || 'Line Position');
    this.setOutput(true, 'Number');
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_POSITIONTOOLTIP || 'Get line position');
  }
};

javascriptGenerator.forBlock['line_sensor_position'] = function() {
  return ['getLinePosition()', Order.FUNCTION_CALL];
};

// ========================================
// 個別センサー値取得
// ========================================
Blockly.Blocks['line_sensor_value'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_SENSOR || 'Sensor')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_SENSOR1LEFT || 'S1 (Left)', '0'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_SENSOR2 || 'S2', '1'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_SENSOR3CENTER || 'S3 (Center)', '2'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_SENSOR4 || 'S4', '3'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_SENSOR5RIGHT || 'S5 (Right)', '4']
      ]) as any, 'INDEX')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_VALUE || 'Value');
    this.setOutput(true, 'Number');
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_VALUETOOLTIP || 'Get sensor value');
  }
};

javascriptGenerator.forBlock['line_sensor_value'] = function(block: Blockly.Block) {
  const index = block.getFieldValue('INDEX');
  return [`(readLineSensors(), getLineSensorCalibrated(${index}))`, Order.FUNCTION_CALL];
};

// ========================================
// ライン検出判定
// ========================================
Blockly.Blocks['line_sensor_detected'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_DETECTED || 'Line Detected');
    this.appendValueInput('THRESHOLD')
      .setCheck('Number')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_THRESHOLD || 'Threshold');
    this.setOutput(true, 'Boolean');
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_DETECTEDTOOLTIP || 'Check if line is detected');
  }
};

javascriptGenerator.forBlock['line_sensor_detected'] = function(block: Blockly.Block) {
  const threshold = javascriptGenerator.valueToCode(block, 'THRESHOLD', Order.ATOMIC) || '500';

  javascriptGenerator.definitions_['line_detected_func'] =
    `bool isLineDetected(int threshold) {\n` +
    `  readLineSensors();\n` +
    `  for (int i = 0; i < LINE_SENSOR_COUNT; i++) {\n` +
    `    if (getLineSensorCalibrated(i) > threshold) return true;\n` +
    `  }\n` +
    `  return false;\n` +
    `}\n`;

  return [`isLineDetected(${threshold})`, Order.FUNCTION_CALL];
};

// ========================================
// 生値取得（デバッグ用）
// ========================================
Blockly.Blocks['line_sensor_raw'] = {
  init: function() {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_SENSOR || 'Sensor')
      .appendField(new Blockly.FieldNumber(0, 0, 7), 'INDEX')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_RAWVALUE || 'Raw Value');
    this.setOutput(true, 'Number');
    this.setColour('#E91E63');
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LINESENSOR_RAWVALUETOOLTIP || 'Get raw sensor value');
  }
};

javascriptGenerator.forBlock['line_sensor_raw'] = function(block: Blockly.Block) {
  const index = block.getFieldValue('INDEX');
  return [`(readLineSensors(), lineSensorValues[${index}])`, Order.FUNCTION_CALL];
};

export {};
