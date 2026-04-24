/**
 * アナログセンサーブロック（Arduino C++）
 *
 * i18n: Uses Blockly.Msg.* for dynamic language switching
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const SENSOR_COLOR = '#10b981';  // Green - アナログセンサー

// ========================================
// ポテンショメータ
// ========================================
Blockly.Blocks['potentiometer'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_POTENTIOMETER_LABEL || 'Potentiometer Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_POTENTIOMETER_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_POTENTIOMETER_PERCENT || 'Percent (0-100)', 'percent'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_POTENTIOMETER_ANGLE || 'Angle (0-270)', 'angle']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_POTENTIOMETER_TOOLTIP || 'Read potentiometer value');
  }
};

javascriptGenerator.forBlock['potentiometer'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`pot_pin_${pin}`] = `#define POT_PIN_${pin} ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(POT_PIN_${pin})`;
  } else if (mode === 'percent') {
    code = `map(analogRead(POT_PIN_${pin}), 0, 4095, 0, 100)`;
  } else {
    code = `map(analogRead(POT_PIN_${pin}), 0, 4095, 0, 270)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 光センサー（LDR/CdS）
// ========================================
Blockly.Blocks['ldr_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LDR_LABEL || 'Light Sensor (LDR) Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_LDR_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_LDR_PERCENT || 'Percent (0-100)', 'percent']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LDR_TOOLTIP || 'Measure light intensity');
  }
};

javascriptGenerator.forBlock['ldr_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`ldr_pin_${pin}`] = `#define LDR_PIN_${pin} ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(LDR_PIN_${pin})`;
  } else {
    code = `map(analogRead(LDR_PIN_${pin}), 0, 4095, 0, 100)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 温度センサー（NTC サーミスタ）
// ========================================
Blockly.Blocks['thermistor_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_THERMISTOR_LABEL || 'Thermistor Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_THERMISTOR_UNIT || 'Temp (°C)');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_THERMISTOR_TOOLTIP || 'Measure temperature with NTC thermistor');
  }
};

javascriptGenerator.forBlock['thermistor_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`thermistor_pin_${pin}`] = `#define THERMISTOR_PIN_${pin} ${pin}`;
  generator.definitions_['thermistor_function'] =
    `// NTC Thermistor temperature calculation\n` +
    `float readThermistor(int pin) {\n` +
    `  int adc = analogRead(pin);\n` +
    `  float resistance = 10000.0 * adc / (4095 - adc);\n` +
    `  float temp = 1.0 / (log(resistance / 10000.0) / 3950.0 + 1.0 / 298.15) - 273.15;\n` +
    `  return temp;\n` +
    `}`;

  const code = `readThermistor(THERMISTOR_PIN_${pin})`;
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 温度センサー（LM35）
// ========================================
Blockly.Blocks['lm35_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LM35_LABEL || 'LM35 Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_LM35_UNIT || 'Temp (°C)');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_LM35_TOOLTIP || 'Measure temperature with LM35 sensor');
  }
};

javascriptGenerator.forBlock['lm35_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_[`lm35_pin_${pin}`] = `#define LM35_PIN_${pin} ${pin}`;

  // LM35: 10mV/℃, ESP32 ADC: 3.3V/4095 = 0.806mV/bit
  const code = `(analogRead(LM35_PIN_${pin}) * 0.0806)`;
  return [code, Order.MULTIPLICATION];
};

// ========================================
// ガスセンサー（アナログ MQ-2等）
// ========================================
Blockly.Blocks['gas_sensor_analog'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_GAS_LABEL || 'Gas Sensor(A) Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_GAS_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_GAS_PERCENT || 'Percent (0-100)', 'percent']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_GAS_TOOLTIP || 'Read gas sensor value');
  }
};

javascriptGenerator.forBlock['gas_sensor_analog'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`gas_pin_${pin}`] = `#define GAS_APIN_${pin} ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(GAS_APIN_${pin})`;
  } else {
    code = `map(analogRead(GAS_APIN_${pin}), 0, 4095, 0, 100)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 土壌水分センサー
// ========================================
Blockly.Blocks['soil_moisture_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_SOILMOISTURE_LABEL || 'Soil Moisture Sensor Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_SOILMOISTURE_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_SOILMOISTURE_PERCENT || 'Percent (0-100)', 'percent']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_SOILMOISTURE_TOOLTIP || 'Measure soil moisture');
  }
};

javascriptGenerator.forBlock['soil_moisture_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`soil_pin_${pin}`] = `#define SOIL_PIN_${pin} ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(SOIL_PIN_${pin})`;
  } else {
    // 反転（高い値 = 乾燥 → 低いパーセント）
    code = `map(analogRead(SOIL_PIN_${pin}), 4095, 0, 0, 100)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 水位センサー
// ========================================
Blockly.Blocks['water_level_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_WATERLEVEL_LABEL || 'Water Level Sensor Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_WATERLEVEL_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_WATERLEVEL_PERCENT || 'Percent (0-100)', 'percent']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_WATERLEVEL_TOOLTIP || 'Measure water level');
  }
};

javascriptGenerator.forBlock['water_level_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`water_pin_${pin}`] = `#define WATER_PIN_${pin} ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(WATER_PIN_${pin})`;
  } else {
    code = `map(analogRead(WATER_PIN_${pin}), 0, 4095, 0, 100)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// 炎センサー（アナログ）
// ========================================
Blockly.Blocks['flame_sensor_analog'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_FLAME_LABEL || 'Flame Sensor(A) Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_FLAME_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_FLAME_PERCENT || 'Percent (0-100)', 'percent']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_FLAME_TOOLTIP || 'Measure flame intensity');
  }
};

javascriptGenerator.forBlock['flame_sensor_analog'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`flame_apin_${pin}`] = `#define FLAME_APIN_${pin} ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(FLAME_APIN_${pin})`;
  } else {
    // 反転（低い値 = 炎検出 → 高いパーセント）
    code = `map(analogRead(FLAME_APIN_${pin}), 4095, 0, 0, 100)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// IR反射センサー（アナログ）
// ========================================
Blockly.Blocks['ir_reflective_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_IRREFLECTIVE_LABEL || 'IR Reflective Sensor Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_IRREFLECTIVE_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_IRREFLECTIVE_PERCENT || 'Percent (0-100)', 'percent']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_IRREFLECTIVE_TOOLTIP || 'Measure IR reflection');
  }
};

javascriptGenerator.forBlock['ir_reflective_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`ir_ref_pin_${pin}`] = `#define IR_REF_PIN_${pin} ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(IR_REF_PIN_${pin})`;
  } else {
    code = `map(analogRead(IR_REF_PIN_${pin}), 0, 4095, 0, 100)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// ジョイスティック（2軸）
// ========================================
Blockly.Blocks['joystick_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_JOYSTICK_LABEL || 'Joystick')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_JOYSTICK_XAXIS || 'X-Axis', 'X'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_JOYSTICK_YAXIS || 'Y-Axis', 'Y']
      ]) as any, 'AXIS')
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_JOYSTICK_PIN || 'Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_SENSOR_JOYSTICK_RAW || 'Raw (0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_SENSOR_JOYSTICK_PERCENT || 'Percent (-100 to 100)', 'percent']
      ]) as any, 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_JOYSTICK_TOOLTIP || 'Read joystick position');
  }
};

javascriptGenerator.forBlock['joystick_sensor'] = function(block: Blockly.Block) {
  const axis = block.getFieldValue('AXIS');
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  generator.definitions_[`joy_${axis}_pin_${pin}`] = `#define JOY_${axis}_PIN ${pin}`;

  let code: string;
  if (mode === 'raw') {
    code = `analogRead(JOY_${axis}_PIN)`;
  } else {
    code = `map(analogRead(JOY_${axis}_PIN), 0, 4095, -100, 100)`;
  }
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// アナログ入力（汎用）
// ========================================
Blockly.Blocks['analog_read'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_SENSOR_ANALOGREAD_LABEL || 'Analog Read Pin')
      .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_SENSOR_ANALOGREAD_TOOLTIP || 'Read analog pin value (0-4095)');
  }
};

javascriptGenerator.forBlock['analog_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const code = `analogRead(${pin})`;
  return [code, Order.FUNCTION_CALL];
};

// ========================================
// バッテリー電圧監視 (BP5-6, 2026-04-20)
// ========================================
const BATTERY_COLOR = '#FF9800';

/**
 * battery_voltage - ADC 経由でバッテリー電圧を計測
 */
