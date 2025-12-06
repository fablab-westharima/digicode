/**
 * MicroPython センサーブロック
 * UIFlow2スタイル - 超音波、温湿度、デジタル/アナログセンサー
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const SENSOR_COLOR = '#FF9800';

// GPIOピン選択肢（ESP32）
const PIN_OPTIONS: [string, string][] = [
  ['GPIO2', '2'], ['GPIO4', '4'], ['GPIO5', '5'],
  ['GPIO12', '12'], ['GPIO13', '13'], ['GPIO14', '14'], ['GPIO15', '15'],
  ['GPIO16', '16'], ['GPIO17', '17'], ['GPIO18', '18'], ['GPIO19', '19'],
  ['GPIO21', '21'], ['GPIO22', '22'], ['GPIO23', '23'],
  ['GPIO25', '25'], ['GPIO26', '26'], ['GPIO27', '27'],
  ['GPIO32', '32'], ['GPIO33', '33'],
];

// ADC対応ピン
const ADC_PIN_OPTIONS: [string, string][] = [
  ['GPIO32', '32'], ['GPIO33', '33'], ['GPIO34', '34'], ['GPIO35', '35'],
  ['GPIO36', '36'], ['GPIO39', '39'],
];

// ========================================
// HC-SR04 超音波センサー初期化
// ========================================
Blockly.Blocks['mp_ultrasonic_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📡 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ULTRASONICINIT_LABEL || 'Ultrasonic Sensor Init'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ULTRASONICINIT_TRIG || 'Trig')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TRIG')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ULTRASONICINIT_ECHO || 'Echo')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'ECHO');
    this.setFieldValue('18', 'TRIG');
    this.setFieldValue('19', 'ECHO');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ULTRASONICINIT_TOOLTIP || 'Initialize HC-SR04 ultrasonic sensor');
  }
};

pythonGenerator.forBlock['mp_ultrasonic_init'] = function(block: Blockly.Block) {
  const trig = block.getFieldValue('TRIG');
  const echo = block.getFieldValue('ECHO');

  pyGen.definitions_['import_machine'] = 'from machine import Pin, time_pulse_us';
  pyGen.definitions_['import_time'] = 'import time';

  pyGen.definitions_['ultrasonic_class'] = `
class HCSR04:
    def __init__(self, trig_pin, echo_pin):
        self.trig = Pin(trig_pin, Pin.OUT)
        self.echo = Pin(echo_pin, Pin.IN)
        self.trig.value(0)

    def distance_cm(self):
        self.trig.value(0)
        time.sleep_us(2)
        self.trig.value(1)
        time.sleep_us(10)
        self.trig.value(0)

        try:
            duration = time_pulse_us(self.echo, 1, 30000)
            if duration < 0:
                return -1
            return (duration / 2) / 29.1
        except:
            return -1
`;

  pyGen.definitions_['ultrasonic_instance'] = `ultrasonic = HCSR04(${trig}, ${echo})`;

  return '';
};

// ========================================
// 超音波センサー距離取得
// ========================================
Blockly.Blocks['mp_ultrasonic_distance'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📏 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ULTRASONICDISTANCE_LABEL || 'Ultrasonic Distance') + ' (' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ULTRASONICDISTANCE_CM || 'cm') + ')');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ULTRASONICDISTANCE_TOOLTIP || 'Get distance measurement from ultrasonic sensor');
  }
};

pythonGenerator.forBlock['mp_ultrasonic_distance'] = function() {
  const code = 'ultrasonic.distance_cm()';
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// DHT11/DHT22 初期化
// ========================================
Blockly.Blocks['mp_dht_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🌡️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTINIT_LABEL || 'DHT Sensor Init'))
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTINIT_DHT11 || 'DHT11', '11'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTINIT_DHT22 || 'DHT22', '22']
      ]), 'TYPE')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PIN || 'Pin')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN');
    this.setFieldValue('4', 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTINIT_TOOLTIP || 'Initialize DHT temperature/humidity sensor');
  }
};

pythonGenerator.forBlock['mp_dht_init'] = function(block: Blockly.Block) {
  const type = block.getFieldValue('TYPE');
  const pin = block.getFieldValue('PIN');

  pyGen.definitions_['import_dht'] = 'import dht';
  pyGen.definitions_['import_machine_pin'] = 'from machine import Pin';

  if (type === '11') {
    pyGen.definitions_['dht_instance'] = `dht_sensor = dht.DHT11(Pin(${pin}))`;
  } else {
    pyGen.definitions_['dht_instance'] = `dht_sensor = dht.DHT22(Pin(${pin}))`;
  }

  return '';
};

// ========================================
// DHT 温度取得
// ========================================
Blockly.Blocks['mp_dht_temperature'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🌡️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTTEMPERATURE_LABEL || 'DHT Temperature') + ' (' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTTEMPERATURE_CELSIUS || '°C') + ')');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTTEMPERATURE_TOOLTIP || 'Get temperature from DHT sensor');
  }
};

pythonGenerator.forBlock['mp_dht_temperature'] = function() {
  pyGen.definitions_['dht_measure_func'] = `
def dht_measure():
    try:
        dht_sensor.measure()
        return True
    except:
        return False
`;
  const code = '(dht_measure() and dht_sensor.temperature())';
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// DHT 湿度取得
// ========================================
Blockly.Blocks['mp_dht_humidity'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('💧 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTHUMIDITY_LABEL || 'DHT Humidity') + ' (' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTHUMIDITY_PERCENT || '%') + ')');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DHTHUMIDITY_TOOLTIP || 'Get humidity from DHT sensor');
  }
};

pythonGenerator.forBlock['mp_dht_humidity'] = function() {
  pyGen.definitions_['dht_measure_func'] = `
def dht_measure():
    try:
        dht_sensor.measure()
        return True
    except:
        return False
`;
  const code = '(dht_measure() and dht_sensor.humidity())';
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// デジタルセンサー読み取り
// ========================================
Blockly.Blocks['mp_digital_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📟 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DIGITALSENSOR_LABEL || 'Digital Sensor'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PULLUP || 'Pull-up', 'PULL_UP'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PULLDOWN || 'Pull-down', 'PULL_DOWN'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_NONE || 'None', 'None']
      ]), 'PULL');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_DIGITALSENSOR_TOOLTIP || 'Read digital sensor state (0 or 1)');
  }
};

pythonGenerator.forBlock['mp_digital_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const pull = block.getFieldValue('PULL');

  pyGen.definitions_['import_machine'] = 'from machine import Pin';

  let pullStr = 'None';
  if (pull === 'PULL_UP') pullStr = 'Pin.PULL_UP';
  else if (pull === 'PULL_DOWN') pullStr = 'Pin.PULL_DOWN';

  pyGen.definitions_[`digital_in_${pin}`] = `digital_in_${pin} = Pin(${pin}, Pin.IN, ${pullStr})`;

  const code = `digital_in_${pin}.value()`;
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// ボタンセンサー
// ========================================
Blockly.Blocks['mp_button_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🔘 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_BUTTONSENSOR_LABEL || 'Button'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_BUTTONSENSOR_STATE || 'is')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_BUTTONSENSOR_PRESSED || 'pressed', 'pressed'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_BUTTONSENSOR_RELEASED || 'released', 'released']
      ]), 'STATE');
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_BUTTONSENSOR_TOOLTIP || 'Check button state (using pull-up resistor)');
  }
};

pythonGenerator.forBlock['mp_button_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const state = block.getFieldValue('STATE');

  pyGen.definitions_['import_machine'] = 'from machine import Pin';
  pyGen.definitions_[`button_${pin}`] = `button_${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;

  let code: string;
  if (state === 'pressed') {
    code = `(button_${pin}.value() == 0)`;
  } else {
    code = `(button_${pin}.value() == 1)`;
  }
  return [code, pyGen.ORDER_COMPARISON];
};

// ========================================
// PIRセンサー
// ========================================
Blockly.Blocks['mp_pir_sensor'] = {
  init: function(this: Blockly.Block) {
    const stateText = (Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_PIRSENSOR_STATE || 'motion detected?';
    this.appendDummyInput()
      .appendField('🚶 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_PIRSENSOR_LABEL || 'PIR Motion Sensor'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN')
      .appendField(stateText);
    this.setOutput(true, 'Boolean');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_PIRSENSOR_TOOLTIP || 'Detect motion using PIR sensor');
  }
};

pythonGenerator.forBlock['mp_pir_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  pyGen.definitions_['import_machine'] = 'from machine import Pin';
  pyGen.definitions_[`pir_${pin}`] = `pir_${pin} = Pin(${pin}, Pin.IN)`;

  const code = `(pir_${pin}.value() == 1)`;
  return [code, pyGen.ORDER_COMPARISON];
};

// ========================================
// アナログセンサー読み取り
// ========================================
Blockly.Blocks['mp_analog_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📊 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ANALOGSENSOR_LABEL || 'Analog Sensor'))
      .appendField(new Blockly.FieldDropdown(ADC_PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_RAW || 'Raw(0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_VOLTAGE || 'Voltage(0-3.3V)', 'voltage'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PERCENT || 'Percent(0-100)', 'percent']
      ]), 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_ANALOGSENSOR_TOOLTIP || 'Read analog sensor value (0-4095)');
  }
};

pythonGenerator.forBlock['mp_analog_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  pyGen.definitions_['import_adc'] = 'from machine import Pin, ADC';
  pyGen.definitions_[`adc_${pin}`] = `adc_${pin} = ADC(Pin(${pin}))\nadc_${pin}.atten(ADC.ATTN_11DB)`;

  let code: string;
  if (mode === 'raw') {
    code = `adc_${pin}.read()`;
  } else if (mode === 'voltage') {
    code = `(adc_${pin}.read() * 3.3 / 4095)`;
  } else {
    code = `(adc_${pin}.read() * 100 // 4095)`;
  }
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// 光センサー（LDR）
// ========================================
Blockly.Blocks['mp_ldr_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('☀️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_LDRSENSOR_LABEL || 'LDR Light Sensor'))
      .appendField(new Blockly.FieldDropdown(ADC_PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_RAW || 'Raw(0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PERCENT || 'Percent(0-100)', 'percent']
      ]), 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_LDRSENSOR_TOOLTIP || 'Measure brightness using LDR (Light Dependent Resistor)');
  }
};

pythonGenerator.forBlock['mp_ldr_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  pyGen.definitions_['import_adc'] = 'from machine import Pin, ADC';
  pyGen.definitions_[`ldr_${pin}`] = `ldr_${pin} = ADC(Pin(${pin}))\nldr_${pin}.atten(ADC.ATTN_11DB)`;

  let code: string;
  if (mode === 'raw') {
    code = `ldr_${pin}.read()`;
  } else {
    code = `(ldr_${pin}.read() * 100 // 4095)`;
  }
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// 土壌水分センサー
// ========================================
Blockly.Blocks['mp_soil_sensor'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🌱 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_SOILSENSOR_LABEL || 'Soil Moisture Sensor'))
      .appendField(new Blockly.FieldDropdown(ADC_PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_RAW || 'Raw(0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_SOILSENSOR_MOISTURE || 'Moisture%(0-100)', 'percent']
      ]), 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_SOILSENSOR_TOOLTIP || 'Measure soil moisture level');
  }
};

pythonGenerator.forBlock['mp_soil_sensor'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  pyGen.definitions_['import_adc'] = 'from machine import Pin, ADC';
  pyGen.definitions_[`soil_${pin}`] = `soil_${pin} = ADC(Pin(${pin}))\nsoil_${pin}.atten(ADC.ATTN_11DB)`;

  let code: string;
  if (mode === 'raw') {
    code = `soil_${pin}.read()`;
  } else {
    // 反転（高い値=乾燥→低い％）
    code = `((4095 - soil_${pin}.read()) * 100 // 4095)`;
  }
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// ポテンショメータ
// ========================================
Blockly.Blocks['mp_potentiometer'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🎚️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_POTENTIOMETER_LABEL || 'Potentiometer'))
      .appendField(new Blockly.FieldDropdown(ADC_PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_RAW || 'Raw(0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PERCENT || 'Percent(0-100)', 'percent'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_ANGLE || 'Angle(0-270)', 'angle']
      ]), 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_SENSOR_POTENTIOMETER_TOOLTIP || 'Read potentiometer value (0-4095)');
  }
};

pythonGenerator.forBlock['mp_potentiometer'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  pyGen.definitions_['import_adc'] = 'from machine import Pin, ADC';
  pyGen.definitions_[`pot_${pin}`] = `pot_${pin} = ADC(Pin(${pin}))\npot_${pin}.atten(ADC.ATTN_11DB)`;

  let code: string;
  if (mode === 'raw') {
    code = `pot_${pin}.read()`;
  } else if (mode === 'percent') {
    code = `(pot_${pin}.read() * 100 // 4095)`;
  } else {
    code = `(pot_${pin}.read() * 270 // 4095)`;
  }
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

export {};
