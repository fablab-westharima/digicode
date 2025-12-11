import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// 型アサーション用のヘルパー（definitions_やsetups_はprotectedまたは存在しないため）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

// ===== 基本ブロック（5個）- 無料 =====

// 1. arduino_setup - セットアップ
Blockly.Blocks['arduino_setup'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ARDUINO_SETUP_LABEL || 'Setup');
    this.appendStatementInput('SETUP')
        .setCheck(null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_ARDUINO_SETUP_TOOLTIP || 'Runs once when the program starts');
  }
};

javascriptGenerator.forBlock['arduino_setup'] = function(block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, 'SETUP');
  return `void setup() {\n${statements}}\n\n`;
};

// 2. arduino_loop - ループ
Blockly.Blocks['arduino_loop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ARDUINO_LOOP_LABEL || 'Loop');
    this.appendStatementInput('LOOP')
        .setCheck(null);
    this.setColour('#9C27B0');
    this.setTooltip(Blockly.Msg.BLOCKS_ARDUINO_LOOP_TOOLTIP || 'Runs repeatedly while the program is running');
  }
};

javascriptGenerator.forBlock['arduino_loop'] = function(block: Blockly.Block) {
  const statements = javascriptGenerator.statementToCode(block, 'LOOP');
  return `void loop() {\n${statements}}\n`;
};

// 3. esp32_pin_mode - ピンモード設定
Blockly.Blocks['esp32_pin_mode'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_PINMODE_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_PINMODE_TO || ' ')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ESP32_PINMODE_OUTPUT || 'OUTPUT', 'OUTPUT'],
          [Blockly.Msg.BLOCKS_ESP32_PINMODE_INPUT || 'INPUT', 'INPUT'],
          [Blockly.Msg.BLOCKS_ESP32_PINMODE_INPUTPULLUP || 'INPUT_PULLUP', 'INPUT_PULLUP']
        ]), 'MODE')
        .appendField(Blockly.Msg.BLOCKS_ESP32_PINMODE_SET || 'set to');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_PINMODE_TOOLTIP || 'Configure GPIO pin mode');
  }
};

javascriptGenerator.forBlock['esp32_pin_mode'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  return `  pinMode(${pin}, ${mode});\n`;
};

// 4. esp32_digital_write - デジタル出力
Blockly.Blocks['esp32_digital_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_TO || ' ')
        .appendField(new Blockly.FieldDropdown([
          ['HIGH', 'HIGH'],
          ['LOW', 'LOW']
        ]), 'VALUE')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_OUTPUT || 'output');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_DIGITALWRITE_TOOLTIP || 'Write HIGH or LOW to digital pin');
  }
};

javascriptGenerator.forBlock['esp32_digital_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return `  digitalWrite(${pin}, ${value});\n`;
};

// 5. esp32_digital_read - デジタル入力
Blockly.Blocks['esp32_digital_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALREAD_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DIGITALREAD_INPUT || 'read');
    this.setOutput(true, 'Number');
    this.setColour('#2196F3');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_DIGITALREAD_TOOLTIP || 'Read digital pin state');
  }
};

javascriptGenerator.forBlock['esp32_digital_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return [`digitalRead(${pin})`, Order.FUNCTION_CALL];
};

// ===== 拡張ブロック（10個）- 無料 =====

// 6. esp32_analog_read - アナログ入力
Blockly.Blocks['esp32_analog_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGREAD_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(34, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGREAD_INPUT || 'analog read');
    this.setOutput(true, 'Number');
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_ANALOGREAD_TOOLTIP || 'Read analog pin (0-4095)');
  }
};

javascriptGenerator.forBlock['esp32_analog_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  return [`analogRead(${pin})`, Order.FUNCTION_CALL];
};

// 7. esp32_analog_write - PWM出力
Blockly.Blocks['esp32_analog_write'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGWRITE_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_ANALOGWRITE_PWM || 'PWM output');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_ANALOGWRITE_TOOLTIP || 'Output PWM (0-255)');
  }
};

javascriptGenerator.forBlock['esp32_analog_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  return `  analogWrite(${pin}, ${value});\n`;
};

// 8. esp32_delay - 遅延
Blockly.Blocks['esp32_delay'] = {
  init: function() {
    this.appendValueInput('TIME')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DELAY_WAIT || 'Wait');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_DELAY_MS || 'ms');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_DELAY_TOOLTIP || 'Pause for specified milliseconds');
  }
};

javascriptGenerator.forBlock['esp32_delay'] = function(block: Blockly.Block) {
  const time = javascriptGenerator.valueToCode(block, 'TIME', Order.ATOMIC) || '1000';
  return `  delay(${time});\n`;
};

// 9. esp32_millis - 経過時間
Blockly.Blocks['esp32_millis'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_MILLIS_LABEL || 'Elapsed time (ms)');
    this.setOutput(true, 'Number');
    this.setColour('#FF9800');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_MILLIS_TOOLTIP || 'Returns elapsed time since start');
  }
};

javascriptGenerator.forBlock['esp32_millis'] = function() {
  return ['millis()', Order.FUNCTION_CALL];
};

