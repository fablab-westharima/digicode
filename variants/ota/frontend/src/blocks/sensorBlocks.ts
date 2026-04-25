/*
 * DigiCode Sensor Blocks
 *
 * Blocks for various sensors (ultrasonic, DHT, etc.)
 * Supports both Arduino C++ and MicroPython.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import { getSensorPins } from '../utils/pinHelper';
import { t } from '../utils/blocklyI18n';

// 型アサーション用のヘルパー（definitions_やsetups_はprotectedまたは存在しないため）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

// センサーブロックの色定義（種類ごとに異なる色）
const SENSOR_COLOR_ULTRASONIC = '#3b82f6';  // Blue - 超音波センサー
const SENSOR_COLOR_DHT = '#06b6d4';         // Cyan - 温湿度センサー

// Helper function to get translated color dropdown options
const getColorOptions = (): [string, string][] => [
  [t('blocks.sensor.color.red'), 'ff0000'],
  [t('blocks.sensor.color.green'), '00ff00'],
  [t('blocks.sensor.color.blue'), '0000ff'],
  [t('blocks.sensor.color.yellow'), 'ffff00'],
  [t('blocks.sensor.color.purple'), 'ff00ff'],
  [t('blocks.sensor.color.cyan'), '00ffff'],
  [t('blocks.sensor.color.white'), 'ffffff'],
  [t('blocks.sensor.color.off'), '000000'],
];

// ===== Ultrasonic Sensor (HC-SR04) =====

// Ultrasonic Init Block
Blockly.Blocks['ultrasonic_init'] = {
  init: function() {
    const pins = getSensorPins();
    this.appendDummyInput()
        .appendField(t('blocks.sensor.ultrasonic.init'))
        .appendField(t('blocks.sensor.ultrasonic.trigPin'))
        .appendField(new Blockly.FieldNumber(pins.ultrasonicTrig, 0, 39), 'TRIG_PIN')
        .appendField(t('blocks.sensor.ultrasonic.echoPin'))
        .appendField(new Blockly.FieldNumber(pins.ultrasonicEcho, 0, 39), 'ECHO_PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR_ULTRASONIC);
    this.setTooltip(t('blocks.sensor.ultrasonic.initTooltip'));
  }
};

javascriptGenerator.forBlock['ultrasonic_init'] = function(block: Blockly.Block) {
  const trigPin = block.getFieldValue('TRIG_PIN');
  const echoPin = block.getFieldValue('ECHO_PIN');

  generator.definitions_['ultrasonic_pins'] =
    `// Ultrasonic sensor pins\n` +
    `#define ULTRASONIC_TRIG ${trigPin}\n` +
    `#define ULTRASONIC_ECHO ${echoPin}`;

  generator.definitions_['ultrasonic_function'] =
    `// Measure distance with ultrasonic sensor\n` +
    `float measureDistance() {\n` +
    `  digitalWrite(ULTRASONIC_TRIG, LOW);\n` +
    `  delayMicroseconds(2);\n` +
    `  digitalWrite(ULTRASONIC_TRIG, HIGH);\n` +
    `  delayMicroseconds(10);\n` +
    `  digitalWrite(ULTRASONIC_TRIG, LOW);\n` +
    `  \n` +
    `  long duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);\n` +
    `  if (duration == 0) return 999.9;\n` +
    `  float distance = duration * 0.034 / 2;\n` +
    `  return distance;\n` +
    `}`;

  return `  pinMode(ULTRASONIC_TRIG, OUTPUT);\n` +
         `  pinMode(ULTRASONIC_ECHO, INPUT);\n`;
};

pythonGenerator.forBlock['ultrasonic_init'] = function(block: Blockly.Block) {
  const trigPin = block.getFieldValue('TRIG_PIN');
  const echoPin = block.getFieldValue('ECHO_PIN');

  pyGen.definitions_['import_ultrasonic'] = 'from machine import Pin\nimport time';
  pyGen.definitions_['ultrasonic_pins'] =
    `# Ultrasonic sensor pins\n` +
    `ultrasonic_trig = Pin(${trigPin}, Pin.OUT)\n` +
    `ultrasonic_echo = Pin(${echoPin}, Pin.IN)`;

  pyGen.definitions_['ultrasonic_function'] =
    `# Measure distance with ultrasonic sensor\n` +
    `def measure_distance():\n` +
    `    ultrasonic_trig.value(0)\n` +
    `    time.sleep_us(2)\n` +
    `    ultrasonic_trig.value(1)\n` +
    `    time.sleep_us(10)\n` +
    `    ultrasonic_trig.value(0)\n` +
    `    \n` +
    `    timeout = 30000\n` +
    `    start = time.ticks_us()\n` +
    `    while ultrasonic_echo.value() == 0:\n` +
    `        if time.ticks_diff(time.ticks_us(), start) > timeout:\n` +
    `            return 999.9\n` +
    `    pulse_start = time.ticks_us()\n` +
    `    \n` +
    `    while ultrasonic_echo.value() == 1:\n` +
    `        if time.ticks_diff(time.ticks_us(), pulse_start) > timeout:\n` +
    `            return 999.9\n` +
    `    pulse_end = time.ticks_us()\n` +
    `    \n` +
    `    duration = time.ticks_diff(pulse_end, pulse_start)\n` +
    `    distance = duration * 0.034 / 2\n` +
    `    return distance`;

  return '';  // Init doesn't generate runtime code
};

// Ultrasonic Distance Block (simplified - requires init)
Blockly.Blocks['ultrasonic_distance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(t('blocks.sensor.ultrasonic.distance'));
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR_ULTRASONIC);
    this.setTooltip(t('blocks.sensor.ultrasonic.distanceTooltip'));
  }
};

javascriptGenerator.forBlock['ultrasonic_distance'] = function() {
  const code = `measureDistance()`;
  return [code, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['ultrasonic_distance'] = function() {
  const code = `measure_distance()`;
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ===== DHT11/DHT22 Temperature & Humidity Sensor =====

Blockly.Blocks['dht_init'] = {
  init: function() {
    const pins = getSensorPins();
    this.appendDummyInput()
        .appendField(t('blocks.sensor.dht.init'))
        .appendField(new Blockly.FieldDropdown([
          ['DHT11', 'DHT11'],
          ['DHT22', 'DHT22']
        ]), 'TYPE')
        .appendField(t('blocks.sensor.dht.pin'))
        .appendField(new Blockly.FieldNumber(pins.dht, 0, 39), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR_DHT);
    this.setTooltip(t('blocks.sensor.dht.initTooltip'));
  }
};

javascriptGenerator.forBlock['dht_init'] = function(block: Blockly.Block) {
  const type = block.getFieldValue('TYPE');
  const pin = block.getFieldValue('PIN');

  generator.definitions_['include_dht'] = '#include <DHT.h>';
  generator.definitions_['dht_instance'] =
    `// DHT sensor\n` +
    `#define DHT_PIN ${pin}\n` +
    `#define DHT_TYPE ${type}\n` +
    `DHT dht(DHT_PIN, DHT_TYPE);`;

  generator.setups_['dht_begin'] = `  dht.begin();`;

  return '';  // Init doesn't generate runtime code
};

pythonGenerator.forBlock['dht_init'] = function(block: Blockly.Block) {
  const type = block.getFieldValue('TYPE');
  const pin = block.getFieldValue('PIN');

  const dhtClass = type === 'DHT11' ? 'DHT11' : 'DHT22';

  pyGen.definitions_['import_dht'] = 'from machine import Pin\nimport dht';
  pyGen.definitions_['dht_instance'] =
    `# DHT sensor\n` +
    `dht_sensor = dht.${dhtClass}(Pin(${pin}))`;

  return '';  // Init doesn't generate runtime code
};

// ===== Read Temperature =====

Blockly.Blocks['dht_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(t('blocks.sensor.dht.temperature'));
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR_DHT);
    this.setTooltip(t('blocks.sensor.dht.temperatureTooltip'));
  }
};

javascriptGenerator.forBlock['dht_temperature'] = function() {
  const code = 'dht.readTemperature()';
  return [code, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['dht_temperature'] = function() {
  if (!pyGen.definitions_['dht_read_function']) {
    pyGen.definitions_['dht_read_function'] =
      `# Read DHT sensor\n` +
      `def read_dht():\n` +
      `    try:\n` +
      `        dht_sensor.measure()\n` +
      `        return True\n` +
      `    except:\n` +
      `        return False`;
  }

  // We need to call measure() before reading
  const code = '(dht_sensor.temperature() if read_dht() else -999)';
  return [code, pyGen.ORDER_CONDITIONAL];
};

// ===== Read Humidity =====

Blockly.Blocks['dht_humidity'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(t('blocks.sensor.dht.humidity'));
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR_DHT);
    this.setTooltip(t('blocks.sensor.dht.humidityTooltip'));
  }
};

javascriptGenerator.forBlock['dht_humidity'] = function() {
  const code = 'dht.readHumidity()';
  return [code, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['dht_humidity'] = function() {
  if (!pyGen.definitions_['dht_read_function']) {
    pyGen.definitions_['dht_read_function'] =
      `# Read DHT sensor\n` +
      `def read_dht():\n` +
      `    try:\n` +
      `        dht_sensor.measure()\n` +
      `        return True\n` +
      `    except:\n` +
      `        return False`;
  }

  const code = '(dht_sensor.humidity() if read_dht() else -999)';
  return [code, pyGen.ORDER_CONDITIONAL];
};

// ===== RUS-04 Ultrasonic with RGB (HC-SR04 + WS2812B) =====

Blockly.Blocks['rus04_init'] = {
  init: function() {
    const pins = getSensorPins();
    this.appendDummyInput()
        .appendField(t('blocks.sensor.rus04.init'))
        .appendField(t('blocks.sensor.ultrasonic.trigPin'))
        .appendField(new Blockly.FieldNumber(pins.ultrasonicTrig, 0, 39), 'TRIG_PIN')
        .appendField(t('blocks.sensor.ultrasonic.echoPin'))
        .appendField(new Blockly.FieldNumber(pins.ultrasonicEcho, 0, 39), 'ECHO_PIN');
    this.appendDummyInput()
        .appendField(t('blocks.sensor.rus04.rgbPin'))
        .appendField(new Blockly.FieldNumber(pins.ultrasonicRgb, 0, 39), 'RGB_PIN')
        .appendField(t('blocks.sensor.rus04.numLeds'))
        .appendField(new Blockly.FieldNumber(6, 1, 256), 'NUM_LEDS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR_ULTRASONIC);
    this.setTooltip(t('blocks.sensor.rus04.initTooltip'));
  }
};

javascriptGenerator.forBlock['rus04_init'] = function(block: Blockly.Block) {
  const trigPin = block.getFieldValue('TRIG_PIN');
  const echoPin = block.getFieldValue('ECHO_PIN');
  const rgbPin = block.getFieldValue('RGB_PIN');
  const numLeds = block.getFieldValue('NUM_LEDS');

  // Ultrasonic pins
  generator.definitions_['rus04_ultrasonic_pins'] =
    `// RUS-04 Ultrasonic sensor pins\n` +
    `#define RUS04_TRIG ${trigPin}\n` +
    `#define RUS04_ECHO ${echoPin}`;

  generator.definitions_['rus04_ultrasonic_function'] =
    `// Measure distance with RUS-04\n` +
    `float rus04MeasureDistance() {\n` +
    `  digitalWrite(RUS04_TRIG, LOW);\n` +
    `  delayMicroseconds(2);\n` +
    `  digitalWrite(RUS04_TRIG, HIGH);\n` +
    `  delayMicroseconds(10);\n` +
    `  digitalWrite(RUS04_TRIG, LOW);\n` +
    `  \n` +
    `  long duration = pulseIn(RUS04_ECHO, HIGH, 30000);\n` +
    `  if (duration == 0) return 999.9;\n` +
    `  float distance = duration * 0.034 / 2;\n` +
    `  return distance;\n` +
    `}`;

  // RGB LED (NeoPixel)
  generator.definitions_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>';
  generator.definitions_['rus04_rgb_instance'] =
    `// RUS-04 RGB LEDs (WS2812B)\n` +
    `#define RUS04_RGB_PIN ${rgbPin}\n` +
    `#define RUS04_NUM_LEDS ${numLeds}\n` +
    `Adafruit_NeoPixel rus04Eyes(RUS04_NUM_LEDS, RUS04_RGB_PIN, NEO_GRB + NEO_KHZ800);`;

  return `  pinMode(RUS04_TRIG, OUTPUT);\n` +
         `  pinMode(RUS04_ECHO, INPUT);\n` +
         `  rus04Eyes.begin();\n` +
         `  rus04Eyes.show();\n`;
};

pythonGenerator.forBlock['rus04_init'] = function(block: Blockly.Block) {
  const trigPin = block.getFieldValue('TRIG_PIN');
  const echoPin = block.getFieldValue('ECHO_PIN');
  const rgbPin = block.getFieldValue('RGB_PIN');
  const numLeds = block.getFieldValue('NUM_LEDS');

  pyGen.definitions_['import_ultrasonic'] = 'from machine import Pin\nimport time';
  pyGen.definitions_['rus04_ultrasonic_pins'] =
    `# RUS-04 Ultrasonic sensor pins\n` +
    `rus04_trig = Pin(${trigPin}, Pin.OUT)\n` +
    `rus04_echo = Pin(${echoPin}, Pin.IN)`;

  pyGen.definitions_['rus04_ultrasonic_function'] =
    `# Measure distance with RUS-04\n` +
    `def rus04_measure_distance():\n` +
    `    rus04_trig.value(0)\n` +
    `    time.sleep_us(2)\n` +
    `    rus04_trig.value(1)\n` +
    `    time.sleep_us(10)\n` +
    `    rus04_trig.value(0)\n` +
    `    \n` +
    `    timeout = 30000\n` +
    `    start = time.ticks_us()\n` +
    `    while rus04_echo.value() == 0:\n` +
    `        if time.ticks_diff(time.ticks_us(), start) > timeout:\n` +
    `            return 999.9\n` +
    `    pulse_start = time.ticks_us()\n` +
    `    \n` +
    `    while rus04_echo.value() == 1:\n` +
    `        if time.ticks_diff(time.ticks_us(), pulse_start) > timeout:\n` +
    `            return 999.9\n` +
    `    pulse_end = time.ticks_us()\n` +
    `    \n` +
    `    duration = time.ticks_diff(pulse_end, pulse_start)\n` +
    `    distance = duration * 0.034 / 2\n` +
    `    return distance`;

  pyGen.definitions_['import_neopixel'] = 'from machine import Pin\nfrom neopixel import NeoPixel';
  pyGen.definitions_['rus04_rgb_instance'] = `rus04_eyes = NeoPixel(Pin(${rgbPin}), ${numLeds})`;

  return '';
};

// ===== RUS-04 Distance =====

Blockly.Blocks['rus04_distance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(t('blocks.sensor.rus04.distance'));
    this.setOutput(true, 'Number');
    this.setColour(SENSOR_COLOR_ULTRASONIC);
    this.setTooltip(t('blocks.sensor.rus04.distanceTooltip'));
  }
};

javascriptGenerator.forBlock['rus04_distance'] = function() {
  const code = 'rus04MeasureDistance()';
  return [code, Order.FUNCTION_CALL];
};

pythonGenerator.forBlock['rus04_distance'] = function() {
  const code = 'rus04_measure_distance()';
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ===== RUS-04 RGB LED両目色設定 =====

Blockly.Blocks['rus04_rgb'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(t('blocks.sensor.rus04.rgbBoth'))
        .appendField(t('blocks.sensor.rus04.left'))
        .appendField(new Blockly.FieldDropdown(getColorOptions), 'LEFT_COLOR')
        .appendField(t('blocks.sensor.rus04.right'))
        .appendField(new Blockly.FieldDropdown(getColorOptions), 'RIGHT_COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR_ULTRASONIC);
    this.setTooltip(t('blocks.sensor.rus04.rgbTooltip'));
  }
};

javascriptGenerator.forBlock['rus04_rgb'] = function(block: Blockly.Block) {
  const leftColor = block.getFieldValue('LEFT_COLOR');
  const rightColor = block.getFieldValue('RIGHT_COLOR');

  const leftR = parseInt(leftColor.substring(0, 2), 16);
  const leftG = parseInt(leftColor.substring(2, 4), 16);
  const leftB = parseInt(leftColor.substring(4, 6), 16);

  const rightR = parseInt(rightColor.substring(0, 2), 16);
  const rightG = parseInt(rightColor.substring(2, 4), 16);
  const rightB = parseInt(rightColor.substring(4, 6), 16);

  return `  // Set left eyes (LEDs 0-2)\n` +
         `  for (int i = 0; i < 3; i++) {\n` +
         `    rus04Eyes.setPixelColor(i, rus04Eyes.Color(${leftR}, ${leftG}, ${leftB}));\n` +
         `  }\n` +
         `  // Set right eyes (LEDs 3-5)\n` +
         `  for (int i = 3; i < 6; i++) {\n` +
         `    rus04Eyes.setPixelColor(i, rus04Eyes.Color(${rightR}, ${rightG}, ${rightB}));\n` +
         `  }\n` +
         `  rus04Eyes.show();\n`;
};

pythonGenerator.forBlock['rus04_rgb'] = function(block: Blockly.Block) {
  const leftColor = block.getFieldValue('LEFT_COLOR');
  const rightColor = block.getFieldValue('RIGHT_COLOR');

  const leftR = parseInt(leftColor.substring(0, 2), 16);
  const leftG = parseInt(leftColor.substring(2, 4), 16);
  const leftB = parseInt(leftColor.substring(4, 6), 16);

  const rightR = parseInt(rightColor.substring(0, 2), 16);
  const rightG = parseInt(rightColor.substring(2, 4), 16);
  const rightB = parseInt(rightColor.substring(4, 6), 16);

  return `# Set left eyes (LEDs 0-2)\n` +
         `for i in range(3):\n` +
         `    rus04_eyes[i] = (${leftR}, ${leftG}, ${leftB})\n` +
         `# Set right eyes (LEDs 3-5)\n` +
         `for i in range(3, 6):\n` +
         `    rus04_eyes[i] = (${rightR}, ${rightG}, ${rightB})\n` +
         `rus04_eyes.write()\n`;
};

// ===== RUS-04 RGB 両目簡易設定 (same as rus04_rgb) =====

Blockly.Blocks['rus04_both_simple'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(t('blocks.sensor.rus04.rgbBoth'))
        .appendField(t('blocks.sensor.rus04.left'))
        .appendField(new Blockly.FieldDropdown(getColorOptions), 'LEFT_COLOR')
        .appendField(t('blocks.sensor.rus04.right'))
        .appendField(new Blockly.FieldDropdown(getColorOptions), 'RIGHT_COLOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR_ULTRASONIC);
    this.setTooltip(t('blocks.sensor.rus04.bothSimpleTooltip'));
  }
};

javascriptGenerator.forBlock['rus04_both_simple'] = function(block: Blockly.Block) {
  const leftColor = block.getFieldValue('LEFT_COLOR');
  const rightColor = block.getFieldValue('RIGHT_COLOR');

  const leftR = parseInt(leftColor.substring(0, 2), 16);
  const leftG = parseInt(leftColor.substring(2, 4), 16);
  const leftB = parseInt(leftColor.substring(4, 6), 16);

  const rightR = parseInt(rightColor.substring(0, 2), 16);
  const rightG = parseInt(rightColor.substring(2, 4), 16);
  const rightB = parseInt(rightColor.substring(4, 6), 16);

  return `  // Set left eyes (LEDs 0-2)\n` +
         `  for (int i = 0; i < 3; i++) {\n` +
         `    rus04Eyes.setPixelColor(i, rus04Eyes.Color(${leftR}, ${leftG}, ${leftB}));\n` +
         `  }\n` +
         `  // Set right eyes (LEDs 3-5)\n` +
         `  for (int i = 3; i < 6; i++) {\n` +
         `    rus04Eyes.setPixelColor(i, rus04Eyes.Color(${rightR}, ${rightG}, ${rightB}));\n` +
         `  }\n` +
         `  rus04Eyes.show();\n`;
};

pythonGenerator.forBlock['rus04_both_simple'] = function(block: Blockly.Block) {
  const leftColor = block.getFieldValue('LEFT_COLOR');
  const rightColor = block.getFieldValue('RIGHT_COLOR');

  const leftR = parseInt(leftColor.substring(0, 2), 16);
  const leftG = parseInt(leftColor.substring(2, 4), 16);
  const leftB = parseInt(leftColor.substring(4, 6), 16);

  const rightR = parseInt(rightColor.substring(0, 2), 16);
  const rightG = parseInt(rightColor.substring(2, 4), 16);
  const rightB = parseInt(rightColor.substring(4, 6), 16);

  return `# Set left eyes (LEDs 0-2)\n` +
         `for i in range(3):\n` +
         `    rus04_eyes[i] = (${leftR}, ${leftG}, ${leftB})\n` +
         `# Set right eyes (LEDs 3-5)\n` +
         `for i in range(3, 6):\n` +
         `    rus04_eyes[i] = (${rightR}, ${rightG}, ${rightB})\n` +
         `rus04_eyes.write()\n`;
};

// ===== RUS-04 RGB 消灯 =====

Blockly.Blocks['rus04_off'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(t('blocks.sensor.rus04.off'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SENSOR_COLOR_ULTRASONIC);
    this.setTooltip(t('blocks.sensor.rus04.offTooltip'));
  }
};

javascriptGenerator.forBlock['rus04_off'] = function() {
  return `  rus04Eyes.clear();\n` +
         `  rus04Eyes.show();\n`;
};

pythonGenerator.forBlock['rus04_off'] = function() {
  return `rus04_eyes.fill((0, 0, 0))\n` +
         `rus04_eyes.write()\n`;
};

export {}; // Make this a module
