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

// =============================================================================
// 52.md commit #8 (2026-05-04 第80回): INA219 + ACS712 拡充 (Phase D)
// =============================================================================

const INA219_INCLUDE = `
#include <INA219.h>
INA219 ina219Sensor(0x40);
bool _ina219Inited = false;`;

Blockly.Blocks['ina219_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_INA219_INIT || 'INA219 を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_INA219_ADDR || 'I2C アドレス')
        .appendField(new Blockly.FieldNumber(0x40, 0x40, 0x4F, 1), 'ADDR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_INA219_INIT_TOOLTIP || 'INA219 高精度電流/電圧/電力センサを初期化します (I2C)。デフォルトアドレス 0x40。robtillaart/INA219 lib 使用。');
  }
};

generator.forBlock['ina219_init'] = function(block: Blockly.Block) {
  const addr = block.getFieldValue('ADDR');
  generator.definitions_['include_ina219'] = INA219_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  generator.setups_['ina219_init'] = `Wire.begin();
  ina219Sensor = INA219((uint8_t)${addr});
  if (ina219Sensor.begin()) {
    ina219Sensor.setMaxCurrentShunt(2.0f, 0.1f);  // 2A range, 0.1Ω shunt (default)
    _ina219Inited = true;
  }`;
  return '';
};

Blockly.Blocks['ina219_read_voltage'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_INA219_READ_VOLTAGE || 'INA219 電圧 (V)'));
    this.setOutput(true, 'Number');
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_INA219_READ_VOLTAGE_TOOLTIP || 'INA219 のバス電圧を V 単位で返します。事前に ina219_init が必要。');
  }
};

generator.forBlock['ina219_read_voltage'] = function() {
  generator.definitions_['include_ina219'] = INA219_INCLUDE;
  return ['ina219Sensor.getBusVoltage()', Order.FUNCTION_CALL];
};

Blockly.Blocks['ina219_read_current'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_INA219_READ_CURRENT || 'INA219 電流 (mA)'));
    this.setOutput(true, 'Number');
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_INA219_READ_CURRENT_TOOLTIP || 'INA219 の電流を mA 単位で返します。事前に ina219_init が必要。');
  }
};

generator.forBlock['ina219_read_current'] = function() {
  generator.definitions_['include_ina219'] = INA219_INCLUDE;
  return ['ina219Sensor.getCurrent_mA()', Order.FUNCTION_CALL];
};

Blockly.Blocks['ina219_read_power'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_INA219_READ_POWER || 'INA219 電力 (mW)'));
    this.setOutput(true, 'Number');
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_INA219_READ_POWER_TOOLTIP || 'INA219 の電力を mW 単位で返します。事前に ina219_init が必要。');
  }
};

generator.forBlock['ina219_read_power'] = function() {
  generator.definitions_['include_ina219'] = INA219_INCLUDE;
  return ['ina219Sensor.getPower_mW()', Order.FUNCTION_CALL];
};

const ACS712_INCLUDE = `
#include <ACS712.h>
ACS712* acs712Sensor = nullptr;`;

Blockly.Blocks['acs712_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_ACS712_INIT || 'ACS712 を初期化'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACS712_PIN || 'ピン')
        .appendField(new Blockly.FieldNumber(34, 0, 39, 1), 'PIN');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_ACS712_MODEL || 'モデル')
        .appendField(new Blockly.FieldDropdown([
          ['5A (185 mV/A)', '185'],
          ['20A (100 mV/A)', '100'],
          ['30A (66 mV/A)', '66'],
        ]), 'MODEL');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACS712_INIT_TOOLTIP || 'ACS712 ホール電流センサを初期化します。モデル 5A/20A/30A 対応 (mV/A 感度値で識別)。robtillaart/ACS712 lib 使用、RMS 計算内蔵。');
  }
};

generator.forBlock['acs712_init'] = function(block: Blockly.Block) {
  const pin = block.getFieldValue('PIN');
  const model = block.getFieldValue('MODEL');
  generator.definitions_['include_acs712'] = ACS712_INCLUDE;
  if (!generator.setups_) generator.setups_ = {};
  // ESP32 ADC: 12-bit (4096 counts)、3.3V Vcc 想定。ACS712 自体は 5V センサだが
  // level shifter or voltage divider 経由 ESP32 ADC に接続する前提。
  generator.setups_['acs712_init'] = `if (!acs712Sensor) acs712Sensor = new ACS712(${pin}, 3.3f, 4095, ${model});
  acs712Sensor->autoMidPoint(50);  // 50 サンプルで自動ゼロ点 (無負荷状態で実行推奨)`;
  return '';
};

Blockly.Blocks['acs712_read_current'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('⚡ ' + (Blockly.Msg.BLOCKS_ACS712_READ_CURRENT || 'ACS712 電流 (A)'));
    this.setOutput(true, 'Number');
    this.setColour(CURRENT_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_ACS712_READ_CURRENT_TOOLTIP || 'ACS712 の電流を A 単位で返します (mA → A 変換、DC 計測)。事前に acs712_init が必要。');
  }
};

generator.forBlock['acs712_read_current'] = function() {
  generator.definitions_['include_acs712'] = ACS712_INCLUDE;
  // mA_DC() returns mA (signed)、A 単位で返す
  return ['(acs712Sensor ? acs712Sensor->mA_DC() / 1000.0f : 0.0f)', Order.MULTIPLICATION];
};

console.log('Sensor current (AC clamp + INA219 + ACS712) blocks loaded');
