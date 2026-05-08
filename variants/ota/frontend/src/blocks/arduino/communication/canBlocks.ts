/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * CAN Bus ブロック (BP7-2, 2026-04-20)
 *
 * ESP32-TWAI-CAN ライブラリ使用（ESP-IDF TWAI ドライバのラッパー）
 * ESP32 内蔵 TWAI コントローラを使用（外部 CAN トランシーバ IC が別途必要）
 * 対応: ESP32 / ESP32-S2 / ESP32-S3 / ESP32-C3
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const CAN_COLOR = '#37474F';

const CAN_INCLUDE = `
#include <ESP32-TWAI-CAN.hpp>
CanFrame canRxFrame;
bool canRxAvailable = false;`;

/**
 * can_init - CAN バス初期化
 */
Blockly.Blocks['can_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚗 ' + (Blockly.Msg.BLOCKS_CAN_INIT || 'CAN Init'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_CAN_TXPIN || 'TX pin')
        .appendField(new Blockly.FieldNumber(5, 0, 39), 'TX')
        .appendField(Blockly.Msg.BLOCKS_CAN_RXPIN || 'RX pin')
        .appendField(new Blockly.FieldNumber(4, 0, 39), 'RX');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_CAN_BAUD || 'baud rate')
        .appendField(new Blockly.FieldDropdown([
          ['125 kbps', '125'],
          ['250 kbps', '250'],
          ['500 kbps', '500'],
          ['1 Mbps', '1000'],
        ]), 'BAUD');
    this.setOutput(true, 'Boolean');
    this.setColour(CAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAN_INITTOOLTIP || 'Initialize CAN bus with TX/RX pins and baud rate. A CAN transceiver IC (e.g. SN65HVD230) is required between ESP32 and CAN bus. Returns true if successful.');
  }
};

generator.forBlock['can_init'] = function(block: Blockly.Block) {
  const tx = block.getFieldValue('TX');
  const rx = block.getFieldValue('RX');
  const baud = block.getFieldValue('BAUD');
  generator.definitions_['include_can'] = CAN_INCLUDE;
  return [`([&](){
  ESP32Can.setPins(${tx}, ${rx});
  ESP32Can.setSpeed(ESP32Can.convertSpeed(${baud}));
  return ESP32Can.begin();
})()`, 0];
};

/**
 * can_send - CAN メッセージ送信
 */
Blockly.Blocks['can_send'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚗 ' + (Blockly.Msg.BLOCKS_CAN_SEND || 'CAN Send'));
    this.appendValueInput('ID')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_CAN_ID || 'ID (hex)');
    this.appendValueInput('DATA')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_CAN_DATA || 'data (max 8 bytes)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(CAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAN_SENDTOOLTIP || 'Send a CAN message with the specified ID and data string (max 8 bytes). ID is an integer (e.g. 0x123 = 291).');
  }
};

generator.forBlock['can_send'] = function(block: Blockly.Block) {
  const id = javascriptGenerator.valueToCode(block, 'ID', 0) || '0x123';
  const data = javascriptGenerator.valueToCode(block, 'DATA', 0) || '""';
  generator.definitions_['include_can'] = CAN_INCLUDE;
  return `  {
    CanFrame txFr = { 0 };
    txFr.identifier = ${id};
    String _d = String(${data});
    txFr.data_length_code = min((int)_d.length(), 8);
    for (int i = 0; i < txFr.data_length_code; i++) txFr.data[i] = _d[i];
    ESP32Can.writeFrame(txFr);
  }\n`;
};

/**
 * can_receive_available - 受信メッセージあるか確認
 * loop 内で呼ぶ、あれば canRxFrame に格納
 */
Blockly.Blocks['can_receive_available'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚗 ' + (Blockly.Msg.BLOCKS_CAN_AVAILABLE || 'CAN Message Available?'));
    this.setOutput(true, 'Boolean');
    this.setColour(CAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAN_AVAILABLETOOLTIP || 'Returns true if a new CAN message was received. After this returns true, use can_get_id and can_get_data to read the message. Place in loop block.');
  }
};

generator.forBlock['can_receive_available'] = function() {
  generator.definitions_['include_can'] = CAN_INCLUDE;
  return ['ESP32Can.readFrame(canRxFrame, 0)', 0];
};

/**
 * can_get_received_id - 受信メッセージの ID 取得
 */
Blockly.Blocks['can_get_received_id'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚗 ' + (Blockly.Msg.BLOCKS_CAN_GETID || 'CAN Received ID'));
    this.setOutput(true, 'Number');
    this.setColour(CAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAN_GETIDTOOLTIP || 'Get the ID of the last received CAN message. Call after can_receive_available returns true.');
  }
};

generator.forBlock['can_get_received_id'] = function() {
  generator.definitions_['include_can'] = CAN_INCLUDE;
  return ['(int)canRxFrame.identifier', 0];
};

/**
 * can_get_received_data - 受信メッセージのデータ取得（String）
 */
Blockly.Blocks['can_get_received_data'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🚗 ' + (Blockly.Msg.BLOCKS_CAN_GETDATA || 'CAN Received Data'));
    this.setOutput(true, 'String');
    this.setColour(CAN_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_CAN_GETDATATOOLTIP || 'Get the data of the last received CAN message as a String. Call after can_receive_available returns true.');
  }
};

generator.forBlock['can_get_received_data'] = function() {
  generator.definitions_['include_can'] = CAN_INCLUDE;
  generator.definitions_['can_data_func'] = `
String canGetData() {
  String s = "";
  for (int i = 0; i < canRxFrame.data_length_code; i++) s += (char)canRxFrame.data[i];
  return s;
}`;
  return ['canGetData()', 0];
};

console.log('CAN bus blocks loaded');
