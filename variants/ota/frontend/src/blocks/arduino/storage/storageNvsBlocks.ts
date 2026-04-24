/**
 * 設定保存ブロック (BP3-3/BP3-4, 2026-04-20)
 *
 * preferences_*: ESP32 NVS (Preferences.h) / RP2040 EEPROM エミュレーション分岐
 * eeprom_*: AVR 風アドレスベース API (ESP32/RP2040 両対応)
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const NVS_COLOR = '#795548';
const EEPROM_COLOR = '#607D8B';

// ===== Preferences / NVS =====

/**
 * preferences_begin - Preferences 名前空間開始
 */
Blockly.Blocks['preferences_begin'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💾 ' + (Blockly.Msg.BLOCKS_PREFERENCES_BEGIN || 'Preferences Begin'))
        .appendField(Blockly.Msg.BLOCKS_PREFERENCES_NAMESPACE || 'namespace')
        .appendField(new Blockly.FieldTextInput('config'), 'NAMESPACE')
        .appendField(Blockly.Msg.BLOCKS_PREFERENCES_READONLY || 'read-only')
        .appendField(new Blockly.FieldCheckbox('FALSE'), 'READONLY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NVS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PREFERENCES_BEGINTOOLTIP || 'Open a Preferences namespace for read/write. ESP32: NVS flash storage. RP2040: EEPROM emulation.');
  }
};

generator.forBlock['preferences_begin'] = function(block: Blockly.Block) {
  const namespace = block.getFieldValue('NAMESPACE');
  const readonly = block.getFieldValue('READONLY') === 'TRUE';
  generator.definitions_['include_preferences'] =
    '#if defined(ESP32)\n#include <Preferences.h>\nPreferences preferences;\n#else\n#include <EEPROM.h>\n#endif';
  return `  preferences.begin("${namespace}", ${readonly});\n`;
};

/**
 * preferences_end - Preferences 終了
 */
Blockly.Blocks['preferences_end'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💾 ' + (Blockly.Msg.BLOCKS_PREFERENCES_END || 'Preferences End'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NVS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PREFERENCES_ENDTOOLTIP || 'Close the Preferences namespace and free resources.');
  }
};

generator.forBlock['preferences_end'] = function() {
  return '  preferences.end();\n';
};

/**
 * preferences_put - Preferences 書き込み（int/float/string）
 */
Blockly.Blocks['preferences_put'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💾 ' + (Blockly.Msg.BLOCKS_PREFERENCES_PUT || 'Preferences Put'))
        .appendField(new Blockly.FieldDropdown([
          ['Int', 'Int'],
          ['Float', 'Float'],
          ['String', 'String'],
        ]), 'TYPE')
        .appendField(Blockly.Msg.BLOCKS_PREFERENCES_KEY || 'key')
        .appendField(new Blockly.FieldTextInput('myKey'), 'KEY');
    this.appendValueInput('VALUE')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_PREFERENCES_VALUE || 'value');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NVS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PREFERENCES_PUTTOOLTIP || 'Save a value (int/float/string) to Preferences storage with the given key.');
  }
};

generator.forBlock['preferences_put'] = function(block: Blockly.Block) {
  const type = block.getFieldValue('TYPE');
  const key = block.getFieldValue('KEY');
  const value = javascriptGenerator.valueToCode(block, 'VALUE', 0) || '0';
  return `  preferences.put${type}("${key}", ${value});\n`;
};

/**
 * preferences_get - Preferences 読み取り（int/float/string）
 */
Blockly.Blocks['preferences_get'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💾 ' + (Blockly.Msg.BLOCKS_PREFERENCES_GET || 'Preferences Get'))
        .appendField(new Blockly.FieldDropdown([
          ['Int', 'Int'],
          ['Float', 'Float'],
          ['String', 'String'],
        ]), 'TYPE')
        .appendField(Blockly.Msg.BLOCKS_PREFERENCES_KEY || 'key')
        .appendField(new Blockly.FieldTextInput('myKey'), 'KEY');
    this.appendValueInput('DEFAULT')
        .setCheck(null)
        .appendField(Blockly.Msg.BLOCKS_PREFERENCES_DEFAULT || 'default');
    this.setOutput(true, null);
    this.setColour(NVS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PREFERENCES_GETTOOLTIP || 'Read a value from Preferences storage. Returns the default value if the key does not exist.');
  }
};

