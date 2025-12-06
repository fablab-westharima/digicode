import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';

// 型アサーション用のヘルパー（definitions_はprotectedなので）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = pythonGenerator as any;

// ===== 基本ブロック（5個）- 無料 =====

// 1. digital_write - デジタル出力
Blockly.Blocks['esp32_digital_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField('を')
        .appendField(new Blockly.FieldDropdown([
          ['HIGH (1)', '1'],
          ['LOW (0)', '0']
        ]), 'VALUE')
        .appendField('に出力');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#2196F3');
    this.setTooltip('指定したピンにHIGH(1)またはLOW(0)を出力します');
  }
};

pythonGenerator.forBlock['esp32_digital_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');

  // インポート文を追加
  generator.definitions_['import_machine_pin'] = 'from machine import Pin';

  // ピンオブジェクトの初期化
  generator.definitions_[`pin_${pin}_out`] = `pin${pin} = Pin(${pin}, Pin.OUT)`;

  return `pin${pin}.value(${value})\n`;
};

// 2. digital_read - デジタル入力
Blockly.Blocks['esp32_digital_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField('のデジタル入力');
    this.setOutput(true, 'Number');
    this.setColour('#2196F3');
    this.setTooltip('デジタル入力を読み取ります (0 or 1)');
  }
};

pythonGenerator.forBlock['esp32_digital_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_['import_machine_pin'] = 'from machine import Pin';
  generator.definitions_[`pin_${pin}_in`] = `pin${pin} = Pin(${pin}, Pin.IN)`;

  return [`pin${pin}.value()`, Order.FUNCTION_CALL];
};

// 3. delay - 遅延
Blockly.Blocks['esp32_delay'] = {
  init: function() {
    this.appendValueInput('TIME')
        .setCheck('Number')
        .appendField('待つ');
    this.appendDummyInput()
        .appendField('ミリ秒');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip('指定した時間（ミリ秒）待機します');
  }
};

pythonGenerator.forBlock['esp32_delay'] = function(block: Blockly.Block) {
  const time = pythonGenerator.valueToCode(block, 'TIME', Order.NONE) || '1000';

  generator.definitions_['import_time'] = 'import time';

  return `time.sleep_ms(${time})\n`;
};

// 4. print - 出力
Blockly.Blocks['esp32_print'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField('出力');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#E91E63');
    this.setTooltip('値をコンソールに出力します');
  }
};

pythonGenerator.forBlock['esp32_print'] = function(block: Blockly.Block) {
  const value = pythonGenerator.valueToCode(block, 'VALUE', Order.NONE) || '""';
  return `print(${value})\n`;
};

// 5. while_true - 無限ループ
Blockly.Blocks['esp32_while_true'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('繰り返し実行');
    this.appendStatementInput('DO')
        .setCheck(null);
    this.setPreviousStatement(true, null);
    this.setColour('#9C27B0');
    this.setTooltip('内部のブロックを無限に繰り返します');
  }
};

pythonGenerator.forBlock['esp32_while_true'] = function(block: Blockly.Block) {
  const statements = pythonGenerator.statementToCode(block, 'DO');
  return `while True:\n${statements || '    pass\n'}`;
};

// ===== 拡張ブロック（10個）- 無料 =====

// 6. analog_read - アナログ入力
Blockly.Blocks['esp32_analog_read'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(34, 32, 39), 'PIN')
        .appendField('のアナログ入力');
    this.setOutput(true, 'Number');
    this.setColour('#4CAF50');
    this.setTooltip('アナログ入力を読み取ります（0-4095）');
  }
};

pythonGenerator.forBlock['esp32_analog_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_['import_machine_adc'] = 'from machine import ADC';
  generator.definitions_[`adc_${pin}`] = `adc${pin} = ADC(Pin(${pin}))`;
  generator.definitions_[`adc_${pin}_atten`] = `adc${pin}.atten(ADC.ATTN_11DB)`;

  return [`adc${pin}.read()`, Order.FUNCTION_CALL];
};

