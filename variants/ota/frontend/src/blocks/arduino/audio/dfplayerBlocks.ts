/**
 * DFPlayer Mini MP3 再生ブロック (BP6-6, 2026-04-20)
 *
 * DFRobotDFPlayerMini + EspSoftwareSerial ライブラリ使用
 * SoftwareSerial を使用することで Serial2 との競合を避ける
 * ハードウェア UART は Serial（デバッグ）と Serial2（ユーザー用）に温存
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const DFP_COLOR = '#FF5722';

const DFP_INCLUDE = `
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>
SoftwareSerial dfSerial(-1, -1);
DFRobotDFPlayerMini dfPlayer;`;

/**
 * dfplayer_init - DFPlayer 初期化（SoftwareSerial ピン指定）
 */
Blockly.Blocks['dfplayer_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_DFP_INIT || 'DFPlayer Init'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_DFP_RX || 'RX pin')
        .appendField(new Blockly.FieldNumber(14, 0, 39), 'RX')
        .appendField(Blockly.Msg.BLOCKS_DFP_TX || 'TX pin')
        .appendField(new Blockly.FieldNumber(12, 0, 39), 'TX');
    this.setOutput(true, 'Boolean');
    this.setColour(DFP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DFP_INITTOOLTIP || 'Initialize DFPlayer Mini via SoftwareSerial. Returns true if found. Connect DFPlayer TX to ESP32 RX pin, and DFPlayer RX (via 1kΩ resistor) to ESP32 TX pin.');
  }
};

generator.forBlock['dfplayer_init'] = function(block: Blockly.Block) {
  const rx = block.getFieldValue('RX');
  const tx = block.getFieldValue('TX');
  generator.definitions_['include_dfplayer'] = DFP_INCLUDE;
  generator.definitions_['dfplayer_init_replace'] = `
// DFPlayer 初期化: dfSerial は setup() 内で再初期化される`;
  return [`([&](){ dfSerial.begin(9600, SWSERIAL_8N1, ${rx}, ${tx}); delay(1000); return dfPlayer.begin(dfSerial); })()`, 0];
};

/**
 * dfplayer_play - 指定トラック番号を再生
 *
 * TRACK is a value input (default shadow math_number 1) so users can drive
 * track numbers from variables, sensor values, BLE, etc. Legacy XML field-style
 * loads with empty input; generator falls back to '1' (sunset: 2027-05-03).
 */
Blockly.Blocks['dfplayer_play'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_DFP_PLAY || 'DFPlayer Play'));
    this.appendValueInput('TRACK')
        .appendField(Blockly.Msg.BLOCKS_DFP_TRACK || 'track');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DFP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DFP_PLAYTOOLTIP || 'Play the specified track number (1-999) from the SD card.');
  }
};

generator.forBlock['dfplayer_play'] = function(block: Blockly.Block) {
  const track = generator.valueToCode(block, 'TRACK', generator.ORDER_ATOMIC) || '1';
  generator.definitions_['include_dfplayer'] = DFP_INCLUDE;
  // String(${track}).toInt() wrap: see servo_write generator note.
  return `  dfPlayer.play(String(${track}).toInt());\n`;
};

/**
 * dfplayer_pause - 一時停止
 */
Blockly.Blocks['dfplayer_pause'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_DFP_PAUSE || 'DFPlayer Pause'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DFP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DFP_PAUSETOOLTIP || 'Pause the current playback.');
  }
};

generator.forBlock['dfplayer_pause'] = function() {
  generator.definitions_['include_dfplayer'] = DFP_INCLUDE;
  return '  dfPlayer.pause();\n';
};

/**
 * dfplayer_resume - 再開
 */
Blockly.Blocks['dfplayer_resume'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_DFP_RESUME || 'DFPlayer Resume'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DFP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DFP_RESUMETOOLTIP || 'Resume paused playback.');
  }
};

generator.forBlock['dfplayer_resume'] = function() {
  generator.definitions_['include_dfplayer'] = DFP_INCLUDE;
  return '  dfPlayer.start();\n';
};

/**
 * dfplayer_stop - 停止
 */
Blockly.Blocks['dfplayer_stop'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_DFP_STOP || 'DFPlayer Stop'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DFP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DFP_STOPTOOLTIP || 'Stop playback.');
  }
};

generator.forBlock['dfplayer_stop'] = function() {
  generator.definitions_['include_dfplayer'] = DFP_INCLUDE;
  return '  dfPlayer.stop();\n';
};

/**
 * dfplayer_volume - 音量設定（0-30）
 *
 * VOL is a value input (default shadow math_number 15). Legacy XML field-style
 * loads with empty input; generator falls back to '15' (sunset: 2027-05-03).
 */
Blockly.Blocks['dfplayer_volume'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🔊 ' + (Blockly.Msg.BLOCKS_DFP_VOLUME || 'DFPlayer Volume'));
    this.appendValueInput('VOL');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(DFP_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_DFP_VOLUMETOOLTIP || 'Set the volume (0-30). 0 = silent, 30 = maximum.');
  }
};

generator.forBlock['dfplayer_volume'] = function(block: Blockly.Block) {
  const vol = generator.valueToCode(block, 'VOL', generator.ORDER_ATOMIC) || '15';
  generator.definitions_['include_dfplayer'] = DFP_INCLUDE;
  // String(${vol}).toInt() wrap: see servo_write generator note.
  return `  dfPlayer.volume(String(${vol}).toInt());\n`;
};

console.log('DFPlayer blocks loaded');
