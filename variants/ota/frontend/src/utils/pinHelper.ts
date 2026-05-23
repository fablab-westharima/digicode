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
 * Humanoid 2足歩行のピン番号を取得
 */
export function getHumanoidPins() {
  return {
    leftLeg: getPinFromPreset('humanoidLeftLeg'),
    rightLeg: getPinFromPreset('humanoidRightLeg'),
    leftFoot: getPinFromPreset('humanoidLeftFoot'),
    rightFoot: getPinFromPreset('humanoidRightFoot'),
  };
}

/**
 * Wheel ロボットのピン番号を取得
 */
export function getWheelPins() {
  return {
    left: getPinFromPreset('wheelLeft'),
    right: getPinFromPreset('wheelRight'),
  };
}

/**
 * Transform ロボットのピン番号を取得
 */
export function getTransformPins() {
  return {
    leftLeg: getPinFromPreset('transformLeftLeg'),
    rightLeg: getPinFromPreset('transformRightLeg'),
    leftFoot: getPinFromPreset('transformLeftFoot'),
    rightFoot: getPinFromPreset('transformRightFoot'),
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
 * ピン番号が指定された場合、個別設定があればそちらを返す
 */
export function getServoPulseWidth(pin?: number) {
  const config = getServoConfig();
  // ピン番号指定時、個別設定を検索
  if (pin !== undefined && config.perPinConfigs?.length) {
    const perPin = config.perPinConfigs.find(c => c.pin === pin);
    if (perPin) {
      return {
        min: perPin.minPulse,
        max: perPin.maxPulse,
        type: config.servoType,
      };
    }
  }
  return {
    min: config.minPulse,
    max: config.maxPulse,
    type: config.servoType,
  };
}

/**
 * サーボの速度制御 (°/秒) を取得 (第137 Phase 1、Option A settings-only)
 *
 * 解決順序: perPin override (`config.perPinConfigs[].speedDegPerSec`、明示時のみ field 存在)
 *           → global default (`config.speedDegPerSec`)
 *           → 0 fallback (legacy state、v9 migrate 前)
 *
 * 戻り値:
 *   0 = unlimited / native ESP32Servo write 速度 = 既存 cpp 形状と完全互換、
 *       servoBlocks.ts servo_write generator は helper 注入を skip (`if (speed === 0)` early return)
 *   >0 = 増分 write + delay で rate-limit、generator は `_servoMoveAt` helper 経由 emit (第137 Phase 3)
 */
export function getServoSpeed(pin?: number): number {
  const config = getServoConfig();
  // ピン番号指定時、個別 speed override を検索
  if (pin !== undefined && config.perPinConfigs?.length) {
    const perPin = config.perPinConfigs.find(c => c.pin === pin);
    if (perPin && perPin.speedDegPerSec !== undefined) {
      return perPin.speedDegPerSec;
    }
  }
  return config.speedDegPerSec ?? 0;
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