// 7. analog_write - PWM出力
Blockly.Blocks['esp32_pwm_write'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField('にPWM出力');
    this.appendDummyInput()
        .appendField('(0-1023)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip('PWM出力を設定します（0-1023）');
  }
};

pythonGenerator.forBlock['esp32_pwm_write'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const value = pythonGenerator.valueToCode(block, 'VALUE', Order.NONE) || '0';

  generator.definitions_['import_machine_pwm'] = 'from machine import PWM';
  generator.definitions_[`pwm_${pin}`] = `pwm${pin} = PWM(Pin(${pin}))`;
  generator.definitions_[`pwm_${pin}_freq`] = `pwm${pin}.freq(1000)`;

  return `pwm${pin}.duty(${value})\n`;
};

// 8. pwm_setup - PWM設定
Blockly.Blocks['esp32_pwm_setup'] = {
  init: function() {
    this.appendValueInput('FREQ')
        .setCheck('Number')
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField('のPWM周波数を');
    this.appendDummyInput()
        .appendField('Hzに設定');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#4CAF50');
    this.setTooltip('PWM周波数を設定します');
  }
};

pythonGenerator.forBlock['esp32_pwm_setup'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const freq = pythonGenerator.valueToCode(block, 'FREQ', Order.NONE) || '1000';

  generator.definitions_['import_machine_pwm'] = 'from machine import PWM';
  generator.definitions_[`pwm_${pin}`] = `pwm${pin} = PWM(Pin(${pin}))`;

  return `pwm${pin}.freq(${freq})\n`;
};

// 9. wifi_connect - WiFi接続
Blockly.Blocks['esp32_wifi_connect'] = {
  init: function() {
    this.appendValueInput('SSID')
        .setCheck('String')
        .appendField('WiFi接続 SSID:');
    this.appendValueInput('PASSWORD')
        .setCheck('String')
        .appendField('パスワード:');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip('WiFiネットワークに接続します');
  }
};

pythonGenerator.forBlock['esp32_wifi_connect'] = function(block: Blockly.Block) {
  const ssid = pythonGenerator.valueToCode(block, 'SSID', Order.NONE) || '""';
  const password = pythonGenerator.valueToCode(block, 'PASSWORD', Order.NONE) || '""';

  generator.definitions_['import_network'] = 'import network';
  generator.definitions_['wlan'] = 'wlan = network.WLAN(network.STA_IF)';

  return `wlan.active(True)\nwlan.connect(${ssid}, ${password})\n`;
};

// 10. wifi_disconnect - WiFi切断
Blockly.Blocks['esp32_wifi_disconnect'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('WiFi切断');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#00BCD4');
    this.setTooltip('WiFi接続を切断します');
  }
};

pythonGenerator.forBlock['esp32_wifi_disconnect'] = function() {
  generator.definitions_['import_network'] = 'import network';
  generator.definitions_['wlan'] = 'wlan = network.WLAN(network.STA_IF)';

  return 'wlan.disconnect()\n';
};

// 11. time_sleep - 秒単位の遅延
Blockly.Blocks['esp32_time_sleep'] = {
  init: function() {
    this.appendValueInput('TIME')
        .setCheck('Number')
        .appendField('待つ');
    this.appendDummyInput()
        .appendField('秒');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FF9800');
    this.setTooltip('指定した時間（秒）待機します');
  }
};

pythonGenerator.forBlock['esp32_time_sleep'] = function(block: Blockly.Block) {
  const time = pythonGenerator.valueToCode(block, 'TIME', Order.NONE) || '1';

  generator.definitions_['import_time'] = 'import time';

  return `time.sleep(${time})\n`;
};

// 12. led_on - LED点灯
Blockly.Blocks['esp32_led_on'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('内蔵LEDをON');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip('ESP32の内蔵LED（GPIO 2）をONにします');
  }
};