// 10. esp32_serial_begin - シリアル通信開始
Blockly.Blocks['esp32_serial_begin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERIALBEGIN_LABEL || 'Serial begin')
        .appendField(new Blockly.FieldDropdown([
          ['9600', '9600'],
          ['115200', '115200'],
          ['57600', '57600'],
          ['38400', '38400']
        ]), 'BAUD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_SERIALBEGIN_TOOLTIP || 'Start serial communication');
  }
};

javascriptGenerator.forBlock['esp32_serial_begin'] = function(block: Blockly.Block) {
  const baud = block.getFieldValue('BAUD');
  return `  Serial.begin(${baud});\n`;
};

// 11. esp32_serial_print - シリアル出力
Blockly.Blocks['esp32_serial_print'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERIALPRINT_LABEL || 'Serial print');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_SERIALPRINT_TOOLTIP || 'Output to serial monitor (no newline)');
  }
};

javascriptGenerator.forBlock['esp32_serial_print'] = function(block: Blockly.Block) {
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""';
  return `  Serial.print(${value});\n`;
};

// 12. esp32_serial_println - シリアル出力（改行）
Blockly.Blocks['esp32_serial_println'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERIALPRINTLN_LABEL || 'Serial println');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_SERIALPRINTLN_TOOLTIP || 'Output to serial monitor with newline');
  }
};

javascriptGenerator.forBlock['esp32_serial_println'] = function(block: Blockly.Block) {
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '""';
  return `  Serial.println(${value});\n`;
};

// 13. esp32_builtin_led_on - LED ON
Blockly.Blocks['esp32_builtin_led_on'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDON_LABEL || 'Built-in LED ON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDON_TOOLTIP || 'Turn on built-in LED (GPIO 2)');
  }
};

javascriptGenerator.forBlock['esp32_builtin_led_on'] = function() {
  return '  digitalWrite(2, HIGH);\n';
};

// 14. esp32_builtin_led_off - LED OFF
Blockly.Blocks['esp32_builtin_led_off'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDOFF_LABEL || 'Built-in LED OFF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_BUILTINLEDOFF_TOOLTIP || 'Turn off built-in LED (GPIO 2)');
  }
};

javascriptGenerator.forBlock['esp32_builtin_led_off'] = function() {
  return '  digitalWrite(2, LOW);\n';
};

// 15. esp32_tone - 音を鳴らす
Blockly.Blocks['esp32_tone'] = {
  init: function() {
    this.appendValueInput('FREQ')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_TONE_PIN || 'Pin')
        .appendField(new Blockly.FieldNumber(25, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_TONE_FREQUENCY || 'Hz frequency');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_TONE_PLAY || 'play tone');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#795548');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_TONE_TOOLTIP || 'Play tone at specified frequency');
  }
};

javascriptGenerator.forBlock['esp32_tone'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const freq = javascriptGenerator.valueToCode(block, 'FREQ', Order.ATOMIC) || '440';
  return `  tone(${pin}, ${freq});\n`;
};

// ===== プレミアムブロック（5個）- 有料 =====

// 16. esp32_servo_write - サーボモーター
Blockly.Blocks['esp32_servo_write'] = {
  init: function() {
    this.appendValueInput('ANGLE')
        .setCheck('Number')
        .appendField('🔒 ' + (Blockly.Msg.BLOCKS_ESP32_SERVOWRITE_PIN || 'Pin'))
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERVOWRITE_SERVO || 'servo');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_SERVOWRITE_DEGREES || 'degrees');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFD700');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_SERVOWRITE_TOOLTIP || 'Move servo motor to angle [Premium]');
  }
};

javascriptGenerator.forBlock['esp32_servo_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = javascriptGenerator.valueToCode(block, 'ANGLE', Order.ATOMIC) || '90';

  generator.definitions_['include_servo'] = '#include <ESP32Servo.h>';
  generator.definitions_[`servo_${pin}`] = `Servo servo${pin};`;
  generator.setups_[`servo_${pin}_attach`] = `  servo${pin}.attach(${pin});`;

  return `  servo${pin}.write(${angle});\n`;
};

// 17. esp32_neopixel - NeoPixel制御
Blockly.Blocks['esp32_neopixel'] = {
  init: function() {
    this.appendValueInput('INDEX')
        .setCheck('Number')
        .appendField('🔒 ' + (Blockly.Msg.BLOCKS_ESP32_NEOPIXEL_NEOPIXEL || 'NeoPixel'));
    this.appendValueInput('R')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_NEOPIXEL_INDEX || 'LED #');
    this.appendValueInput('G')
        .setCheck('Number')
        .appendField('G:');
    this.appendValueInput('B')
        .setCheck('Number')
        .appendField('B:');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFD700');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_NEOPIXEL_TOOLTIP || 'Set NeoPixel LED color [Premium]');
  }
};