Blockly.Blocks['battery_voltage'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
        .appendField('🔋 ' + ((Blockly.Msg as any).BLOCKS_BATTERY_VOLTAGE || 'Battery Voltage (V)'));
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_BATTERY_ADCPIN || 'ADC pin')
        .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
        .appendField((Blockly.Msg as any).BLOCKS_BATTERY_DIVIDER || 'divider ratio')
        .appendField(new Blockly.FieldNumber(2.0, 1.0, 10.0, 0.1), 'RATIO');
    this.setOutput(true, 'Number');
    this.setColour(BATTERY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BATTERY_VOLTAGETOOLTIP || 'Read battery voltage via ADC with a resistor divider. Set divider ratio (e.g. 2.0 for equal resistors). Returns voltage in V.');
  }
};

generator.forBlock['battery_voltage'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const ratio = block.getFieldValue('RATIO');
  return [`(analogRead(${pin}) / 4095.0 * 3.3 * ${ratio})`, 0];
};

/**
 * battery_percentage - バッテリー残量をパーセントで返す
 */
Blockly.Blocks['battery_percentage'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
        .appendField('🔋 ' + ((Blockly.Msg as any).BLOCKS_BATTERY_PERCENTAGE || 'Battery %'));
    this.appendValueInput('VOLTAGE')
        .setCheck('Number')
        .appendField((Blockly.Msg as any).BLOCKS_BATTERY_VOLTAGE_INPUT || 'voltage (V)');
    this.appendDummyInput()
        .appendField((Blockly.Msg as any).BLOCKS_BATTERY_MINV || 'min V')
        .appendField(new Blockly.FieldNumber(3.0, 0, 20, 0.1), 'MIN_V')
        .appendField((Blockly.Msg as any).BLOCKS_BATTERY_MAXV || 'max V')
        .appendField(new Blockly.FieldNumber(4.2, 0, 20, 0.1), 'MAX_V');
    this.setOutput(true, 'Number');
    this.setColour(BATTERY_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_BATTERY_PERCENTAGETOOLTIP || 'Convert battery voltage to percentage (0-100%). Set min/max voltage for your battery type (Li-ion: 3.0-4.2V).');
  }
};

generator.forBlock['battery_percentage'] = function(block: Blockly.Block) {
  const voltage = javascriptGenerator.valueToCode(block, 'VOLTAGE', Order.NONE) || '3.7';
  const minV = block.getFieldValue('MIN_V');
  const maxV = block.getFieldValue('MAX_V');
  return [`constrain((int)(((${voltage}) - ${minV}) / (${maxV} - ${minV}) * 100.0), 0, 100)`, 0];
};

export {};