pythonGenerator.forBlock['esp32_led_on'] = function() {
  generator.definitions_['import_machine_pin'] = 'from machine import Pin';
  generator.definitions_['led'] = 'led = Pin(2, Pin.OUT)';

  return 'led.value(1)\n';
};

// 13. led_off - LED消灯
Blockly.Blocks['esp32_led_off'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('内蔵LEDをOFF');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFEB3B');
    this.setTooltip('ESP32の内蔵LED（GPIO 2）をOFFにします');
  }
};

pythonGenerator.forBlock['esp32_led_off'] = function() {
  generator.definitions_['import_machine_pin'] = 'from machine import Pin';
  generator.definitions_['led'] = 'led = Pin(2, Pin.OUT)';

  return 'led.value(0)\n';
};

// 14. button_pressed - ボタン状態
Blockly.Blocks['esp32_button_pressed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('ピン')
        .appendField(new Blockly.FieldNumber(0, 0, 39), 'PIN')
        .appendField('のボタンが押されている');
    this.setOutput(true, 'Boolean');
    this.setColour('#795548');
    this.setTooltip('ボタンが押されているかどうか（プルアップ有効）');
  }
};

pythonGenerator.forBlock['esp32_button_pressed'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  generator.definitions_['import_machine_pin'] = 'from machine import Pin';
  generator.definitions_[`button_${pin}`] = `button${pin} = Pin(${pin}, Pin.IN, Pin.PULL_UP)`;

  return [`button${pin}.value() == 0`, Order.RELATIONAL];
};

// 15. temperature - 内蔵温度センサー（ESP32-S2/S3/C3のみ）
Blockly.Blocks['esp32_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('内蔵温度センサー値');
    this.setOutput(true, 'Number');
    this.setColour('#FF5722');
    this.setTooltip('内蔵温度センサーの値を読み取ります（ESP32-S2/S3/C3のみ）');
  }
};

pythonGenerator.forBlock['esp32_temperature'] = function() {
  generator.definitions_['import_esp32'] = 'import esp32';

  return ['esp32.raw_temperature()', Order.FUNCTION_CALL];
};

// ===== プレミアムブロック（5個）- 有料 =====

// 16. i2c_scan - I2Cスキャン
Blockly.Blocks['esp32_i2c_scan'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔒 I2Cデバイススキャン')
        .appendField('SDA:')
        .appendField(new Blockly.FieldNumber(21, 0, 39), 'SDA')
        .appendField('SCL:')
        .appendField(new Blockly.FieldNumber(22, 0, 39), 'SCL');
    this.setOutput(true, 'Array');
    this.setColour('#FFD700');
    this.setTooltip('I2Cデバイスをスキャンしてアドレスのリストを返します（プレミアム機能）');
  }
};

pythonGenerator.forBlock['esp32_i2c_scan'] = function(block: Blockly.Block) {
  const sda = block.getFieldValue('SDA');
  const scl = block.getFieldValue('SCL');

  generator.definitions_['import_machine_i2c'] = 'from machine import I2C';
  generator.definitions_[`i2c`] = `i2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}))`;

  return ['i2c.scan()', Order.FUNCTION_CALL];
};

// 17. spi_transfer - SPIデータ転送
Blockly.Blocks['esp32_spi_transfer'] = {
  init: function() {
    this.appendValueInput('DATA')
        .setCheck('String')
        .appendField('🔒 SPIデータ転送');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFD700');
    this.setTooltip('SPIでデータを転送します（プレミアム機能）');
  }
};

pythonGenerator.forBlock['esp32_spi_transfer'] = function(block: Blockly.Block) {
  const data = pythonGenerator.valueToCode(block, 'DATA', Order.NONE) || '""';

  generator.definitions_['import_machine_spi'] = 'from machine import SPI';
  generator.definitions_['spi'] = 'spi = SPI(1, baudrate=1000000)';

  return `spi.write(${data})\n`;
};

