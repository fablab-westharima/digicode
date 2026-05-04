/**
 * GPS (NEO-6M / 8M) ブロック (52.md 強推奨、第80回 commit #12 / 2026-05-04)
 *
 * 5 ブロック構成 (Fab Academy Final Project 屋外 + Factory IoT 位置追跡):
 *   - gps_init                 (RX/TX/BAUD、HardwareSerial2 使用)
 *   - gps_get_lat              (Number、緯度)
 *   - gps_get_lng              (Number、経度)
 *   - gps_get_altitude         (Number、高度 m)
 *   - gps_get_satellites_count (Number、捕捉衛星数)
 *
 * 内部 lib: `mikalhart/TinyGPSPlus@^1.1.0` (commit #2 で追加済、NMEA 業界標準 parser)
 * boardRequires: null (UART 全 board 対応)
 *
 * loopPre_ で continuous bytes feed (gps.encode() を毎 tick 呼ぶ)。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const GPS_COLOR = '#3F51B5';

const GPS_INCLUDE = `
#include <TinyGPSPlus.h>
TinyGPSPlus gpsParser;
HardwareSerial gpsSerial(2);`;

Blockly.Blocks['gps_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_GPS_INIT || 'GPS (NEO-6M/8M) を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_GPS_RX || 'RX')
        .appendField(new Blockly.FieldNumber(16, 0, 39, 1), 'RX');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_GPS_TX || 'TX')
        .appendField(new Blockly.FieldNumber(17, 0, 39, 1), 'TX');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_GPS_BAUD || 'ボーレート')
        .appendField(new Blockly.FieldNumber(9600, 4800, 115200, 1), 'BAUD');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(GPS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_GPS_INIT_TOOLTIP || 'GPS NEO-6M/8M モジュールを初期化します。HardwareSerial2 経由 UART (default 9600 baud)。loopPre_ で continuous NMEA parse。屋外 cold start で衛星捕捉まで 30 秒〜数分必要。');
  }
};

generator.forBlock['gps_init'] = function(block: Blockly.Block) {
  const rx = block.getFieldValue('RX');
  const tx = block.getFieldValue('TX');
  const baud = block.getFieldValue('BAUD');
  generator.definitions_['include_gps'] = GPS_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['gps_init'] = `gpsSerial.begin(${baud}, SERIAL_8N1, ${rx}, ${tx});`;
  if (!generator.loopPre_) generator.loopPre_ = {};
  generator.loopPre_['gps_feed'] = `
  while (gpsSerial.available() > 0) {
    gpsParser.encode(gpsSerial.read());
  }`;
  return '';
};

Blockly.Blocks['gps_get_lat'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_GPS_GET_LAT || 'GPS 緯度'));
    this.setOutput(true, 'Number');
    this.setColour(GPS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_GPS_GET_LAT_TOOLTIP || 'GPS の緯度 (degrees、北緯+/南緯-) を返します。location.isValid() チェック内蔵、未測位時 0.0。');
  }
};

generator.forBlock['gps_get_lat'] = function() {
  generator.definitions_['include_gps'] = generator.definitions_['include_gps'] || GPS_INCLUDE;
  return ['(gpsParser.location.isValid() ? gpsParser.location.lat() : 0.0)', Order.CONDITIONAL];
};

Blockly.Blocks['gps_get_lng'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_GPS_GET_LNG || 'GPS 経度'));
    this.setOutput(true, 'Number');
    this.setColour(GPS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_GPS_GET_LNG_TOOLTIP || 'GPS の経度 (degrees、東経+/西経-) を返します。未測位時 0.0。');
  }
};

generator.forBlock['gps_get_lng'] = function() {
  generator.definitions_['include_gps'] = generator.definitions_['include_gps'] || GPS_INCLUDE;
  return ['(gpsParser.location.isValid() ? gpsParser.location.lng() : 0.0)', Order.CONDITIONAL];
};

Blockly.Blocks['gps_get_altitude'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_GPS_GET_ALTITUDE || 'GPS 高度 (m)'));
    this.setOutput(true, 'Number');
    this.setColour(GPS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_GPS_GET_ALTITUDE_TOOLTIP || 'GPS の高度 (海抜 m) を返します。未測位時 0.0。');
  }
};

generator.forBlock['gps_get_altitude'] = function() {
  generator.definitions_['include_gps'] = generator.definitions_['include_gps'] || GPS_INCLUDE;
  return ['(gpsParser.altitude.isValid() ? gpsParser.altitude.meters() : 0.0)', Order.CONDITIONAL];
};

Blockly.Blocks['gps_get_satellites_count'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🛰️ ' + (Blockly.Msg.BLOCKS_GPS_GET_SATELLITES || 'GPS 衛星数'));
    this.setOutput(true, 'Number');
    this.setColour(GPS_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_GPS_GET_SATELLITES_TOOLTIP || 'GPS の捕捉衛星数を返します。3 以上で 2D 測位可、4 以上で 3D 測位可。');
  }
};

generator.forBlock['gps_get_satellites_count'] = function() {
  generator.definitions_['include_gps'] = generator.definitions_['include_gps'] || GPS_INCLUDE;
  return ['(int)(gpsParser.satellites.isValid() ? gpsParser.satellites.value() : 0)', Order.FUNCTION_CALL];
};

console.log('GPS NEO-6M/8M blocks loaded');
