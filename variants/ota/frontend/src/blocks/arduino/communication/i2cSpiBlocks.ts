/**
 * I2C / SPI 通信ブロック (BP2-2, 2026-04-20)
 *
 * I2C: Wire.h（ESP32 / RP2040 両コア内蔵、追加ライブラリ不要）
 * SPI: SPI.h（同上）
 *
 * 既存の esp32_i2c_write（esp32Blocks.ts、プレミアム）とは独立。
 * 本ファイルのブロックは全ユーザー利用可能。
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};
if (!generator.setups_) generator.setups_ = {};

const I2C_COLOR = '#4CAF50';
const SPI_COLOR = '#2196F3';

// ===== I2C ブロック =====

/**
 * i2c_scan - I2C デバイススキャン
 * 接続されている全 I2C デバイスのアドレスを Serial に出力
 */
Blockly.Blocks['i2c_scan'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔍 ' + (Blockly.Msg.BLOCKS_I2C_SCAN || 'I2C Scan'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(I2C_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_I2C_SCANTOOLTIP || 'Scan for connected I2C devices and print addresses to Serial');
  }
};

javascriptGenerator.forBlock['i2c_scan'] = function() {
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.setups_['wire_begin'] = '  Wire.begin();';
  generator.definitions_['i2c_scan_func'] = `
void i2cScan() {
  Serial.println("I2C Scan...");
  int count = 0;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("Found: 0x");
      if (addr < 16) Serial.print("0");
      Serial.println(addr, HEX);
      count++;
    }
  }
  Serial.print("Found ");
  Serial.print(count);
  Serial.println(" device(s).");
}`;
  return '  i2cScan();\n';
};

/**
 * i2c_write - I2C バイト書き込み
 */
Blockly.Blocks['i2c_write'] = {
  init: function() {
    this.appendValueInput('ADDR')
        .setCheck('Number')
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_I2C_WRITE || 'I2C Write'))
        .appendField(Blockly.Msg.BLOCKS_I2C_ADDRESS || 'addr');
    this.appendValueInput('DATA')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_I2C_DATA || 'data');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(I2C_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_I2C_WRITETOOLTIP || 'Write a byte to an I2C device');
  }
};

javascriptGenerator.forBlock['i2c_write'] = function(block: Blockly.Block) {
  const addr = javascriptGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0x00';
  const data = javascriptGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.setups_['wire_begin'] = '  Wire.begin();';
  return `  Wire.beginTransmission(${addr});\n  Wire.write(${data});\n  Wire.endTransmission();\n`;
};

/**
 * i2c_read - I2C バイト読み取り
 */
Blockly.Blocks['i2c_read'] = {
  init: function() {
    this.appendValueInput('ADDR')
        .setCheck('Number')
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_I2C_READ || 'I2C Read'))
        .appendField(Blockly.Msg.BLOCKS_I2C_ADDRESS || 'addr');
    this.appendValueInput('COUNT')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_I2C_BYTES || 'bytes');
    this.setOutput(true, 'Number');
    this.setColour(I2C_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_I2C_READTOOLTIP || 'Read a byte from an I2C device');
  }
};

javascriptGenerator.forBlock['i2c_read'] = function(block: Blockly.Block) {
  const addr = javascriptGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0x00';
  const count = javascriptGenerator.valueToCode(block, 'COUNT', Order.ATOMIC) || '1';
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.setups_['wire_begin'] = '  Wire.begin();';
  generator.definitions_['i2c_read_func'] = `
int i2cRead(int addr, int count) {
  Wire.requestFrom(addr, count);
  if (Wire.available()) {
    return Wire.read();
  }
  return -1;
}`;
  return [`i2cRead(${addr}, ${count})`, Order.FUNCTION_CALL];
};

/**
 * i2c_write_register - I2C レジスタ書き込み
 */
Blockly.Blocks['i2c_write_register'] = {
  init: function() {
    this.appendValueInput('ADDR')
        .setCheck('Number')
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_I2C_WRITEREG || 'I2C Write Register'))
        .appendField(Blockly.Msg.BLOCKS_I2C_ADDRESS || 'addr');
    this.appendValueInput('REG')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_I2C_REGISTER || 'reg');
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_I2C_VALUE || 'value');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(I2C_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_I2C_WRITEREGTOOLTIP || 'Write a value to a specific register of an I2C device');
  }
};

