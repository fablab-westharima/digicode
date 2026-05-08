/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * LoRa (SX1276/77/78/79) ブロック (52.md 強推奨、第80回 commit #11 / 2026-05-04)
 *
 * 6 ブロック構成 (Fab Academy Networking 週、長距離無線):
 *   - lora_init             (SS/RST/DIO0 pins)
 *   - lora_set_freq         (FREQ dropdown 433/868/915 MHz)
 *   - lora_set_power        (POWER 2-20 dBm)
 *   - lora_send             (DATA)
 *   - lora_on_receive       (HANDLER、loopPre_)
 *   - lora_received_value   (String、HANDLER 内専用)
 *
 * 内部 lib: `sandeepmistry/LoRa@^0.8.0` (commit #2 で追加済、generic SPI、SX1276/77/78/79)
 * boardRequires: null (汎用 ESP32 + transceiver SPI 接続、Q-B 確定)
 *
 * 注意: 周波数は地域別法令準拠 (日本 = 920 MHz 帯、欧州 868 MHz、北米 915 MHz)。
 *       本 block は世界共通 dropdown、user 責任で正しい周波数選択。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const LORA_COLOR = '#4B0082';

const LORA_INCLUDE = `
#include <SPI.h>
#include <LoRa.h>
String loraRxData = "";`;

Blockly.Blocks['lora_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_LORA_INIT || 'LoRa を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_LORA_SS || 'SS')
        .appendField(new Blockly.FieldNumber(5, 0, 39, 1), 'SS');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_LORA_RST || 'RST')
        .appendField(new Blockly.FieldNumber(14, 0, 39, 1), 'RST');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_LORA_DIO0 || 'DIO0')
        .appendField(new Blockly.FieldNumber(2, 0, 39, 1), 'DIO0');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LORA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LORA_INIT_TOOLTIP || 'LoRa SX1276/77/78/79 transceiver を初期化します。SPI 経由、SS (CS)、RST、DIO0 (受信割込) ピン指定。デフォルト 915 MHz。');
  }
};

generator.forBlock['lora_init'] = function(block: Blockly.Block) {
  const ss = block.getFieldValue('SS');
  const rst = block.getFieldValue('RST');
  const dio0 = block.getFieldValue('DIO0');
  generator.definitions_['include_lora'] = LORA_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['lora_init'] = `LoRa.setPins(${ss}, ${rst}, ${dio0});
  if (!LoRa.begin(915E6)) {
    Serial.println("[lora] init failed");
  }`;
  return '';
};

Blockly.Blocks['lora_set_freq'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_LORA_SET_FREQ || 'LoRa 周波数'))
        .appendField(new Blockly.FieldDropdown([
          ['433 MHz (亜・欧州一部)', '433E6'],
          ['868 MHz (欧州)', '868E6'],
          ['915 MHz (米州)', '915E6'],
          ['920 MHz (日本)', '920E6'],
        ]), 'FREQ');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LORA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LORA_SET_FREQ_TOOLTIP || 'LoRa 周波数を設定します。⚠️ 地域別法令に従って選択してください (日本=920 MHz、欧州=868、米州=915)。');
  }
};

generator.forBlock['lora_set_freq'] = function(block: Blockly.Block) {
  const freq = block.getFieldValue('FREQ');
  generator.definitions_['include_lora'] = generator.definitions_['include_lora'] || LORA_INCLUDE;
  return `LoRa.end(); LoRa.begin(${freq});\n`;
};

Blockly.Blocks['lora_set_power'] = {
  init: function() {
    this.appendValueInput('POWER')
        .setCheck('Number')
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_LORA_SET_POWER || 'LoRa 送信電力 (dBm)'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LORA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LORA_SET_POWER_TOOLTIP || 'LoRa 送信電力を設定します (2-20 dBm、PA_BOOST pin 使用)。⚠️ 地域別法令制限あり (日本 = 13 dBm 上限)。');
  }
};

generator.forBlock['lora_set_power'] = function(block: Blockly.Block) {
  const power = generator.valueToCode(block, 'POWER', Order.ATOMIC) || '14';
  generator.definitions_['include_lora'] = generator.definitions_['include_lora'] || LORA_INCLUDE;
  return `LoRa.setTxPower((int)(${power}));\n`;
};

Blockly.Blocks['lora_send'] = {
  init: function() {
    this.appendValueInput('DATA')
        .setCheck(['String', 'Number'])
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_LORA_SEND || 'LoRa 送信'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LORA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LORA_SEND_TOOLTIP || 'LoRa パケットを送信します。事前に lora_init が必要。');
  }
};

generator.forBlock['lora_send'] = function(block: Blockly.Block) {
  const data = generator.valueToCode(block, 'DATA', Order.ATOMIC) || '""';
  generator.definitions_['include_lora'] = generator.definitions_['include_lora'] || LORA_INCLUDE;
  return `LoRa.beginPacket();
LoRa.print(String(${data}));
LoRa.endPacket();
`;
};

Blockly.Blocks['lora_on_receive'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_LORA_ON_RECEIVE || 'LoRa 受信したら'));
    this.appendStatementInput('HANDLER')
        .setCheck(null);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(LORA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LORA_ON_RECEIVE_TOOLTIP || 'LoRa パケット受信時に HANDLER を実行します。loopPre_ で 1 tick injection、HANDLER は arduino_loop の中に配置必須。');
  }
};

generator.forBlock['lora_on_receive'] = function(block: Blockly.Block) {
  const handler = generator.statementToCode(block, 'HANDLER');
  generator.definitions_['include_lora'] = generator.definitions_['include_lora'] || LORA_INCLUDE;
  generator.definitions_['lora_handler'] = `
void onLoraReceive() {
${handler}}`;
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['lora_check_recv'] = `
  int _loraPacketSize = LoRa.parsePacket();
  if (_loraPacketSize) {
    loraRxData = "";
    while (LoRa.available()) loraRxData += (char)LoRa.read();
    onLoraReceive();
  }`;
  return '';
};

Blockly.Blocks['lora_received_value'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📡 ' + (Blockly.Msg.BLOCKS_LORA_RECEIVED_VALUE || 'LoRa 受信データ'));
    this.setOutput(true, 'String');
    this.setColour(LORA_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_LORA_RECEIVED_VALUE_TOOLTIP || 'LoRa で受信したパケットデータを返します。lora_on_receive の HANDLER 内でのみ valid (HANDLER 外では空文字列)。');
  }
};

generator.forBlock['lora_received_value'] = function() {
  generator.definitions_['include_lora'] = generator.definitions_['include_lora'] || LORA_INCLUDE;
  return ['loraRxData', Order.ATOMIC];
};

console.log('LoRa SX1276 blocks loaded');
