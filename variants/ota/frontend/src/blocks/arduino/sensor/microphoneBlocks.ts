/**
 * I2S MEMS microphone ブロック (52.md 低推奨採用、第80回 commit #17 / 2026-05-04)
 *
 * 3 ブロック構成 (FA 機械音検知、振動分析、Industrial 騒音管理、Fab Academy 音響):
 *   - microphone_i2s_init       (BCLK/LRCK/DIN、INMP441 等 24-bit MEMS)
 *   - microphone_read_amplitude (Number、RMS 振幅)
 *   - microphone_read_db        (Number、相対 dB SPL)
 *
 * 内部 lib: なし (ESP32 Arduino core `driver/i2s.h` ESP-IDF I2S API、legacy compat)
 * boardRequires: ESP32 系のみ (`category != 'rp2040'`、D-7 案 A 採用)
 *                ⚠️ RP2040 系は I2S API 異、本ブロック不対応
 *
 * INMP441 は 24-bit data on 32-bit I2S frame、左 channel only (MSB)。
 * RMS → dB SPL 変換は相対値 (基準 0 dB SPL = 20μPa は外部校正必要)。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const MICROPHONE_COLOR = '#5D4037';

const MICROPHONE_INCLUDE = `
#include <driver/i2s.h>
#include <math.h>
#define _MIC_I2S_NUM I2S_NUM_0
#define _MIC_SAMPLE_RATE 16000
#define _MIC_BUF_LEN 512
static int32_t _micBuffer[_MIC_BUF_LEN];
static bool _micInited = false;

static void microphoneI2sInit(int bclk, int lrck, int din) {
  i2s_config_t cfg = {};
  cfg.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX);
  cfg.sample_rate = _MIC_SAMPLE_RATE;
  cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_32BIT;
  cfg.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
  cfg.communication_format = (i2s_comm_format_t)(I2S_COMM_FORMAT_STAND_I2S);
  cfg.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
  cfg.dma_buf_count = 4;
  cfg.dma_buf_len = 256;
  cfg.use_apll = false;
  i2s_pin_config_t pins = {};
  pins.bck_io_num = bclk;
  pins.ws_io_num = lrck;
  pins.data_out_num = I2S_PIN_NO_CHANGE;
  pins.data_in_num = din;
  if (i2s_driver_install(_MIC_I2S_NUM, &cfg, 0, NULL) == ESP_OK) {
    i2s_set_pin(_MIC_I2S_NUM, &pins);
    _micInited = true;
  }
}

static double microphoneReadAmplitude() {
  if (!_micInited) return 0.0;
  size_t bytesRead = 0;
  i2s_read(_MIC_I2S_NUM, _micBuffer, sizeof(_micBuffer), &bytesRead, portMAX_DELAY);
  int samples = (int)(bytesRead / 4);
  if (samples == 0) return 0.0;
  double sumSq = 0;
  for (int i = 0; i < samples; i++) {
    // INMP441: 24-bit 左詰め int32_t、>> 14 で正規化 (sign-extend)
    int32_t s = _micBuffer[i] >> 14;
    sumSq += (double)s * (double)s;
  }
  return sqrt(sumSq / (double)samples);
}

static double microphoneReadDb() {
  double rms = microphoneReadAmplitude();
  if (rms <= 0.0) return 0.0;
  // 相対 dB (基準 1.0 = 0 dB)。0 dB SPL 校正は外部基準音源との比較必要。
  return 20.0 * log10(rms);
}`;

Blockly.Blocks['microphone_i2s_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎤 ' + (Blockly.Msg.BLOCKS_MIC_I2S_INIT || 'I2S microphone を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MIC_BCLK || 'BCLK')
        .appendField(new Blockly.FieldNumber(14, 0, 39, 1), 'BCLK');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MIC_LRCK || 'LRCK (WS)')
        .appendField(new Blockly.FieldNumber(15, 0, 39, 1), 'LRCK');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MIC_DIN || 'DIN (DOUT)')
        .appendField(new Blockly.FieldNumber(32, 0, 39, 1), 'DIN');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MICROPHONE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MIC_I2S_INIT_TOOLTIP || 'I2S MEMS microphone (INMP441 等) を初期化します。BCLK / LRCK (WS) / DIN (DOUT) ピン指定。16 kHz / 24-bit / 左 channel only。⚠️ ESP32 系のみ動作 (RP2040 不対応)。');
  }
};

generator.forBlock['microphone_i2s_init'] = function(block: Blockly.Block) {
  const bclk = block.getFieldValue('BCLK');
  const lrck = block.getFieldValue('LRCK');
  const din = block.getFieldValue('DIN');
  generator.definitions_['include_microphone'] = MICROPHONE_INCLUDE;
  return `microphoneI2sInit(${bclk}, ${lrck}, ${din});\n`;
};

Blockly.Blocks['microphone_read_amplitude'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎤 ' + (Blockly.Msg.BLOCKS_MIC_READ_AMPLITUDE || 'I2S microphone 振幅 (RMS)'));
    this.setOutput(true, 'Number');
    this.setColour(MICROPHONE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MIC_READ_AMPLITUDE_TOOLTIP || 'I2S microphone から 512 サンプル取得 → RMS 振幅を返します (24-bit 正規化値)。');
  }
};

generator.forBlock['microphone_read_amplitude'] = function() {
  generator.definitions_['include_microphone'] = generator.definitions_['include_microphone'] || MICROPHONE_INCLUDE;
  return ['microphoneReadAmplitude()', Order.FUNCTION_CALL];
};

Blockly.Blocks['microphone_read_db'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎤 ' + (Blockly.Msg.BLOCKS_MIC_READ_DB || 'I2S microphone 音圧 (相対 dB)'));
    this.setOutput(true, 'Number');
    this.setColour(MICROPHONE_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MIC_READ_DB_TOOLTIP || 'I2S microphone の相対 dB を返します (20*log10(RMS))。⚠️ dB SPL (絶対) 取得には外部基準音源との校正必要。');
  }
};

generator.forBlock['microphone_read_db'] = function() {
  generator.definitions_['include_microphone'] = generator.definitions_['include_microphone'] || MICROPHONE_INCLUDE;
  return ['microphoneReadDb()', Order.FUNCTION_CALL];
};

console.log('I2S microphone blocks loaded');
