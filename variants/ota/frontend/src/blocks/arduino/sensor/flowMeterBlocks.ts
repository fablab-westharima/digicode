/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * 流量計 (YF-S201) ブロック (52.md 低推奨採用、第80回 commit #18 / 2026-05-04)
 *
 * 2 ブロック構成 (FA 配管流量管理、Fab Academy 流体プロジェクト):
 *   - flow_meter_init      (PIN、interrupt 登録 + pulse counter init)
 *   - flow_meter_get_rate  (Number、L/min)
 *
 * 内部 lib: なし (interrupt + pulse counting、既存 attach_interrupt と同 infrastructure)
 * boardRequires: null (GPIO interrupt 全 board 対応)
 *
 * YF-S201 datasheet: F (Hz) = 7.5 * Q (L/min) → Q = F / 7.5
 * 1 秒間の pulse 数を計測 → 流量換算。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const FLOW_METER_COLOR = '#0288D1';

const FLOW_METER_HELPER = `
volatile uint32_t _flowMeterPulseCount = 0;
int _flowMeterPin = -1;
unsigned long _flowMeterLastSample = 0;
float _flowMeterLastRate = 0.0f;

void IRAM_ATTR _flowMeterIsr() {
  _flowMeterPulseCount++;
}

void flowMeterInit(int pin) {
  _flowMeterPin = pin;
  pinMode(pin, INPUT_PULLUP);
  _flowMeterPulseCount = 0;
  _flowMeterLastSample = millis();
  attachInterrupt(digitalPinToInterrupt(pin), _flowMeterIsr, RISING);
}

float flowMeterGetRate() {
  unsigned long now = millis();
  unsigned long elapsed = now - _flowMeterLastSample;
  if (elapsed >= 1000) {
    // pulses/sec = pulse_count * 1000 / elapsed_ms
    // L/min = pulses_per_sec / 7.5 (YF-S201 datasheet)
    float pulsesPerSec = (float)_flowMeterPulseCount * 1000.0f / (float)elapsed;
    _flowMeterLastRate = pulsesPerSec / 7.5f;
    _flowMeterPulseCount = 0;
    _flowMeterLastSample = now;
  }
  return _flowMeterLastRate;
}`;

Blockly.Blocks['flow_meter_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💧 ' + (Blockly.Msg.BLOCKS_FLOW_METER_INIT || '流量計 (YF-S201) を初期化'))
        .appendField(Blockly.Msg.BLOCKS_FLOW_METER_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(2, 0, 39, 1), 'PIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(FLOW_METER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_FLOW_METER_INIT_TOOLTIP || 'YF-S201 流量計を初期化します。割り込みピンに接続 (RISING edge)、内部 INPUT_PULLUP、F=7.5*Q 換算 (datasheet)。');
  }
};

generator.forBlock['flow_meter_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  generator.definitions_['flow_meter_helper'] = FLOW_METER_HELPER;
  return `flowMeterInit(${pin});\n`;
};

Blockly.Blocks['flow_meter_get_rate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('💧 ' + (Blockly.Msg.BLOCKS_FLOW_METER_GET_RATE || '流量 (L/分)'));
    this.setOutput(true, 'Number');
    this.setColour(FLOW_METER_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_FLOW_METER_GET_RATE_TOOLTIP || '流量計の流量を L/min で返します (1秒間隔で更新、その間は前回値)。事前に flow_meter_init が必要。');
  }
};

generator.forBlock['flow_meter_get_rate'] = function() {
  generator.definitions_['flow_meter_helper'] = FLOW_METER_HELPER;
  return ['flowMeterGetRate()', Order.FUNCTION_CALL];
};

console.log('Flow meter blocks loaded');
