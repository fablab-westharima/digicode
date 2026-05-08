/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * APDS9960 (ジェスチャー/色/近接) ブロック (52.md 低推奨採用、第80回 commit #19 / 2026-05-04)
 *
 * 3 ブロック構成 (Fab Academy HCI 系プロジェクト、代替手段なし):
 *   - apds9960_init             (I2C、proximity + gesture enable)
 *   - apds9960_read_gesture     (String、"UP"/"DOWN"/"LEFT"/"RIGHT"/"NONE")
 *   - apds9960_read_proximity   (Number、0-255)
 *
 * 内部 lib: `adafruit/Adafruit APDS9960 Library@^1.3.1` (commit #2 で追加済、業界標準 BSD)
 * boardRequires: null (I2C 全 board 対応)
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const APDS9960_COLOR = '#7B1FA2';

const APDS9960_INCLUDE = `
#include <Adafruit_APDS9960.h>
Adafruit_APDS9960 apds9960Sensor;`;

Blockly.Blocks['apds9960_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('✋ ' + (Blockly.Msg.BLOCKS_APDS9960_INIT || 'APDS9960 (ジェスチャー) を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(APDS9960_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_APDS9960_INIT_TOOLTIP || 'APDS9960 (ジェスチャー/色/近接) を初期化します (I2C 0x39)。proximity + gesture を enable。');
  }
};

generator.forBlock['apds9960_init'] = function() {
  generator.definitions_['include_apds9960'] = APDS9960_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['apds9960_init'] = `if (apds9960Sensor.begin()) {
    apds9960Sensor.enableProximity(true);
    apds9960Sensor.enableGesture(true);
  }`;
  return '';
};

Blockly.Blocks['apds9960_read_gesture'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('✋ ' + (Blockly.Msg.BLOCKS_APDS9960_READ_GESTURE || 'APDS9960 ジェスチャー'));
    this.setOutput(true, 'String');
    this.setColour(APDS9960_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_APDS9960_READ_GESTURE_TOOLTIP || 'APDS9960 のジェスチャーを返します ("UP"/"DOWN"/"LEFT"/"RIGHT"/"NONE")。検知なしは "NONE"。');
  }
};

generator.forBlock['apds9960_read_gesture'] = function() {
  generator.definitions_['include_apds9960'] = generator.definitions_['include_apds9960'] || APDS9960_INCLUDE;
  // helper を定義に注入
  generator.definitions_['apds9960_gesture_helper'] = `
String _apds9960GestureToString(uint8_t g) {
  switch (g) {
    case APDS9960_UP: return "UP";
    case APDS9960_DOWN: return "DOWN";
    case APDS9960_LEFT: return "LEFT";
    case APDS9960_RIGHT: return "RIGHT";
    default: return "NONE";
  }
}`;
  return ['_apds9960GestureToString(apds9960Sensor.readGesture())', Order.FUNCTION_CALL];
};

Blockly.Blocks['apds9960_read_proximity'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('✋ ' + (Blockly.Msg.BLOCKS_APDS9960_READ_PROXIMITY || 'APDS9960 近接'));
    this.setOutput(true, 'Number');
    this.setColour(APDS9960_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_APDS9960_READ_PROXIMITY_TOOLTIP || 'APDS9960 の近接値 (0-255、近いほど大きい) を返します。');
  }
};

generator.forBlock['apds9960_read_proximity'] = function() {
  generator.definitions_['include_apds9960'] = generator.definitions_['include_apds9960'] || APDS9960_INCLUDE;
  return ['(int)apds9960Sensor.readProximity()', Order.FUNCTION_CALL];
};

console.log('APDS9960 blocks loaded');
