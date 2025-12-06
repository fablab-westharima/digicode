/**
 * MicroPython machineモジュールブロック
 * UIFlow2スタイル - Pin, I2C, UART, PWM, ADC
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pyGen = pythonGenerator as any;

const MACHINE_COLOR = '#4CAF50';

// GPIOピン選択肢（ESP32）
const PIN_OPTIONS: [string, string][] = [
  ['GPIO2', '2'], ['GPIO4', '4'], ['GPIO5', '5'],
  ['GPIO12', '12'], ['GPIO13', '13'], ['GPIO14', '14'], ['GPIO15', '15'],
  ['GPIO16', '16'], ['GPIO17', '17'], ['GPIO18', '18'], ['GPIO19', '19'],
  ['GPIO21', '21'], ['GPIO22', '22'], ['GPIO23', '23'],
  ['GPIO25', '25'], ['GPIO26', '26'], ['GPIO27', '27'],
  ['GPIO32', '32'], ['GPIO33', '33'], ['GPIO34', '34'], ['GPIO35', '35'],
  ['GPIO36', '36'], ['GPIO39', '39'],
];

// ADC対応ピン
const ADC_PIN_OPTIONS: [string, string][] = [
  ['GPIO32', '32'], ['GPIO33', '33'], ['GPIO34', '34'], ['GPIO35', '35'],
  ['GPIO36', '36'], ['GPIO39', '39'],
];

// ========================================
// Pin 出力設定
// ========================================
Blockly.Blocks['mp_pin_output'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📍 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PINOUTPUT_LABEL || 'Pin Output'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_HIGH || 'HIGH', '1'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_LOW || 'LOW', '0']
      ]), 'VALUE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PINOUTPUT_TOOLTIP || 'Set digital output');
  }
};

pythonGenerator.forBlock['mp_pin_output'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');

  pyGen.definitions_['import_machine'] = 'from machine import Pin';
  pyGen.definitions_[`pin_out_${pin}`] = `pin${pin} = Pin(${pin}, Pin.OUT)`;

  return `pin${pin}.value(${value})\n`;
};

// ========================================
// Pin 入力読み取り
// ========================================
Blockly.Blocks['mp_pin_input'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📍 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PININPUT_LABEL || 'Pin Input'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PULLUP || 'Pull Up', 'PULL_UP'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_PULLDOWN || 'Pull Down', 'PULL_DOWN'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_NONE || 'None', 'None']
      ]), 'PULL');
    this.setOutput(true, 'Number');
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PININPUT_TOOLTIP || 'Read digital input');
  }
};

pythonGenerator.forBlock['mp_pin_input'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const pull = block.getFieldValue('PULL');

  pyGen.definitions_['import_machine'] = 'from machine import Pin';

  let pullStr = 'None';
  if (pull === 'PULL_UP') pullStr = 'Pin.PULL_UP';
  else if (pull === 'PULL_DOWN') pullStr = 'Pin.PULL_DOWN';

  pyGen.definitions_[`pin_in_${pin}`] = `pin${pin}_in = Pin(${pin}, Pin.IN, ${pullStr})`;

  const code = `pin${pin}_in.value()`;
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// Pin トグル
// ========================================
Blockly.Blocks['mp_pin_toggle'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🔄 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PINTOGGLE_LABEL || 'Pin Toggle'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PINTOGGLE_TOOLTIP || 'Toggle pin output');
  }
};

pythonGenerator.forBlock['mp_pin_toggle'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');

  pyGen.definitions_['import_machine'] = 'from machine import Pin';
  pyGen.definitions_[`pin_out_${pin}`] = `pin${pin} = Pin(${pin}, Pin.OUT)`;

  return `pin${pin}.value(not pin${pin}.value())\n`;
};

// ========================================
// PWM 設定
// ========================================
Blockly.Blocks['mp_pwm_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🎚️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PWMINIT_LABEL || 'PWM Init'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_FREQUENCY || 'Frequency')
      .appendField(new Blockly.FieldNumber(1000, 1, 40000000), 'FREQ')
      .appendField('Hz');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PWMINIT_TOOLTIP || 'Initialize PWM');
  }
};

pythonGenerator.forBlock['mp_pwm_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const freq = block.getFieldValue('FREQ');

  pyGen.definitions_['import_pwm'] = 'from machine import Pin, PWM';
  pyGen.definitions_[`pwm_${pin}`] = `pwm${pin} = PWM(Pin(${pin}), freq=${freq})`;

  return '';
};

// ========================================
// PWM デューティ設定
// ========================================
Blockly.Blocks['mp_pwm_duty'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🎚️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PWMDUTY_LABEL || 'PWM'))
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'PIN')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PWMDUTY_DUTY || 'Duty');
    this.appendValueInput('DUTY')
      .setCheck('Number');
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PWMDUTY_MODEPERCENT || '%(0-100)', 'percent'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PWMDUTY_MODERAW || 'Value(0-1023)', 'raw']
      ]), 'MODE');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_PWMDUTY_TOOLTIP || 'Set PWM duty cycle');
  }
};

pythonGenerator.forBlock['mp_pwm_duty'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  const duty = pythonGenerator.valueToCode(block, 'DUTY', pyGen.ORDER_NONE) || '0';

  if (mode === 'percent') {
    return `pwm${pin}.duty(int(${duty} * 1023 / 100))\n`;
  } else {
    return `pwm${pin}.duty(${duty})\n`;
  }
};

// ========================================
// ADC 読み取り
// ========================================
Blockly.Blocks['mp_adc_read'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📊 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_ADCREAD_LABEL || 'ADC Read'))
      .appendField(new Blockly.FieldDropdown(ADC_PIN_OPTIONS), 'PIN')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_ADCREAD_MODERAW || 'Raw(0-4095)', 'raw'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_ADCREAD_MODEVOLTAGE || 'Voltage(0-3.3V)', 'voltage'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_ADCREAD_MODEPERCENT || 'Percent(0-100)', 'percent']
      ]), 'MODE');
    this.setOutput(true, 'Number');
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_ADCREAD_TOOLTIP || 'Read analog value');
  }
};

pythonGenerator.forBlock['mp_adc_read'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');

  pyGen.definitions_['import_adc'] = 'from machine import Pin, ADC';
  pyGen.definitions_[`adc_${pin}`] = `adc${pin} = ADC(Pin(${pin}))\nadc${pin}.atten(ADC.ATTN_11DB)`;

  let code: string;
  if (mode === 'raw') {
    code = `adc${pin}.read()`;
  } else if (mode === 'voltage') {
    code = `(adc${pin}.read() * 3.3 / 4095)`;
  } else {
    code = `(adc${pin}.read() * 100 // 4095)`;
  }
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// I2C 初期化
// ========================================
Blockly.Blocks['mp_i2c_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🔌 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_I2CINIT_LABEL || 'I2C Init'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_SCL || 'SCL')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'SCL')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_SDA || 'SDA')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'SDA')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_FREQUENCY || 'Frequency')
      .appendField(new Blockly.FieldDropdown([
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_I2CINIT_FREQ100K || '100kHz', '100000'],
        [(Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_I2CINIT_FREQ400K || '400kHz', '400000']
      ]), 'FREQ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_I2CINIT_TOOLTIP || 'Initialize I2C bus');
  }
};

pythonGenerator.forBlock['mp_i2c_init'] = function(block: Blockly.Block) {
  const scl = block.getFieldValue('SCL');
  const sda = block.getFieldValue('SDA');
  const freq = block.getFieldValue('FREQ');

  pyGen.definitions_['import_i2c'] = 'from machine import Pin, I2C';
  pyGen.definitions_['i2c_init'] = `i2c = I2C(0, scl=Pin(${scl}), sda=Pin(${sda}), freq=${freq})`;

  return '';
};

// ========================================
// I2C スキャン
// ========================================
Blockly.Blocks['mp_i2c_scan'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('🔍 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_I2CSCAN_LABEL || 'I2C Scan'));
    this.setOutput(true, 'Array');
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_I2CSCAN_TOOLTIP || 'Scan devices on I2C bus');
  }
};

pythonGenerator.forBlock['mp_i2c_scan'] = function() {
  const code = 'i2c.scan()';
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// UART 初期化
// ========================================
Blockly.Blocks['mp_uart_init'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📡 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_UARTINIT_LABEL || 'UART Init'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_TX || 'TX')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'TX')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_RX || 'RX')
      .appendField(new Blockly.FieldDropdown(PIN_OPTIONS), 'RX')
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_BAUDRATE || 'Baud Rate')
      .appendField(new Blockly.FieldDropdown([
        ['9600', '9600'],
        ['115200', '115200'],
        ['19200', '19200'],
        ['38400', '38400'],
        ['57600', '57600']
      ]), 'BAUD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_UARTINIT_TOOLTIP || 'Initialize UART');
  }
};

pythonGenerator.forBlock['mp_uart_init'] = function(block: Blockly.Block) {
  const tx = block.getFieldValue('TX');
  const rx = block.getFieldValue('RX');
  const baud = block.getFieldValue('BAUD');

  pyGen.definitions_['import_uart'] = 'from machine import Pin, UART';
  pyGen.definitions_['uart_init'] = `uart = UART(1, baudrate=${baud}, tx=Pin(${tx}), rx=Pin(${rx}))`;

  return '';
};

// ========================================
// UART 送信
// ========================================
Blockly.Blocks['mp_uart_write'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('DATA')
      .setCheck('String')
      .appendField('📤 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_UARTWRITE_LABEL || 'UART Write'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_UARTWRITE_TOOLTIP || 'Send data via UART');
  }
};

pythonGenerator.forBlock['mp_uart_write'] = function(block: Blockly.Block) {
  const data = pythonGenerator.valueToCode(block, 'DATA', pyGen.ORDER_NONE) || '""';
  return `uart.write(${data})\n`;
};

// ========================================
// UART 受信
// ========================================
Blockly.Blocks['mp_uart_read'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('📥 ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_UARTREAD_LABEL || 'UART Read'))
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_BYTES || 'Bytes')
      .appendField(new Blockly.FieldNumber(1, 1, 1024), 'BYTES');
    this.setOutput(true, 'String');
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_UARTREAD_TOOLTIP || 'Receive data from UART');
  }
};

pythonGenerator.forBlock['mp_uart_read'] = function(block: Blockly.Block) {
  const bytes = block.getFieldValue('BYTES');
  const code = `uart.read(${bytes})`;
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

// ========================================
// sleep（ミリ秒）
// ========================================
Blockly.Blocks['mp_sleep_ms'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('TIME')
      .setCheck('Number')
      .appendField('⏱️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_SLEEPMS_LABEL || 'Wait'));
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_MILLISECONDS || 'milliseconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_SLEEPMS_TOOLTIP || 'Wait for specified milliseconds');
  }
};

pythonGenerator.forBlock['mp_sleep_ms'] = function(block: Blockly.Block) {
  const time = pythonGenerator.valueToCode(block, 'TIME', pyGen.ORDER_NONE) || '0';

  pyGen.definitions_['import_time'] = 'import time';

  return `time.sleep_ms(${time})\n`;
};

// ========================================
// sleep（秒）
// ========================================
Blockly.Blocks['mp_sleep'] = {
  init: function(this: Blockly.Block) {
    this.appendValueInput('TIME')
      .setCheck('Number')
      .appendField('⏱️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_SLEEP_LABEL || 'Wait'));
    this.appendDummyInput()
      .appendField((Blockly.Msg as any).BLOCKS_MICROPYTHON_COMMON_SECONDS || 'seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_SLEEP_TOOLTIP || 'Wait for specified seconds');
  }
};

pythonGenerator.forBlock['mp_sleep'] = function(block: Blockly.Block) {
  const time = pythonGenerator.valueToCode(block, 'TIME', pyGen.ORDER_NONE) || '0';

  pyGen.definitions_['import_time'] = 'import time';

  return `time.sleep(${time})\n`;
};

// ========================================
// ticks_ms
// ========================================
Blockly.Blocks['mp_ticks_ms'] = {
  init: function(this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('⏱️ ' + ((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_TICKSMS_LABEL || 'Elapsed Time(ms)'));
    this.setOutput(true, 'Number');
    this.setColour(MACHINE_COLOR);
    this.setTooltip((Blockly.Msg as any).BLOCKS_MICROPYTHON_MACHINE_TICKSMS_TOOLTIP || 'Get elapsed time in milliseconds since boot');
  }
};

pythonGenerator.forBlock['mp_ticks_ms'] = function() {
  pyGen.definitions_['import_time'] = 'import time';
  const code = 'time.ticks_ms()';
  return [code, pyGen.ORDER_FUNCTION_CALL];
};

export {};