// 18. neopixel_set - NeoPixel制御
Blockly.Blocks['esp32_neopixel_set'] = {
  init: function() {
    this.appendValueInput('INDEX')
        .setCheck('Number')
        .appendField('🔒 NeoPixel');
    this.appendValueInput('R')
        .setCheck('Number')
        .appendField('番目 R:');
    this.appendValueInput('G')
        .setCheck('Number')
        .appendField('G:');
    this.appendValueInput('B')
        .setCheck('Number')
        .appendField('B:');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFD700');
    this.setTooltip('NeoPixel LEDの色を設定します（プレミアム機能）');
  }
};

pythonGenerator.forBlock['esp32_neopixel_set'] = function(block: Blockly.Block) {
  const index = pythonGenerator.valueToCode(block, 'INDEX', Order.NONE) || '0';
  const r = pythonGenerator.valueToCode(block, 'R', Order.NONE) || '0';
  const g = pythonGenerator.valueToCode(block, 'G', Order.NONE) || '0';
  const b = pythonGenerator.valueToCode(block, 'B', Order.NONE) || '0';

  generator.definitions_['import_neopixel'] = 'import neopixel';
  generator.definitions_['neopixel_init'] = 'np = neopixel.NeoPixel(Pin(2), 8)';

  return `np[${index}] = (${r}, ${g}, ${b})\nnp.write()\n`;
};

// 19. servo_angle - サーボモーター
Blockly.Blocks['esp32_servo_angle'] = {
  init: function() {
    this.appendValueInput('ANGLE')
        .setCheck('Number')
        .appendField('🔒 ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39), 'PIN')
        .appendField('のサーボを');
    this.appendDummyInput()
        .appendField('度に回転');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour('#FFD700');
    this.setTooltip('サーボモーターを指定角度に回転させます（プレミアム機能）');
  }
};

pythonGenerator.forBlock['esp32_servo_angle'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const angle = pythonGenerator.valueToCode(block, 'ANGLE', Order.NONE) || '90';

  generator.definitions_['import_machine_pwm'] = 'from machine import PWM';
  generator.definitions_[`servo_${pin}`] = `servo${pin} = PWM(Pin(${pin}), freq=50)`;

  return `servo${pin}.duty(int(40 + (${angle} / 180) * 115))\n`;
};

// 20. ultrasonic_distance - 超音波距離センサー
Blockly.Blocks['esp32_ultrasonic_distance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔒 超音波距離センサー')
        .appendField('TRIG:')
        .appendField(new Blockly.FieldNumber(5, 0, 39), 'TRIG')
        .appendField('ECHO:')
        .appendField(new Blockly.FieldNumber(18, 0, 39), 'ECHO');
    this.setOutput(true, 'Number');
    this.setColour('#FFD700');
    this.setTooltip('超音波距離センサーで距離を測定します（cm）（プレミアム機能）');
  }
};

pythonGenerator.forBlock['esp32_ultrasonic_distance'] = function(block: Blockly.Block) {
  const trig = block.getFieldValue('TRIG');
  const echo = block.getFieldValue('ECHO');

  generator.definitions_['import_machine_pin'] = 'from machine import Pin';
  generator.definitions_['import_time'] = 'import time';
  generator.definitions_[`ultrasonic_trig`] = `trig = Pin(${trig}, Pin.OUT)`;
  generator.definitions_[`ultrasonic_echo`] = `echo = Pin(${echo}, Pin.IN)`;

  const funcName = pythonGenerator.provideFunction_(
    'ultrasonic_distance',
    `def ${pythonGenerator.FUNCTION_NAME_PLACEHOLDER_}():
    trig.value(0)
    time.sleep_us(2)
    trig.value(1)
    time.sleep_us(10)
    trig.value(0)
    while echo.value() == 0:
        pulse_start = time.ticks_us()
    while echo.value() == 1:
        pulse_end = time.ticks_us()
    pulse_duration = time.ticks_diff(pulse_end, pulse_start)
    distance = pulse_duration * 0.034 / 2
    return distance`
  );

  return [`${funcName}()`, Order.FUNCTION_CALL];
};

// MicroPythonブロックの初期化完了
console.log('ESP32 MicroPython blocks loaded');
