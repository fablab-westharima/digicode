/**
 * ファイルシステムブロック (BP3-5/BP3-6, 2026-04-20)
 *
 * sd_*: SD.h 標準ライブラリ (ESP32 系 16 boards)
 * fs_*: LittleFS (ESP32 LittleFS.h 標準)
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const SD_COLOR = '#FF9800';
const FS_COLOR = '#009688';

// ===== SD カード (BP3-5) =====

/**
 * sd_begin - SD カード初期化
 */
Blockly.Blocks['sd_begin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📂 ' + (Blockly.Msg.BLOCKS_SD_BEGIN || 'SD Begin'))
        .appendField(Blockly.Msg.BLOCKS_SD_CSPIN || 'CS pin')
        .appendField(new Blockly.FieldNumber(5, 0, 39), 'CS_PIN');
    this.setOutput(true, 'Boolean');
    this.setColour(SD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SD_BEGINTOOLTIP || 'Initialize SD card with the specified CS pin. Returns true if successful.');
  }
};

generator.forBlock['sd_begin'] = function(block: Blockly.Block) {
  const csPin = block.getFieldValue('CS_PIN');
  generator.definitions_['include_sd'] = '#include <SD.h>\n#include <SPI.h>';
  return [`SD.begin(${csPin})`, 0];
};

/**
 * sd_write - ファイル書き込み
 */
Blockly.Blocks['sd_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📂 ' + (Blockly.Msg.BLOCKS_SD_WRITE || 'SD Write'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_SD_APPEND || 'append', 'FILE_APPEND'],
          [Blockly.Msg.BLOCKS_SD_OVERWRITE || 'overwrite', 'FILE_WRITE'],
        ]), 'MODE');
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_SD_FILENAME || 'file');
    this.appendValueInput('CONTENT')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_SD_CONTENT || 'content');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SD_WRITETOOLTIP || 'Write content to a file on SD card. Append adds to existing file, Overwrite replaces it.');
  }
};

generator.forBlock['sd_write'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/data.txt"';
  const content = javascriptGenerator.valueToCode(block, 'CONTENT', 0) || '""';
  generator.definitions_['include_sd'] = '#include <SD.h>\n#include <SPI.h>';
  return `  { File f = SD.open(${filename}, ${mode}); if(f){ f.println(${content}); f.close(); } }\n`;
};

/**
 * sd_read - ファイル読み取り（全内容を String で返す）
 */
Blockly.Blocks['sd_read'] = {
  init: function() {
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField('📂 ' + (Blockly.Msg.BLOCKS_SD_READ || 'SD Read'));
    this.setOutput(true, 'String');
    this.setColour(SD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SD_READTOOLTIP || 'Read all contents of a file from SD card as a String.');
  }
};

generator.forBlock['sd_read'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/data.txt"';
  generator.definitions_['include_sd'] = '#include <SD.h>\n#include <SPI.h>';
  generator.definitions_['sd_read_func'] = `
String sdReadFile(const char* path) {
  String result = "";
  File f = SD.open(path);
  if(f){ while(f.available()){ result += (char)f.read(); } f.close(); }
  return result;
}`;
  return [`sdReadFile(${filename})`, 0];
};

/**
 * sd_exists - ファイル存在確認
 */
Blockly.Blocks['sd_exists'] = {
  init: function() {
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField('📂 ' + (Blockly.Msg.BLOCKS_SD_EXISTS || 'SD Exists'));
    this.setOutput(true, 'Boolean');
    this.setColour(SD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SD_EXISTSTOOLTIP || 'Check if a file exists on SD card. Returns true if found.');
  }
};

generator.forBlock['sd_exists'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/data.txt"';
  generator.definitions_['include_sd'] = '#include <SD.h>\n#include <SPI.h>';
  return [`SD.exists(${filename})`, 0];
};

/**
 * sd_delete - ファイル削除
 */
Blockly.Blocks['sd_delete'] = {
  init: function() {
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField('📂 ' + (Blockly.Msg.BLOCKS_SD_DELETE || 'SD Delete'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SD_DELETETOOLTIP || 'Delete a file from SD card.');
  }
};

generator.forBlock['sd_delete'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/data.txt"';
  generator.definitions_['include_sd'] = '#include <SD.h>\n#include <SPI.h>';
  return `  SD.remove(${filename});\n`;
};

/**
 * sd_csv_append - CSV 行追記（データロガー定番）
 */
Blockly.Blocks['sd_csv_append'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('📂 ' + (Blockly.Msg.BLOCKS_SD_CSV || 'SD CSV Append'));
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_SD_FILENAME || 'file');
    this.appendValueInput('COL1')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_SD_COL1 || 'col1');
    this.appendValueInput('COL2')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_SD_COL2 || 'col2');
    this.appendValueInput('COL3')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_SD_COL3 || 'col3');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(SD_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_SD_CSVTOOLTIP || 'Append a 3-column CSV row to a file on SD card. Ideal for data logging.');
  }
};

