/**
 * Modbus RTU master ブロック (52.md 強推奨、第80回 commit #14 / 2026-05-04)
 *
 * 4 ブロック構成 (Factory 産業センサ・PLC 接続の標準):
 *   - modbus_init                   (RX/TX/DE_RE/BAUD、HardwareSerial2 + RS485 transceiver)
 *   - modbus_set_slave_id           (ID 1-247)
 *   - modbus_read_holding_register  (ADDR、Number 出力)
 *   - modbus_write_register         (ADDR/VALUE)
 *
 * 内部 lib: `4-20ma/ModbusMaster@^2.0.1` (commit #2 で追加済、業界標準)
 * boardRequires: null (UART 全 board 対応、RS485 transceiver MAX485 等併用前提)
 *
 * RS485 接続: ESP32 UART → MAX485 → 二線式バス。DE/RE pin で送受切替 (HIGH=送信、LOW=受信)。
 * AI 生成時の注意 (commit #21 prompt): 「DE/RE pin 制御必須」を明記。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const MODBUS_COLOR = '#37474F';

const MODBUS_INCLUDE = `
#include <ModbusMaster.h>
ModbusMaster modbusNode;
HardwareSerial modbusSerial(2);
int _modbusDeRePin = 4;
void modbusPreTransmission() { digitalWrite(_modbusDeRePin, HIGH); }
void modbusPostTransmission() { digitalWrite(_modbusDeRePin, LOW); }`;

Blockly.Blocks['modbus_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏭 ' + (Blockly.Msg.BLOCKS_MODBUS_INIT || 'Modbus RTU を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MODBUS_RX || 'RX')
        .appendField(new Blockly.FieldNumber(16, 0, 39, 1), 'RX');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MODBUS_TX || 'TX')
        .appendField(new Blockly.FieldNumber(17, 0, 39, 1), 'TX');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MODBUS_DE_RE || 'DE/RE')
        .appendField(new Blockly.FieldNumber(4, 0, 39, 1), 'DE_RE');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MODBUS_BAUD || 'ボーレート')
        .appendField(new Blockly.FieldNumber(9600, 1200, 115200, 1), 'BAUD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MODBUS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MODBUS_INIT_TOOLTIP || 'Modbus RTU master を初期化します。RS485 transceiver (MAX485 等) 経由で UART2 + DE/RE pin。デフォルト slave ID=1 で初期化、modbus_set_slave_id で変更。');
  }
};

generator.forBlock['modbus_init'] = function(block: Blockly.Block) {
  const rx = block.getFieldValue('RX');
  const tx = block.getFieldValue('TX');
  const deRe = block.getFieldValue('DE_RE');
  const baud = block.getFieldValue('BAUD');
  generator.definitions_['include_modbus'] = MODBUS_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['modbus_init'] = `_modbusDeRePin = ${deRe};
  pinMode(${deRe}, OUTPUT);
  digitalWrite(${deRe}, LOW);
  modbusSerial.begin(${baud}, SERIAL_8N1, ${rx}, ${tx});
  modbusNode.begin(1, modbusSerial);
  modbusNode.preTransmission(modbusPreTransmission);
  modbusNode.postTransmission(modbusPostTransmission);`;
  return '';
};

Blockly.Blocks['modbus_set_slave_id'] = {
  init: function() {
    this.appendValueInput('ID')
        .setCheck('Number')
        .appendField('🏭 ' + (Blockly.Msg.BLOCKS_MODBUS_SET_SLAVE_ID || 'Modbus スレーブ ID'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MODBUS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MODBUS_SET_SLAVE_ID_TOOLTIP || 'Modbus スレーブ ID を設定します (1-247)。複数スレーブ通信時は通信前に切替必要。');
  }
};

generator.forBlock['modbus_set_slave_id'] = function(block: Blockly.Block) {
  const id = generator.valueToCode(block, 'ID', Order.ATOMIC) || '1';
  generator.definitions_['include_modbus'] = generator.definitions_['include_modbus'] || MODBUS_INCLUDE;
  return `modbusNode.begin((uint8_t)(${id}), modbusSerial);
modbusNode.preTransmission(modbusPreTransmission);
modbusNode.postTransmission(modbusPostTransmission);
`;
};

Blockly.Blocks['modbus_read_holding_register'] = {
  init: function() {
    this.appendValueInput('ADDR')
        .setCheck('Number')
        .appendField('🏭 ' + (Blockly.Msg.BLOCKS_MODBUS_READ_HOLDING || 'Modbus ホールディング読込 アドレス'));
    this.setOutput(true, 'Number');
    this.setColour(MODBUS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MODBUS_READ_HOLDING_TOOLTIP || 'Modbus ホールディングレジスタを 1 つ読込みます (function code 0x03)。失敗時 -1 返却。');
  }
};

generator.forBlock['modbus_read_holding_register'] = function(block: Blockly.Block) {
  const addr = generator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0';
  generator.definitions_['include_modbus'] = generator.definitions_['include_modbus'] || MODBUS_INCLUDE;
  return [
    `((modbusNode.readHoldingRegisters((uint16_t)(${addr}), 1) == modbusNode.ku8MBSuccess) ? (int)modbusNode.getResponseBuffer(0) : -1)`,
    Order.CONDITIONAL,
  ];
};

Blockly.Blocks['modbus_write_register'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🏭 ' + (Blockly.Msg.BLOCKS_MODBUS_WRITE_REGISTER || 'Modbus レジスタ書込'));
    this.appendValueInput('ADDR')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_MODBUS_ADDR || 'アドレス');
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_MODBUS_VALUE || '値');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MODBUS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MODBUS_WRITE_REGISTER_TOOLTIP || 'Modbus レジスタに値を書込みます (function code 0x06)。');
  }
};

generator.forBlock['modbus_write_register'] = function(block: Blockly.Block) {
  const addr = generator.valueToCode(block, 'ADDR', Order.ATOMIC) || '0';
  const value = generator.valueToCode(block, 'VALUE', Order.ATOMIC) || '0';
  generator.definitions_['include_modbus'] = generator.definitions_['include_modbus'] || MODBUS_INCLUDE;
  return `modbusNode.writeSingleRegister((uint16_t)(${addr}), (uint16_t)(${value}));\n`;
};

console.log('Modbus RTU master blocks loaded');
