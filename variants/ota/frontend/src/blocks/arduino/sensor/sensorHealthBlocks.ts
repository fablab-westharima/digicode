/*
 * DigiCode - Block-based ESP32 Programming Tool
 * Copyright (C) 2024-2026 DigiCo LLC
 *
 * Licensed under the GNU Affero General Public License version 3 or later.
 * See LICENSE file in the repository root for full terms.
 */

/**
 * MAX30102 (心拍/SpO2) ブロック (52.md 低推奨採用、第80回 commit #20 / 2026-05-04)
 *
 * 3 ブロック構成 (ヘルスケア教材、代替手段なし):
 *   - max30102_init             (I2C、デフォルト設定)
 *   - max30102_read_heart_rate  (Number、BPM、checkForBeat 平均)
 *   - max30102_read_spo2        (Number、% SpO2、簡易 ratio 算出)
 *
 * 内部 lib: `sparkfun/SparkFun MAX3010x Pulse and Proximity Sensor Library@^1.1.2` (commit #2 で追加済)
 * boardRequires: null (I2C 全 board 対応)
 *
 * ⚠️ 教育用途、医療精度ではない。リアルタイム値はばらつき大、複数サンプル平均推奨。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const HEALTH_COLOR = '#D32F2F';

const MAX30102_INCLUDE = `
#include <Wire.h>
#include <MAX30105.h>
#include "heartRate.h"
MAX30105 maxParticleSensor;
// heart rate 算出用 ring buffer (4 サンプル平均)
static const int _MAX30102_RATE_SIZE = 4;
static uint8_t _maxRates[_MAX30102_RATE_SIZE] = {0};
static uint8_t _maxRateSpot = 0;
static long _maxLastBeat = 0;
static float _maxBeatsPerMinute = 0;`;

Blockly.Blocks['max30102_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('❤️ ' + (Blockly.Msg.BLOCKS_MAX30102_INIT || 'MAX30102 (心拍/SpO2) を初期化'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(HEALTH_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX30102_INIT_TOOLTIP || 'MAX30102 心拍/SpO2 センサを初期化します (I2C 0x57)。⚠️ 教育用途、医療精度ではない。指を軽く触れて使用。');
  }
};

generator.forBlock['max30102_init'] = function() {
  generator.definitions_['include_max30102'] = MAX30102_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['max30102_init'] = `Wire.begin();
  if (maxParticleSensor.begin(Wire, I2C_SPEED_FAST)) {
    maxParticleSensor.setup();  // default: 0x1F brightness, 4 samples avg, mode 0x03 (Red+IR)
    maxParticleSensor.setPulseAmplitudeRed(0x0A);
    maxParticleSensor.setPulseAmplitudeIR(0x0A);
  }`;
  return '';
};

Blockly.Blocks['max30102_read_heart_rate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('❤️ ' + (Blockly.Msg.BLOCKS_MAX30102_HEART_RATE || 'MAX30102 心拍数 (BPM)'));
    this.setOutput(true, 'Number');
    this.setColour(HEALTH_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX30102_HEART_RATE_TOOLTIP || 'MAX30102 から心拍数 (BPM) を返します (4 拍平均)。⚠️ 安定値取得には 5-10 秒必要、医療精度ではない。');
  }
};

generator.forBlock['max30102_read_heart_rate'] = function() {
  generator.definitions_['include_max30102'] = generator.definitions_['include_max30102'] || MAX30102_INCLUDE;
  generator.definitions_['max30102_hr_helper'] = `
float _max30102ReadHeartRate() {
  long irValue = maxParticleSensor.getIR();
  if (checkForBeat(irValue)) {
    long delta = millis() - _maxLastBeat;
    _maxLastBeat = millis();
    float bpm = 60.0f / (delta / 1000.0f);
    if (bpm < 255.0f && bpm > 20.0f) {
      _maxRates[_maxRateSpot++] = (uint8_t)bpm;
      _maxRateSpot %= _MAX30102_RATE_SIZE;
      // rolling average
      uint16_t sum = 0;
      for (int i = 0; i < _MAX30102_RATE_SIZE; i++) sum += _maxRates[i];
      _maxBeatsPerMinute = (float)sum / (float)_MAX30102_RATE_SIZE;
    }
  }
  return _maxBeatsPerMinute;
}`;
  return ['_max30102ReadHeartRate()', Order.FUNCTION_CALL];
};

Blockly.Blocks['max30102_read_spo2'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('❤️ ' + (Blockly.Msg.BLOCKS_MAX30102_SPO2 || 'MAX30102 SpO2 (%)'));
    this.setOutput(true, 'Number');
    this.setColour(HEALTH_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MAX30102_SPO2_TOOLTIP || 'MAX30102 から SpO2 (%) を簡易算出します (Red/IR ratio ベース)。⚠️ 教育用途、医療精度ではない、安定値取得には 10 秒以上必要。');
  }
};

generator.forBlock['max30102_read_spo2'] = function() {
  generator.definitions_['include_max30102'] = generator.definitions_['include_max30102'] || MAX30102_INCLUDE;
  generator.definitions_['max30102_spo2_helper'] = `
float _max30102ReadSpO2() {
  long red = maxParticleSensor.getRed();
  long ir = maxParticleSensor.getIR();
  if (red < 50000 || ir < 50000) return 0.0f;  // 指を載せていない判定
  // 簡易 ratio (R/IR)、~ 110 - 25 * R で SpO2 推定 (Maxim app note 簡略版)
  float ratio = (float)red / (float)ir;
  float spo2 = 110.0f - 25.0f * ratio;
  if (spo2 < 70.0f) spo2 = 70.0f;
  if (spo2 > 100.0f) spo2 = 100.0f;
  return spo2;
}`;
  return ['_max30102ReadSpO2()', Order.FUNCTION_CALL];
};

console.log('MAX30102 health sensor blocks loaded');
