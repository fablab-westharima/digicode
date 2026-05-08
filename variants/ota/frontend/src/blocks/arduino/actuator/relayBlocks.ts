/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * Relay (リレー) ブロック (52.md 強推奨、第80回 commit #13 / 2026-05-04)
 *
 * 4 ブロック構成 (Factory IoT 制御の核、digital_write 明示化):
 *   - relay_init    (PIN/ACTIVE、HIGH or LOW で OFF 状態を設定)
 *   - relay_on      (PIN、active 極性で ON)
 *   - relay_off     (PIN、active と逆極性で OFF)
 *   - relay_toggle  (PIN、状態を反転)
 *
 * 内部 lib: なし (digital_write ラッパー、helper で active 極性を pin 別追跡)
 * boardRequires: null (GPIO 全 board 対応)
 *
 * AI 生成精度向上 + 教育的明示化のため、digital_write ではなく semantic 名で提供。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const RELAY_COLOR = '#FFB300';

const RELAY_HELPER = `
// relay helper: ACTIVE 極性を pin 別に追跡 (HIGH=非反転、LOW=反転)
static uint8_t _relayActiveLevel[40] = {HIGH};

static void relayInit(int pin, int activeLevel) {
  if (pin < 0 || pin >= 40) return;
  _relayActiveLevel[pin] = (uint8_t)activeLevel;
  pinMode(pin, OUTPUT);
  // 初期状態 = OFF (active と逆)
  digitalWrite(pin, activeLevel == HIGH ? LOW : HIGH);
}

static void relayOn(int pin) {
  if (pin < 0 || pin >= 40) return;
  digitalWrite(pin, _relayActiveLevel[pin]);
}

static void relayOff(int pin) {
  if (pin < 0 || pin >= 40) return;
  digitalWrite(pin, _relayActiveLevel[pin] == HIGH ? LOW : HIGH);
}

static void relayToggle(int pin) {
  if (pin < 0 || pin >= 40) return;
  digitalWrite(pin, !digitalRead(pin));
}`;

Blockly.Blocks['relay_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_RELAY_INIT || 'Relay を初期化'))
        .appendField(Blockly.Msg.BLOCKS_RELAY_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39, 1), 'PIN');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_RELAY_ACTIVE || 'アクティブ極性')
        .appendField(new Blockly.FieldDropdown([
          ['HIGH (非反転)', 'HIGH'],
          ['LOW (反転、SSR 等)', 'LOW'],
        ]), 'ACTIVE');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(RELAY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RELAY_INIT_TOOLTIP || 'リレーを初期化します。アクティブ極性 = ON 時の出力レベル (機械式は HIGH、SSR は LOW が一般的)。');
  }
};

generator.forBlock['relay_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const active = block.getFieldValue('ACTIVE');
  generator.definitions_['relay_helper'] = RELAY_HELPER;
  return `relayInit(${pin}, ${active});\n`;
};

Blockly.Blocks['relay_on'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_RELAY_ON || 'Relay ON'))
        .appendField(Blockly.Msg.BLOCKS_RELAY_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39, 1), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(RELAY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RELAY_ON_TOOLTIP || 'リレーを ON にします (active 極性に従う)。事前に relay_init が必要。');
  }
};

generator.forBlock['relay_on'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['relay_helper'] = RELAY_HELPER;
  return `relayOn(${pin});\n`;
};

Blockly.Blocks['relay_off'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_RELAY_OFF || 'Relay OFF'))
        .appendField(Blockly.Msg.BLOCKS_RELAY_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39, 1), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(RELAY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RELAY_OFF_TOOLTIP || 'リレーを OFF にします (active と逆極性)。事前に relay_init が必要。');
  }
};

generator.forBlock['relay_off'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['relay_helper'] = RELAY_HELPER;
  return `relayOff(${pin});\n`;
};

Blockly.Blocks['relay_toggle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_RELAY_TOGGLE || 'Relay 切替'))
        .appendField(Blockly.Msg.BLOCKS_RELAY_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39, 1), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(RELAY_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_RELAY_TOGGLE_TOOLTIP || 'リレーの状態を反転します (digitalRead 値の逆を出力)。');
  }
};

generator.forBlock['relay_toggle'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['relay_helper'] = RELAY_HELPER;
  return `relayToggle(${pin});\n`;
};

console.log('Relay blocks loaded');
