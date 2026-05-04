/**
 * 電流センサーブロック (51.md Phase A+B、第79回 commit #7 / 2026-05-04)
 *
 * 3 ブロック構成 (FS 講座 IoT 電流計の核機能):
 *   - ac_current_clamp_init       (statement、PIN/RATIO/RESISTOR fields)
 *   - ac_current_clamp_read_rms   (Number output、A 単位 RMS、SAMPLES field)
 *   - ac_current_clamp_calibrate  (statement、ゼロ点補正)
 *
 * 内部 lib: なし (analogRead + 自作 RMS 計算のみ、ESP32 Arduino core 組込み)
 * boardRequires: null (ADC 全 board 対応)
 *
 * AC clamp typical setup: SCT-013 / ZMPT101B 互換 → 負荷抵抗で電圧変換 → ADC で sample → RMS 算出。
 * 校正でゼロ点 (オフセット) を測定し、後続 read で減算。
 */
import * as Blockly from 'blockly';
import { javascriptGenerator, Order } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const CURRENT_COLOR = '#FF9800';

const AC_CLAMP_HELPER = `
// 51.md commit #7: AC current clamp helper (analogRead RMS、external lib なし)
static int _acClampPin = 36;
static float _acClampRatio = 2000.0f;     // CT ratio (turns)
static float _acClampResistor = 51.0f;    // burden resistor in ohms
static int _acClampZero = 2048;           // 12-bit ADC midpoint, refined by calibrate()

void acCurrentClampInit(int pin, float ratio, float resistorOhms) {
  _acClampPin = pin;
  _acClampRatio = ratio;
  _acClampResistor = resistorOhms;
  pinMode(pin, INPUT);
}

void acCurrentClampCalibrate() {
  // Sample for ~100ms with no current → average becomes the new zero point.
  long sum = 0;
  const int N = 200;
  for (int i = 0; i < N; i++) { sum += analogRead(_acClampPin); delayMicroseconds(500); }
  _acClampZero = (int)(sum / N);
}

float acCurrentClampReadRMS(int samples) {
  // ADC sampling, RMS over N samples (default ~100 over ~100ms for 50/60Hz coverage)
  if (samples < 4) samples = 4;
  double sumSq = 0.0;
  for (int i = 0; i < samples; i++) {
    int raw = analogRead(_acClampPin);
    double centered = (double)(raw - _acClampZero);
    sumSq += centered * centered;
    delayMicroseconds(500);  // ~2 kHz sampling = 100 samples / 50 ms
  }
  double rmsCount = sqrt(sumSq / (double)samples);
  // ADC count → volts (3.3V / 4096) → primary current via burden resistor + CT ratio
  // Vrms = rmsCount * (3.3 / 4096); Iburden = Vrms / R; Iprimary = Iburden * ratio
  double vrms = rmsCount * (3.3 / 4096.0);
  double iburden = vrms / (double)_acClampResistor;
  double iprimary = iburden * (double)_acClampRatio;
  return (float)iprimary;
}`;

Blockly.Blocks['ac_current_clamp_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_INIT || 'クランプ電流センサ を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(36, 0, 39, 1), 'PIN');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_RATIO || '巻数比')
        .appendField(new Blockly.FieldNumber(2000, 1, 5000, 1), 'RATIO');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_RESISTOR || '負荷抵抗 (Ω)')
        .appendField(new Blockly.FieldNumber(51, 1, 1000, 1), 'RESISTOR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_INIT_TOOLTIP || 'AC クランプ電流センサ (SCT-013 等) を初期化します。ピン (ADC)、巻数比 (Current Transformer ratio)、負荷抵抗 (バーデン抵抗 Ω) を指定。');
  }
};

generator.forBlock['ac_current_clamp_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const ratio = block.getFieldValue('RATIO');
  const resistor = block.getFieldValue('RESISTOR');
  generator.definitions_['ac_clamp_helper'] = AC_CLAMP_HELPER;
  return `acCurrentClampInit(${pin}, ${ratio}, ${resistor});\n`;
};

Blockly.Blocks['ac_current_clamp_read_rms'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_READ_RMS || 'クランプ電流 (A、RMS)'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_SAMPLES || 'サンプル数')
        .appendField(new Blockly.FieldNumber(100, 4, 1000, 1), 'SAMPLES');
    this.setOutput(true, 'Number');
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_READ_RMS_TOOLTIP || 'AC クランプ電流の RMS 値を返します (A 単位)。サンプル数 ~100 で 50/60Hz 1 周期以上カバーします。事前に ac_current_clamp_init が必要です。');
  }
};

generator.forBlock['ac_current_clamp_read_rms'] = function(block: Blockly.Block) {
  const samples = block.getFieldValue('SAMPLES');
  generator.definitions_['ac_clamp_helper'] = AC_CLAMP_HELPER;
  return [`acCurrentClampReadRMS(${samples})`, Order.FUNCTION_CALL];
};

Blockly.Blocks['ac_current_clamp_calibrate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_CALIBRATE || 'クランプ電流センサ ゼロ点補正'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_AC_CURRENT_CLAMP_CALIBRATE_TOOLTIP || 'AC クランプ電流センサのゼロ点を測定 (~100ms)。負荷を切った状態で実行してください。');
  }
};

generator.forBlock['ac_current_clamp_calibrate'] = function() {
  generator.definitions_['ac_clamp_helper'] = AC_CLAMP_HELPER;
  return 'acCurrentClampCalibrate();\n';
};

console.log('Sensor current (AC clamp) blocks loaded');
