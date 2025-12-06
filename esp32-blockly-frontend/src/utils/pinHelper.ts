/**
 * ピン番号取得ヘルパー
 * Blocklyブロックの初期化時に現在のプリセットからピン番号を取得する
 */

import { usePinPresetStore } from '../stores/pinPresetStore';

/**
 * 現在のプリセットからピン番号を取得
 */
export function getPinFromPreset(pinName: keyof ReturnType<typeof usePinPresetStore.getState>['presets'][0]['pins']): number {
  const store = usePinPresetStore.getState();
  const preset = store.getCurrentPreset();
  return preset.pins[pinName];
}

/**
 * OTTO 2足歩行のピン番号を取得
 */
export function getOttoPins() {
  return {
    leftLeg: getPinFromPreset('ottoLeftLeg'),
    rightLeg: getPinFromPreset('ottoRightLeg'),
    leftFoot: getPinFromPreset('ottoLeftFoot'),
    rightFoot: getPinFromPreset('ottoRightFoot'),
  };
}

/**
 * OTTO Wheelのピン番号を取得
 */
export function getOttoWheelPins() {
  return {
    left: getPinFromPreset('ottoWheelLeft'),
    right: getPinFromPreset('ottoWheelRight'),
  };
}

/**
 * OTTO Ninjaのピン番号を取得
 */
export function getOttoNinjaPins() {
  return {
    leftLeg: getPinFromPreset('ottoNinjaLeftLeg'),
    rightLeg: getPinFromPreset('ottoNinjaRightLeg'),
    leftFoot: getPinFromPreset('ottoNinjaLeftFoot'),
    rightFoot: getPinFromPreset('ottoNinjaRightFoot'),
  };
}

/**
 * センサー・アクチュエーターのピン番号を取得
 */
export function getSensorPins() {
  return {
    buzzer: getPinFromPreset('buzzer'),
    neopixelRing: getPinFromPreset('neopixelRing'),
    ultrasonicRgb: getPinFromPreset('ultrasonicRgb'),
    ultrasonicIo: getPinFromPreset('ultrasonicIo'),
    // HC-SR04 超音波センサー
    ultrasonicTrig: getPinFromPreset('ultrasonicTrig'),
    ultrasonicEcho: getPinFromPreset('ultrasonicEcho'),
    // DHT温湿度センサー
    dht: getPinFromPreset('dht'),
    // タッチセンサー
    touch: getPinFromPreset('touch'),
    // サウンドセンサー
    sound: getPinFromPreset('sound'),
    // 光センサー
    light: getPinFromPreset('light'),
  };
}

/**
 * 汎用Servoのピン番号を取得
 */
export function getServoPins() {
  return {
    servo1: getPinFromPreset('servo1'),
    servo2: getPinFromPreset('servo2'),
  };
}

/**
 * サーボパルス幅設定を取得
 */
export function getServoConfig() {
  const store = usePinPresetStore.getState();
  const preset = store.getCurrentPreset();
  return preset.servoConfig;
}

/**
 * サーボのパルス幅を取得
 * プリセットで設定されたmin/maxパルスを返す
 */
export function getServoPulseWidth() {
  const config = getServoConfig();
  return {
    min: config.minPulse,
    max: config.maxPulse,
    type: config.servoType,
  };
}

/**
 * DCモーターのピン番号を取得
 */
export function getMotorPins() {
  return {
    aIn1: getPinFromPreset('motorAIn1'),
    aIn2: getPinFromPreset('motorAIn2'),
    aEna: getPinFromPreset('motorAEna'),
    bIn1: getPinFromPreset('motorBIn1'),
    bIn2: getPinFromPreset('motorBIn2'),
    bEnb: getPinFromPreset('motorBEnb'),
  };
}

/**
 * ステッピングモーターのピン番号を取得
 */
export function getStepperPins() {
  return {
    in1: getPinFromPreset('stepperIn1'),
    in2: getPinFromPreset('stepperIn2'),
    in3: getPinFromPreset('stepperIn3'),
    in4: getPinFromPreset('stepperIn4'),
  };
}

/**
 * I2C Displayのピン番号を取得
 */
export function getDisplayPins() {
  return {
    sda: getPinFromPreset('displaySda'),
    scl: getPinFromPreset('displayScl'),
  };
}