generator.forBlock['sd_csv_append'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/log.csv"';
  const col1 = javascriptGenerator.valueToCode(block, 'COL1', 0) || '""';
  const col2 = javascriptGenerator.valueToCode(block, 'COL2', 0) || '""';
  const col3 = javascriptGenerator.valueToCode(block, 'COL3', 0) || '""';
  generator.definitions_['include_sd'] = '#include <SD.h>\n#include <SPI.h>';
  return `  { File f = SD.open(${filename}, FILE_APPEND); if(f){ f.print(${col1}); f.print(","); f.print(${col2}); f.print(","); f.println(${col3}); f.close(); } }\n`;
};

// ===== LittleFS (BP3-6) =====

/**
 * fs_mount - LittleFS マウント
 */
Blockly.Blocks['fs_mount'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🗂️ ' + (Blockly.Msg.BLOCKS_FS_MOUNT || 'LittleFS Mount'));
    this.setOutput(true, 'Boolean');
    this.setColour(FS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_FS_MOUNTTOOLTIP || 'Mount the LittleFS filesystem. Returns true if successful.');
  }
};

generator.forBlock['fs_mount'] = function() {
  generator.definitions_['include_littlefs'] =
    '#if defined(ESP32)\n#include <LittleFS.h>\n#else\n#include <LittleFS.h>\n#endif';
  return ['LittleFS.begin()', 0];
};

/**
 * fs_write - LittleFS ファイル書き込み
 */
Blockly.Blocks['fs_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🗂️ ' + (Blockly.Msg.BLOCKS_FS_WRITE || 'LittleFS Write'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_SD_APPEND || 'append', 'a'],
          [Blockly.Msg.BLOCKS_SD_OVERWRITE || 'overwrite', 'w'],
        ]), 'MODE');
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField(Blockly.Msg.BLOCKS_SD_FILENAME || 'file');
    this.appendValueInput('CONTENT')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_SD_CONTENT || 'content');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(FS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_FS_WRITETOOLTIP || 'Write content to a file in LittleFS (internal flash storage).');
  }
};

generator.forBlock['fs_write'] = function(block: Blockly.Block) {
  const mode = block.getFieldValue('MODE');
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/config.txt"';
  const content = javascriptGenerator.valueToCode(block, 'CONTENT', 0) || '""';
  generator.definitions_['include_littlefs'] =
    '#if defined(ESP32)\n#include <LittleFS.h>\n#else\n#include <LittleFS.h>\n#endif';
  return `  { File f = LittleFS.open(${filename}, "${mode}"); if(f){ f.println(${content}); f.close(); } }\n`;
};

/**
 * fs_read - LittleFS ファイル読み取り
 */
Blockly.Blocks['fs_read'] = {
  init: function() {
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField('🗂️ ' + (Blockly.Msg.BLOCKS_FS_READ || 'LittleFS Read'));
    this.setOutput(true, 'String');
    this.setColour(FS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_FS_READTOOLTIP || 'Read all contents of a file from LittleFS as a String.');
  }
};

generator.forBlock['fs_read'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/config.txt"';
  generator.definitions_['include_littlefs'] =
    '#if defined(ESP32)\n#include <LittleFS.h>\n#else\n#include <LittleFS.h>\n#endif';
  generator.definitions_['fs_read_func'] = `
String fsReadFile(const char* path) {
  String result = "";
  File f = LittleFS.open(path, "r");
  if(f){ while(f.available()){ result += (char)f.read(); } f.close(); }
  return result;
}`;
  return [`fsReadFile(${filename})`, 0];
};

/**
 * fs_exists - ファイル存在確認
 */
Blockly.Blocks['fs_exists'] = {
  init: function() {
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField('🗂️ ' + (Blockly.Msg.BLOCKS_FS_EXISTS || 'LittleFS Exists'));
    this.setOutput(true, 'Boolean');
    this.setColour(FS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_FS_EXISTSTOOLTIP || 'Check if a file exists in LittleFS. Returns true if found.');
  }
};

generator.forBlock['fs_exists'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/config.txt"';
  generator.definitions_['include_littlefs'] =
    '#if defined(ESP32)\n#include <LittleFS.h>\n#else\n#include <LittleFS.h>\n#endif';
  return [`LittleFS.exists(${filename})`, 0];
};

/**
 * fs_delete - ファイル削除
 */
Blockly.Blocks['fs_delete'] = {
  init: function() {
    this.appendValueInput('FILENAME')
        .setCheck('String')
        .appendField('🗂️ ' + (Blockly.Msg.BLOCKS_FS_DELETE || 'LittleFS Delete'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(FS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_FS_DELETETOOLTIP || 'Delete a file from LittleFS.');
  }
};

generator.forBlock['fs_delete'] = function(block: Blockly.Block) {
  const filename = javascriptGenerator.valueToCode(block, 'FILENAME', 0) || '"/config.txt"';
  generator.definitions_['include_littlefs'] =
    '#if defined(ESP32)\n#include <LittleFS.h>\n#else\n#include <LittleFS.h>\n#endif';
  return `  LittleFS.remove(${filename});\n`;
};

console.log('Storage FS (SD/LittleFS) blocks loaded');
