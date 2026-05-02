/**
 * 姿勢・慣性センサーブロック (BP5-1, 2026-04-20)
 *
 * MPU6050: Adafruit MPU6050 ライブラリ使用
 * キャリブレーション値は RAM 変数に保存（NVS 連携はユーザーが BP3 ブロックで行う）
 * 姿勢角（pitch/roll）は相補フィルタ（DMP なし）
 *
 * i18n: Blockly.Msg.* パターン（ルール33）
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

if (!generator.definitions_) generator.definitions_ = {};

const MOTION_COLOR = '#FF5722';

const MPU6050_INCLUDE = `
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>`;

const MPU6050_GLOBALS = `
Adafruit_MPU6050 mpu;
float mpu_ax=0, mpu_ay=0, mpu_az=0;
float mpu_gx=0, mpu_gy=0, mpu_gz=0;
float mpu_temp=0;
float mpu_pitch=0, mpu_roll=0;
float mpu_offset_ax=0, mpu_offset_ay=0, mpu_offset_az=0;
float mpu_offset_gx=0, mpu_offset_gy=0, mpu_offset_gz=0;
unsigned long mpu_last_time=0;`;

const MPU6050_UPDATE = `
void mpuUpdate() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  mpu_ax = a.acceleration.x - mpu_offset_ax;
  mpu_ay = a.acceleration.y - mpu_offset_ay;
  mpu_az = a.acceleration.z - mpu_offset_az;
  mpu_gx = g.gyro.x - mpu_offset_gx;
  mpu_gy = g.gyro.y - mpu_offset_gy;
  mpu_gz = g.gyro.z - mpu_offset_gz;
  mpu_temp = temp.temperature;
  unsigned long now = millis();
  float dt = (now - mpu_last_time) / 1000.0;
  if (mpu_last_time > 0 && dt > 0 && dt < 0.5) {
    float accel_pitch = atan2(mpu_ay, sqrt(mpu_ax*mpu_ax + mpu_az*mpu_az)) * 180.0 / PI;
    float accel_roll  = atan2(-mpu_ax, mpu_az) * 180.0 / PI;
    mpu_pitch = 0.98 * (mpu_pitch + mpu_gy * dt * 180.0 / PI) + 0.02 * accel_pitch;
    mpu_roll  = 0.98 * (mpu_roll  + mpu_gx * dt * 180.0 / PI) + 0.02 * accel_roll;
  }
  mpu_last_time = now;
}`;

/**
 * mpu6050_init - MPU6050 初期化
 */
Blockly.Blocks['mpu6050_init'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + (Blockly.Msg.BLOCKS_MPU6050_INIT || 'MPU6050 Init'));
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MPU6050_ACCELRANGE || 'accel range')
        .appendField(new Blockly.FieldDropdown([
          ['±2g', 'MPU6050_RANGE_2_G'],
          ['±4g', 'MPU6050_RANGE_4_G'],
          ['±8g', 'MPU6050_RANGE_8_G'],
          ['±16g', 'MPU6050_RANGE_16_G'],
        ]), 'ACCEL_RANGE');
    this.appendDummyInput()
        .appendField(Blockly.Msg.BLOCKS_MPU6050_GYRORANGE || 'gyro range')
        .appendField(new Blockly.FieldDropdown([
          ['±250°/s', 'MPU6050_RANGE_250_DEG'],
          ['±500°/s', 'MPU6050_RANGE_500_DEG'],
          ['±1000°/s', 'MPU6050_RANGE_1000_DEG'],
          ['±2000°/s', 'MPU6050_RANGE_2000_DEG'],
        ]), 'GYRO_RANGE');
    this.setOutput(true, 'Boolean');
    this.setColour(MOTION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MPU6050_INITTOOLTIP || 'Initialize MPU6050 sensor via I2C. Returns true if found. Requires Adafruit MPU6050 library.');
  }
};

generator.forBlock['mpu6050_init'] = function(block: Blockly.Block) {
  const accelRange = block.getFieldValue('ACCEL_RANGE');
  const gyroRange = block.getFieldValue('GYRO_RANGE');
  generator.definitions_['include_mpu6050'] = MPU6050_INCLUDE;
  generator.definitions_['mpu6050_globals'] = MPU6050_GLOBALS;
  generator.definitions_['mpu6050_update'] = MPU6050_UPDATE;
  return [`([&](){ Wire.begin(); if(!mpu.begin()) return false; mpu.setAccelerometerRange(${accelRange}); mpu.setGyroRange(${gyroRange}); return true; })()`, 0];
};

/**
 * mpu6050_update - センサー値を更新（loop 内で呼ぶ）
 */
Blockly.Blocks['mpu6050_update'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + (Blockly.Msg.BLOCKS_MPU6050_UPDATE || 'MPU6050 Update'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MOTION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MPU6050_UPDATETOOLTIP || 'Read sensor values and update pitch/roll with complementary filter. Call in loop block for smooth angle tracking.');
  }
};

generator.forBlock['mpu6050_update'] = function() {
  generator.definitions_['include_mpu6050'] = MPU6050_INCLUDE;
  generator.definitions_['mpu6050_globals'] = MPU6050_GLOBALS;
  generator.definitions_['mpu6050_update'] = MPU6050_UPDATE;
  return '  mpuUpdate();\n';
};

/**
 * mpu6050_read_accel - 加速度取得（x/y/z）
 */