generator.forBlock['preferences_get'] = function(block: Blockly.Block) {
  const type = block.getFieldValue('TYPE');
  const key = block.getFieldValue('KEY');
  const defaultVal = javascriptGenerator.valueToCode(block, 'DEFAULT', 0) || (type === 'String' ? '""' : '0');
  return [`preferences.get${type}("${key}", ${defaultVal})`, 0];
};

/**
 * preferences_remove - キー削除
 */
Blockly.Blocks['preferences_remove'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💾 ' + (Blockly.Msg.BLOCKS_PREFERENCES_REMOVE || 'Preferences Remove'))
        .appendField(Blockly.Msg.BLOCKS_PREFERENCES_KEY || 'key')
        .appendField(new Blockly.FieldTextInput('myKey'), 'KEY');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NVS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PREFERENCES_REMOVETOOLTIP || 'Delete a specific key from Preferences storage.');
  }
};

generator.forBlock['preferences_remove'] = function(block: Blockly.Block) {
  const key = block.getFieldValue('KEY');
  return `  preferences.remove("${key}");\n`;
};

/**
 * preferences_clear - 名前空間全消去
 */
Blockly.Blocks['preferences_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💾 ' + (Blockly.Msg.BLOCKS_PREFERENCES_CLEAR || 'Preferences Clear'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(NVS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_PREFERENCES_CLEARTOOLTIP || 'Delete all keys in the current Preferences namespace.');
  }
};

generator.forBlock['preferences_clear'] = function() {
  return '  preferences.clear();\n';
};

// ===== EEPROM (BP3-4) =====

/**
 * eeprom_write - アドレス指定書き込み
 */
Blockly.Blocks['eeprom_write'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💿 ' + (Blockly.Msg.BLOCKS_EEPROM_WRITE || 'EEPROM Write'));
    this.appendValueInput('ADDRESS')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_EEPROM_ADDRESS || 'address');
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(Blockly.Msg.BLOCKS_EEPROM_VALUE || 'value');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(EEPROM_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EEPROM_WRITETOOLTIP || 'Write a byte value to EEPROM at the specified address (0-511). Call EEPROM.commit() after writing.');
  }
};

generator.forBlock['eeprom_write'] = function(block: Blockly.Block) {
  const address = javascriptGenerator.valueToCode(block, 'ADDRESS', 0) || '0';
  const value = javascriptGenerator.valueToCode(block, 'VALUE', 0) || '0';
  generator.definitions_['include_eeprom'] =
    '#include <EEPROM.h>\n#if defined(ESP32)\n// ESP32: EEPROM.begin() required\n#endif';
  generator.definitions_['eeprom_begin'] = 'EEPROM.begin(512);';
  return `  EEPROM.write(${address}, ${value});\n  EEPROM.commit();\n`;
};

/**
 * eeprom_read - アドレス指定読み取り
 */
Blockly.Blocks['eeprom_read'] = {
  init: function() {
    this.appendValueInput('ADDRESS')
        .setCheck('Number')
        .appendField('💿 ' + (Blockly.Msg.BLOCKS_EEPROM_READ || 'EEPROM Read'))
        .appendField(Blockly.Msg.BLOCKS_EEPROM_ADDRESS || 'address');
    this.setOutput(true, 'Number');
    this.setColour(EEPROM_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_EEPROM_READTOOLTIP || 'Read a byte value from EEPROM at the specified address (0-511).');
  }
};

generator.forBlock['eeprom_read'] = function(block: Blockly.Block) {
  const address = javascriptGenerator.valueToCode(block, 'ADDRESS', 0) || '0';
  generator.definitions_['include_eeprom'] =
    '#include <EEPROM.h>\n#if defined(ESP32)\n// ESP32: EEPROM.begin() required\n#endif';
  generator.definitions_['eeprom_begin'] = 'EEPROM.begin(512);';
  return [`EEPROM.read(${address})`, 0];
};

console.log('Storage NVS/EEPROM blocks loaded');
