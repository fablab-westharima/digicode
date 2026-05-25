/**
 * ピン番号取得ヘルパー
 * Blocklyブロックの初期化時に現在のプリセットからピン番号を取得する
 */

import { usePinPresetStore } from '../stores/pinPresetStore';
import { usePIDTuningStore } from '../stores/pidTuningStore';

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
 * サーボの trim (°) を取得 (Phase B-1、Session 146、E1 = pulse + speed + trim 3 軸統合)
 *
 * 解決順序: perPin override (`config.perPinConfigs[].trimDeg`、明示時のみ field 存在)
 *           → global default (`config.trimDeg`)
 *           → 0 fallback (legacy state、v10 migrate 前)
 *
 * 戻り値:
 *   0 = no trim = 既存 cpp 形状不変、Phase B-3 generator は emit skip (R1 invariant、default 時のみ emit ない)
 *   非零 = Layer 2 _writeHw 内 `final = constrain(target + trim, 0, 180)` で position offset
 *   範囲: -30..+30 (DigiMotion ServoChannel180::setTrim clamp 仕様、Layer 2 側で再 clamp 適用)
 *
 * case 23 incident A 解消の核 helper: 全 generator (servo_write + biped_init + morpher_init + rover_init_servo +
 * stepper_init_*) が同 helper 経由で trim 取得、partial reflection 構造禁止。
 */
export function getServoTrim(pin?: number): number {
  const config = getServoConfig();
  // ピン番号指定時、個別 trim override を検索
  if (pin !== undefined && config.perPinConfigs?.length) {
    const perPin = config.perPinConfigs.find(c => c.pin === pin);
    if (perPin && perPin.trimDeg !== undefined) {
      return perPin.trimDeg;
    }
  }
  return config.trimDeg ?? 0;
}

/**
 * サーボの reverse (boolean) を取得 (Phase 3-C、Session 156、4 軸統合 = pulse + speed + trim + reverse)
 *
 * 解決順序: perPin override (`config.perPinConfigs[].reverse`、明示時のみ field 存在)
 *           → global default (`config.reverse`)
 *           → false fallback (legacy state、v11 migrate 前)
 *
 * 戻り値:
 *   false = 通常方向 = 既存 cpp 形状不変、Phase 3-D generator は emit skip (R1 invariant、default 時 emit ない)
 *   true  = lib `IActuatorChannel::setReverse(true)` で mirror (servo) or velocity sign flip (continuous/dc motor)
 *
 * case 22 founding use case 達成 path: 等身大 Humanoid 物理取付方向逆向きの user-facing 補正。
 * compile-time only (runtime transport なし)。 全 generator (servo_write + biped_init + morpher_init +
 * rover_init_servo + rover_init_dc_motor) が同 helper 経由で reverse 取得、 partial reflection 構造禁止。
 */
export function getServoReverse(pin?: number): boolean {
  const config = getServoConfig();
  // ピン番号指定時、個別 reverse override を検索
  if (pin !== undefined && config.perPinConfigs?.length) {
    const perPin = config.perPinConfigs.find(c => c.pin === pin);
    if (perPin && perPin.reverse !== undefined) {
      return perPin.reverse;
    }
  }
  return config.reverse ?? false;
}

/**
 * PID gain (kp, ki, kd) を取得 (Phase B-1、Session 146、case 23 incident F generator side 解消の核 helper)
 *
 * 解決順序: `usePIDTuningStore` の現在値を直接取得 (PIDTuningPanel slider 操作で更新される field)。
 *
 * Phase B-3 で `pid_init` 6 block の KP/KI/KD value input を optional 化、未接続時 (math_number 未配置時) は
 * 本 helper の戻り値を emit。PIDTuningPanel と pid_init block の値が同期 = case 23 incident F の 3 層 orphan の
 * 「generator side で store ignore」 を解消 (D-new-6 案 (A) generator emit + (B) runtime transport の前者、
 * 後者 = transport は Phase D commit 2 で別途実装)。
 *
 * 戻り値: `{kp, ki, kd}` 直接値 (number)、generator emit で template literal に直接埋込。
 */
export function getPidGains(): { kp: number; ki: number; kd: number } {
  const store = usePIDTuningStore.getState();
  return { kp: store.kp, ki: store.ki, kd: store.kd };
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