Blockly.Blocks['mpu6050_read_accel'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + (Blockly.Msg.BLOCKS_MPU6050_ACCEL || 'MPU6050 Accel'))
        .appendField(new Blockly.FieldDropdown([
          ['X', 'mpu_ax'], ['Y', 'mpu_ay'], ['Z', 'mpu_az'],
        ]), 'AXIS');
    this.setOutput(true, 'Number');
    this.setColour(MOTION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MPU6050_ACCELTOOLTIP || 'Get acceleration on the specified axis (m/s²). Call mpu6050_update first.');
  }
};

generator.forBlock['mpu6050_read_accel'] = function(block: Blockly.Block) {
  const axis = block.getFieldValue('AXIS');
  generator.definitions_['mpu6050_globals'] = MPU6050_GLOBALS;
  return [axis, 0];
};

/**
 * mpu6050_read_gyro - 角速度取得（x/y/z）
 */
Blockly.Blocks['mpu6050_read_gyro'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + (Blockly.Msg.BLOCKS_MPU6050_GYRO || 'MPU6050 Gyro'))
        .appendField(new Blockly.FieldDropdown([
          ['X', 'mpu_gx'], ['Y', 'mpu_gy'], ['Z', 'mpu_gz'],
        ]), 'AXIS');
    this.setOutput(true, 'Number');
    this.setColour(MOTION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MPU6050_GYROTOOLTIP || 'Get angular velocity on the specified axis (rad/s). Call mpu6050_update first.');
  }
};

generator.forBlock['mpu6050_read_gyro'] = function(block: Blockly.Block) {
  const axis = block.getFieldValue('AXIS');
  generator.definitions_['mpu6050_globals'] = MPU6050_GLOBALS;
  return [axis, 0];
};

/**
 * mpu6050_read_temperature - 温度取得
 */
Blockly.Blocks['mpu6050_read_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + (Blockly.Msg.BLOCKS_MPU6050_TEMP || 'MPU6050 Temperature'));
    this.setOutput(true, 'Number');
    this.setColour(MOTION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MPU6050_TEMPTOOLTIP || 'Get MPU6050 internal temperature in °C. Note: this is the chip temperature, not ambient.');
  }
};

generator.forBlock['mpu6050_read_temperature'] = function() {
  generator.definitions_['mpu6050_globals'] = MPU6050_GLOBALS;
  return ['mpu_temp', 0];
};

/**
 * mpu6050_get_angle - 相補フィルタ姿勢角（pitch/roll）
 */
Blockly.Blocks['mpu6050_get_angle'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + (Blockly.Msg.BLOCKS_MPU6050_ANGLE || 'MPU6050 Angle'))
        .appendField(new Blockly.FieldDropdown([
          [Blockly.Msg.BLOCKS_MPU6050_PITCH || 'Pitch', 'mpu_pitch'],
          [Blockly.Msg.BLOCKS_MPU6050_ROLL || 'Roll', 'mpu_roll'],
        ]), 'ANGLE');
    this.setOutput(true, 'Number');
    this.setColour(MOTION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MPU6050_ANGLETOOLTIP || 'Get pitch or roll angle (degrees) using complementary filter. Call mpu6050_update in loop for accurate results.');
  }
};

generator.forBlock['mpu6050_get_angle'] = function(block: Blockly.Block) {
  const angle = block.getFieldValue('ANGLE');
  generator.definitions_['mpu6050_globals'] = MPU6050_GLOBALS;
  return [angle, 0];
};

/**
 * mpu6050_calibrate - オフセットキャリブレーション
 * 静止状態で samples 回測定し、平均を RAM 変数に保存
 */
Blockly.Blocks['mpu6050_calibrate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('🎯 ' + (Blockly.Msg.BLOCKS_MPU6050_CALIBRATE || 'MPU6050 Calibrate'));
    this.appendValueInput('SAMPLES')
        .appendField(Blockly.Msg.BLOCKS_MPU6050_SAMPLES || 'samples');
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(MOTION_COLOR);
    this.setTooltip(Blockly.Msg.BLOCKS_MPU6050_CALIBRATETOOLTIP || 'Calibrate MPU6050 by averaging measurements while stationary. Offsets stored in RAM (mpu_offset_*). Save to NVS with Preferences blocks if needed.');
  }
};

generator.forBlock['mpu6050_calibrate'] = function(block: Blockly.Block) {
  const samples = generator.valueToCode(block, 'SAMPLES', generator.ORDER_ATOMIC) || '200';
  generator.definitions_['include_mpu6050'] = MPU6050_INCLUDE;
  generator.definitions_['mpu6050_globals'] = MPU6050_GLOBALS;
  generator.definitions_['mpu6050_calibrate_func'] = `
void mpuCalibrate(int n) {
  double sax=0,say=0,saz=0,sgx=0,sgy=0,sgz=0;
  for(int i=0;i<n;i++){
    sensors_event_t a,g,t; mpu.getEvent(&a,&g,&t);
    sax+=a.acceleration.x; say+=a.acceleration.y; saz+=a.acceleration.z;
    sgx+=g.gyro.x; sgy+=g.gyro.y; sgz+=g.gyro.z;
    delay(5);
  }
  mpu_offset_ax=sax/n; mpu_offset_ay=say/n; mpu_offset_az=(saz/n)-9.81;
  mpu_offset_gx=sgx/n; mpu_offset_gy=sgy/n; mpu_offset_gz=sgz/n;
}`;
  return `  mpuCalibrate(String(${samples}).toInt());\n`;
};

console.log('Motion sensor (MPU6050) blocks loaded');