javascriptGenerator.forBlock['esp32_neopixel'] = function(block: Blockly.Block) {
  const index = javascriptGenerator.valueToCode(block, 'INDEX', Order.ATOMIC) || '0';
  const r = javascriptGenerator.valueToCode(block, 'R', Order.ATOMIC) || '0';
  const g = javascriptGenerator.valueToCode(block, 'G', Order.ATOMIC) || '0';
  const b = javascriptGenerator.valueToCode(block, 'B', Order.ATOMIC) || '0';

  generator.definitions_['include_neopixel'] = '#include <Adafruit_NeoPixel.h>';
  generator.definitions_['neopixel_define'] = '#define NEOPIXEL_PIN 2\n#define NEOPIXEL_COUNT 8';
  generator.definitions_['neopixel_obj'] = 'Adafruit_NeoPixel pixels(NEOPIXEL_COUNT, NEOPIXEL_PIN, NEO_GRB + NEO_KHZ800);';
  generator.setups_['neopixel_begin'] = '  pixels.begin();';

  return `  pixels.setPixelColor(${index}, pixels.Color(${r}, ${g}, ${b}));\n  pixels.show();\n`;
};

// 18. esp32_ultrasonic - 超音波距離センサー
Blockly.Blocks['esp32_ultrasonic'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔒 ' + (Blockly.Msg.BLOCKS_ESP32_ULTRASONIC_LABEL || 'Ultrasonic sensor'))
        .appendField('TRIG:')
        .appendField(new Blockly.FieldNumber(5, 0, 39), 'TRIG')
        .appendField('ECHO:')
        .appendField(new Blockly.FieldNumber(18, 0, 39), 'ECHO');
    this.setOutput(true, 'Number');
    this.setColour('#FFD700');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_ULTRASONIC_TOOLTIP || 'Measure distance with ultrasonic sensor [Premium]');
  }
};

javascriptGenerator.forBlock['esp32_ultrasonic'] = function(block: Blockly.Block) {
  const trig = block.getFieldValue('TRIG');
  const echo = block.getFieldValue('ECHO');

  generator.definitions_[`ultrasonic_${trig}_${echo}`] = `#define TRIG_PIN ${trig}\n#define ECHO_PIN ${echo}`;
  generator.setups_[`ultrasonic_setup`] = `  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);`;

  const functionName = javascriptGenerator.provideFunction_(
    'getDistance',
    `long ${javascriptGenerator.FUNCTION_NAME_PLACEHOLDER_}() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH);
  long distance = duration * 0.034 / 2;
  return distance;
}`
  );

  return [`${functionName}()`, Order.FUNCTION_CALL];
};

// 19. esp32_i2c_write - I2C書き込み
Blockly.Blocks['esp32_i2c_write'] = {
  init: function() {
    this.appendValueInput('ADDR')
        .setCheck('Number')
        .appendField('🔒 ' + (Blockly.Msg.BLOCKS_ESP32_I2CWRITE_ADDRESS || 'I2C address'));
    this.appendValueInput('DATA')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_ESP32_I2CWRITE_DATA || 'data');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ESP32_I2CWRITE_WRITE || 'write');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFD700');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_I2CWRITE_TOOLTIP || 'Write data to I2C device [Premium]');
  }
};

javascriptGenerator.forBlock['esp32_i2c_write'] = function(block: Blockly.Block) {
  const addr = javascriptGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0x00';
  const data = javascriptGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';

  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.setups_['wire_begin'] = '  Wire.begin();';

  return `  Wire.beginTransmission(${addr});\n  Wire.write(${data});\n  Wire.endTransmission();\n`;
};

// 20. esp32_dht_read - DHT温湿度センサー
Blockly.Blocks['esp32_dht_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔒 ' + (Blockly.Msg.BLOCKS_ESP32_DHTREAD_SENSOR || 'DHT'))
        .appendField(Blockly.Msg.BLOCKS_ESP32_DHTREAD_PIN || 'pin')
        .appendField(new Blockly.FieldNumber(4, 0, 39), 'PIN')
        .appendField(Blockly.Msg.BLOCKS_ESP32_DHTREAD_READ || 'read')
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_ESP32_DHTREAD_TEMPERATURE || 'Temperature', 'TEMP'],
          [Blockly.Msg.BLOCKS_ESP32_DHTREAD_HUMIDITY || 'Humidity', 'HUM']
        ]), 'TYPE');
    this.setOutput(true, 'Number');
    this.setColour('#FFD700');
    this.setTooltip(Blockly.Msg.BLOCKS_ESP32_DHTREAD_TOOLTIP || 'Read DHT11/DHT22 sensor [Premium]');
  }
};

javascriptGenerator.forBlock['esp32_dht_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const type = block.getFieldValue('TYPE');

  generator.definitions_['include_dht'] = '#include <DHT.h>';
  generator.definitions_[`dht_${pin}`] = `#define DHT_PIN ${pin}\n#define DHT_TYPE DHT11\nDHT dht${pin}(DHT_PIN, DHT_TYPE);`;
  generator.setups_[`dht_begin`] = `  dht${pin}.begin();`;

  if (type === 'TEMP') {
    return [`dht${pin}.readTemperature()`, Order.FUNCTION_CALL];
  } else {
    return [`dht${pin}.readHumidity()`, Order.FUNCTION_CALL];
  }
};

// Arduino C++ブロックの初期化完了
console.log('ESP32 Arduino C++ blocks loaded');