javascriptGenerator.forBlock['i2c_write_register'] = function(block: Blockly.Block) {
  const addr = javascriptGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0x00';
  const reg = javascriptGenerator.valueToCode(block, 'REG', Order.ATOMIC) || '0x00';
  const value = javascriptGenerator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.setups_['wire_begin'] = '  Wire.begin();';
  return `  Wire.beginTransmission(${addr});\n  Wire.write(${reg});\n  Wire.write(${value});\n  Wire.endTransmission();\n`;
};

/**
 * i2c_read_register - I2C レジスタ読み取り
 */
Blockly.Blocks['i2c_read_register'] = {
  init: function() {
    this.appendValueInput('ADDR')
        .setCheck('Number')
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_I2C_READREG || 'I2C Read Register'))
        .appendField(Blockly.Msg.BLOCKS_I2C_ADDRESS || 'addr');
    this.appendValueInput('REG')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_I2C_REGISTER || 'reg');
    this.setOutput(true, 'Number');
    this.setColour(I2C_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_I2C_READREGTOOLTIP || 'Read a value from a specific register of an I2C device');
  }
};

javascriptGenerator.forBlock['i2c_read_register'] = function(block: Blockly.Block) {
  const addr = javascriptGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0x00';
  const reg = javascriptGenerator.valueToCode(block, 'REG', Order.ATOMIC) || '0x00';
  generator.definitions_['include_wire'] = '#include <Wire.h>';
  generator.setups_['wire_begin'] = '  Wire.begin();';
  generator.definitions_['i2c_read_reg_func'] = `
int i2cReadRegister(int addr, int reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(addr, 1);
  if (Wire.available()) {
    return Wire.read();
  }
  return -1;
}`;
  return [`i2cReadRegister(${addr}, ${reg})`, Order.FUNCTION_CALL];
};

// ===== SPI ブロック =====

/**
 * spi_begin - SPI 初期化
 */
Blockly.Blocks['spi_begin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_SPI_BEGIN || 'SPI Begin'));
    this.appendDummyInput()
        .appendField('CS')
        .appendField(new Blockly.FieldNumber(5, 0, 39), 'CS');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SPI_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SPI_BEGINTOOLTIP || 'Initialize SPI communication with chip select pin');
  }
};

javascriptGenerator.forBlock['spi_begin'] = function(block: Blockly.Block) {
  const cs = block.getFieldValue('CS');
  generator.definitions_['include_spi'] = '#include <SPI.h>';
  generator.setups_['spi_begin'] = '  SPI.begin();';
  return `  pinMode(${cs}, OUTPUT);\n  digitalWrite(${cs}, HIGH);\n`;
};

/**
 * spi_transfer - SPI データ送受信
 */
Blockly.Blocks['spi_transfer'] = {
  init: function() {
    this.appendValueInput('DATA')
        .setCheck('Number')
        .appendField('🔌 ' + (Blockly.Msg.BLOCKS_SPI_TRANSFER || 'SPI Transfer'));
    this.appendDummyInput()
        .appendField('CS')
        .appendField(new Blockly.FieldNumber(5, 0, 39), 'CS');
    this.setOutput(true, 'Number');
    this.setColour(SPI_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SPI_TRANSFERTOOLTIP || 'Send a byte via SPI and receive a byte back');
  }
};

javascriptGenerator.forBlock['spi_transfer'] = function(block: Blockly.Block) {
  const data = javascriptGenerator.valueToCode(block, 'DATA', Order.ATOMIC) || '0';
  const cs = block.getFieldValue('CS');
  generator.definitions_['include_spi'] = '#include <SPI.h>';
  generator.definitions_['spi_transfer_func'] = `
byte spiTransfer(int cs, byte data) {
  digitalWrite(cs, LOW);
  byte result = SPI.transfer(data);
  digitalWrite(cs, HIGH);
  return result;
}`;
  return [`spiTransfer(${cs}, ${data})`, Order.FUNCTION_CALL];
};

console.log('I2C/SPI blocks loaded');
