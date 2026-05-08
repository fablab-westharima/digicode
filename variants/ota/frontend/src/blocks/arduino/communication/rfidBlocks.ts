/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * RFID ブロック (BP6-5, 2026-04-20 / BUG-059 closure 2026-04-30)
 *
 * arozcan/MFRC522-I2C-Library 使用（I2C 専用）
 *
 * rfid_init_m5stack: M5Stack RFID 2 Unit (WS1850S, I2C 0x28)
 *   → 日本の電波法: 技適取得済みデバイス（合法）
 *   → DigiCode 公式採用: 技適制約により SPI 版 MFRC522 は永久にサポートしない
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const RFID_COLOR = '#4CAF50';
const RFID_WARN_COLOR = '#FF9800';

const RFID_DEFAULT_KEY = `
byte rfidDefaultKey[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};`;

/**
 * rfid_init_m5stack - M5Stack RFID 2 Unit 初期化（I2C、技適対応）
 */
Blockly.Blocks['rfid_init_m5stack'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🪪 ' + (Blockly.Msg.BLOCKS_RFID_INITM5 || 'RFID Init (M5Stack)'));
    this.setOutput(true, 'Boolean');
    this.setColour(RFID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RFID_INITM5TOOLTIP || 'Initialize M5Stack RFID 2 Unit (WS1850S) via I2C. I2C address 0x28, no CS/RST pins needed. This device has Japanese 技適 certification.');
  }
};

generator.forBlock['rfid_init_m5stack'] = function() {
  generator.definitions_['include_rfid'] = `
#include <Wire.h>
#include <MFRC522_I2C.h>
MFRC522 mfrc522(0x28, -1);`;
  generator.definitions_['rfid_default_key'] = RFID_DEFAULT_KEY;
  return [`([&](){ Wire.begin(); mfrc522.PCD_Init(); return mfrc522.PCD_PerformSelfTest(); })()`, 0];
};

/**
 * rfid_is_card_present - カード検出
 */
Blockly.Blocks['rfid_is_card_present'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🪪 ' + (Blockly.Msg.BLOCKS_RFID_ISPRESENT || 'RFID Card Present?'));
    this.setOutput(true, 'Boolean');
    this.setColour(RFID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RFID_ISPRESENTTOOLTIP || 'Returns true if an RFID card/tag is detected. Place in loop block to continuously check for cards.');
  }
};

generator.forBlock['rfid_is_card_present'] = function() {
  generator.definitions_['include_rfid'] = generator.definitions_['include_rfid'] || `
#include <Wire.h>
#include <MFRC522_I2C.h>
MFRC522 mfrc522(0x28, -1);`;
  return ['(mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial())', 0];
};

/**
 * rfid_read_uid - UID 取得（hex 文字列）
 */
Blockly.Blocks['rfid_read_uid'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🪪 ' + (Blockly.Msg.BLOCKS_RFID_READUID || 'RFID Read UID'));
    this.setOutput(true, 'String');
    this.setColour(RFID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RFID_READUIDTOOLTIP || 'Read the UID of the detected card as a hex string (e.g. "04:A3:B5:C9"). Call after rfid_is_card_present returns true.');
  }
};

generator.forBlock['rfid_read_uid'] = function() {
  generator.definitions_['include_rfid'] = generator.definitions_['include_rfid'] || `
#include <Wire.h>
#include <MFRC522_I2C.h>
MFRC522 mfrc522(0x28, -1);`;
  generator.definitions_['rfid_read_uid_func'] = `
String rfidReadUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (i > 0) uid += ":";
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}`;
  return ['rfidReadUID()', 0];
};

/**
 * rfid_read_data - ブロックデータ読み取り（デフォルト認証鍵）
 */
Blockly.Blocks['rfid_read_data'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🪪 ' + (Blockly.Msg.BLOCKS_RFID_READDATA || 'RFID Read Data'))
        .appendField(Blockly.Msg.BLOCKS_RFID_BLOCK || 'block')
        .appendField(new Blockly.FieldNumber(1, 0, 63), 'BLOCK');
    this.setOutput(true, 'String');
    this.setColour(RFID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RFID_READDATATOOLTIP || 'Read 16 bytes from the specified block (0-63) as a string. Uses default authentication key (0xFF×6). Avoid block 0 (manufacturer data).');
  }
};

generator.forBlock['rfid_read_data'] = function(block: Blockly.Block) {
  const blk = block.getFieldValue('BLOCK');
  generator.definitions_['include_rfid'] = generator.definitions_['include_rfid'] || `
#include <Wire.h>
#include <MFRC522_I2C.h>
MFRC522 mfrc522(0x28, -1);`;
  generator.definitions_['rfid_default_key'] = RFID_DEFAULT_KEY;
  generator.definitions_['rfid_read_data_func'] = `
String rfidReadData(byte blockNum) {
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = rfidDefaultKey[i];
  byte sector = blockNum / 4;
  byte trailer = sector * 4 + 3;
  if (mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailer, &key, &(mfrc522.uid)) != MFRC522::STATUS_OK) return "";
  byte buf[18]; byte size = 18;
  if (mfrc522.MIFARE_Read(blockNum, buf, &size) != MFRC522::STATUS_OK) return "";
  return String((char*)buf).substring(0, 16);
}`;
  return [`rfidReadData(${blk})`, 0];
};

/**
 * rfid_write_data - ブロックへデータ書き込み（デフォルト認証鍵）
 */
Blockly.Blocks['rfid_write_data'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🪪 ' + (Blockly.Msg.BLOCKS_RFID_WRITEDATA || 'RFID Write Data'))
        .appendField(Blockly.Msg.BLOCKS_RFID_BLOCK || 'block')
        .appendField(new Blockly.FieldNumber(1, 0, 62), 'BLOCK');
    this.appendValueInput('DATA')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_RFID_DATA || 'data (max 16 chars)');
    this.setOutput(true, 'Boolean');
    this.setColour(RFID_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RFID_WRITEDATATOOLTIP || 'Write up to 16 characters to the specified block. Uses default authentication key (0xFF×6). Returns true on success. Avoid blocks 0 and sector trailer blocks (3,7,11...).');
  }
};

generator.forBlock['rfid_write_data'] = function(block: Blockly.Block) {
  const blk = block.getFieldValue('BLOCK');
  const data = javascriptGenerator.valueToCode(block, 'DATA', 0) || '""';
  generator.definitions_['include_rfid'] = generator.definitions_['include_rfid'] || `
#include <Wire.h>
#include <MFRC522_I2C.h>
MFRC522 mfrc522(0x28, -1);`;
  generator.definitions_['rfid_default_key'] = RFID_DEFAULT_KEY;
  generator.definitions_['rfid_write_data_func'] = `
bool rfidWriteData(byte blockNum, const String& text) {
  MFRC522::MIFARE_Key key;
  for (byte i = 0; i < 6; i++) key.keyByte[i] = rfidDefaultKey[i];
  byte sector = blockNum / 4;
  byte trailer = sector * 4 + 3;
  if (mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, trailer, &key, &(mfrc522.uid)) != MFRC522::STATUS_OK) return false;
  byte buf[16];
  memset(buf, 0x20, 16);
  for (byte i = 0; i < text.length() && i < 16; i++) buf[i] = text[i];
  return mfrc522.MIFARE_Write(blockNum, buf, 16) == MFRC522::STATUS_OK;
}`;
  return [`rfidWriteData(${blk}, String(${data}))`, 0];
};

console.log('RFID blocks loaded');
