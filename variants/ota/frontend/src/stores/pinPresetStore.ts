import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * サーボタイプ
 */
export type ServoType = '180' | '270' | '360';

/**
 * サーボパルス幅設定
 * ESP32Servoの servo.attach(pin, minPulse, maxPulse) で使用
 *
 * 一般的なパルス幅:
 * - 180度サーボ (SG90, MG90S等): 500-2400μs
 * - 270度サーボ: 500-2500μs
 * - 360度サーボ (連続回転): 500-2400μs
 */
/**
 * ピンごとの個別サーボパルス幅設定
 */
export interface PinServoConfig {
  pin: number;
  minPulse: number;
  maxPulse: number;
}

export interface ServoConfig {
  servoType: ServoType;    // 使用するサーボの種類
  minPulse: number;        // 最小パルス幅 (μs) - 一括設定
  maxPulse: number;        // 最大パルス幅 (μs) - 一括設定
  perPinConfigs?: PinServoConfig[];  // ピンごとの個別設定（オプション）
}

/**
 * ピン番号プリセットの定義
 */
export interface PinPreset {
  id: string;
  name: string;
  isPremium: boolean;  // 無料/有料フラグ
  isCustom: boolean;   // カスタムプリセットフラグ
  servoConfig: ServoConfig;  // サーボパルス幅設定
  pins: {
    // Humanoid 2足歩行ロボット (Connector #8, #9, #10, #11)
    humanoidLeftLeg: number;
    humanoidRightLeg: number;
    humanoidLeftFoot: number;
    humanoidRightFoot: number;

    // Wheel ロボット (Connector #10, #11)
    wheelLeft: number;
    wheelRight: number;

    // Transform ロボット (Connector #8, #9, #10, #11)
    transformLeftLeg: number;
    transformRightLeg: number;
    transformLeftFoot: number;
    transformRightFoot: number;

    // センサー・アクチュエーター
    buzzer: number;              // GPIO 25
    neopixelRing: number;        // GPIO 4
    ultrasonicRgb: number;       // GPIO 18 (RUS-04)
    ultrasonicIo: number;        // GPIO 19 (RUS-04)

    // HC-SR04 超音波センサー
    ultrasonicTrig: number;      // GPIO 18
    ultrasonicEcho: number;      // GPIO 19

    // DHT温湿度センサー
    dht: number;                 // GPIO 4

    // タッチセンサー
    touch: number;               // GPIO 4 (T0)

    // サウンドセンサー
    sound: number;               // GPIO 34

    // 光センサー
    light: number;               // GPIO 35

    // 汎用Servo
    servo1: number;              // GPIO 32
    servo2: number;              // GPIO 33

    // DCモーター (L298N)
    motorAIn1: number;           // GPIO 16
    motorAIn2: number;           // GPIO 17
    motorAEna: number;           // GPIO 5
    motorBIn1: number;           // GPIO 23
    motorBIn2: number;           // GPIO 22
    motorBEnb: number;           // GPIO 21

    // ステッピングモーター (28BYJ-48)
    stepperIn1: number;          // GPIO 26
    stepperIn2: number;          // GPIO 12
    stepperIn3: number;          // GPIO 2
    stepperIn4: number;          // GPIO 32

    // I2C Display (OLED)
    displaySda: number;          // GPIO 21
    displayScl: number;          // GPIO 22

    // デジタルセンサー（個別）
    buttonSensor: number;        // GPIO 16 - ボタン/スイッチ
    pirSensor: number;           // GPIO 17 - PIRモーションセンサー
    tiltSensor: number;          // GPIO 23 - 傾斜センサー
    vibrationSensor: number;     // GPIO 5 - 振動センサー
    hallSensor: number;          // GPIO 12 - ホールセンサー（磁気）
    photoInterrupter: number;    // GPIO 26 - フォトインタラプタ
    irObstacleSensor: number;    // GPIO 27 - IR障害物センサー
    flameSensorDigital: number;  // GPIO 32 - 炎センサー（デジタル）
    gasSensorDigital: number;    // GPIO 33 - ガスセンサー（デジタル）
    limitSwitch: number;         // GPIO 2 - リミットスイッチ

    // アナログセンサー（個別）- ADC対応ピン使用
    potentiometer: number;       // GPIO 34 - ポテンショメータ
    ldrSensor: number;           // GPIO 35 - 光センサー（LDR/CdS）
    thermistorSensor: number;    // GPIO 36 - サーミスタ
    lm35Sensor: number;          // GPIO 39 - LM35温度センサー
    gasSensorAnalog: number;     // GPIO 34 - ガスセンサー（アナログ）
    soilMoistureSensor: number;  // GPIO 35 - 土壌水分センサー
    waterLevelSensor: number;    // GPIO 36 - 水位センサー
    flameSensorAnalog: number;   // GPIO 39 - 炎センサー（アナログ）
    irReflectiveSensor: number;  // GPIO 34 - IR反射センサー
    joystickX: number;           // GPIO 35 - ジョイスティックX軸
    joystickY: number;           // GPIO 36 - ジョイスティックY軸
  };
}

/**
 * デフォルトプリセット
 */
/**
 * サーボタイプ別のデフォルトパルス幅
 * 参考: SG90データシート、スイッチサイエンス270度サーボ
 */
export const SERVO_TYPE_DEFAULTS: Record<ServoType, { min: number; max: number; model: string }> = {
  '180': { min: 500, max: 2400, model: 'SG90' },           // SG90, MG90S, MG996R等
  '270': { min: 500, max: 2500, model: 'ASMC-04B' },       // スイッチサイエンス 270度サーボ
  '360': { min: 500, max: 2400, model: 'SG90-HV' },        // SG90-HV 連続回転サーボ
};

/**
 * デフォルトのサーボパルス幅設定
 * 180度サーボ（SG90互換）をデフォルトとする
 */
const DEFAULT_SERVO_CONFIG: ServoConfig = {
  servoType: '180',
  minPulse: 500,
  maxPulse: 2400,
};

const DEFAULT_PRESET: PinPreset = {
  id: 'default',
  name: 'デフォルト',
  isPremium: false,
  isCustom: false,
  servoConfig: { ...DEFAULT_SERVO_CONFIG },
  pins: {
    // Humanoid 2足歩行 (同じピンをTransformと共有)
    humanoidLeftLeg: 27,
    humanoidRightLeg: 15,
    humanoidLeftFoot: 14,
    humanoidRightFoot: 13,

    // Wheel ロボット
    wheelLeft: 14,
    wheelRight: 13,

    // Transform ロボット
    transformLeftLeg: 27,
    transformRightLeg: 15,
    transformLeftFoot: 14,
    transformRightFoot: 13,

    // センサー・アクチュエーター
    buzzer: 25,
    neopixelRing: 4,
    ultrasonicRgb: 18,
    ultrasonicIo: 19,

    // HC-SR04 超音波センサー
    ultrasonicTrig: 18,
    ultrasonicEcho: 19,

    // DHT温湿度センサー
    dht: 4,

    // タッチセンサー
    touch: 4,

    // サウンドセンサー
    sound: 34,

    // 光センサー
    light: 35,

    // 汎用Servo
    servo1: 32,
    servo2: 33,

    // DCモーター
    motorAIn1: 16,
    motorAIn2: 17,
    motorAEna: 5,
    motorBIn1: 23,
    motorBIn2: 22,
    motorBEnb: 21,

    // ステッピングモーター
    stepperIn1: 26,
    stepperIn2: 12,
    stepperIn3: 2,
    stepperIn4: 32,

    // I2C Display
    displaySda: 21,
    displayScl: 22,

    // デジタルセンサー（個別）
    buttonSensor: 16,        // ボタン/スイッチ
    pirSensor: 17,           // PIRモーションセンサー
    tiltSensor: 23,          // 傾斜センサー
    vibrationSensor: 5,      // 振動センサー
    hallSensor: 12,          // ホールセンサー（磁気）
    photoInterrupter: 26,    // フォトインタラプタ
    irObstacleSensor: 27,    // IR障害物センサー
    flameSensorDigital: 32,  // 炎センサー（デジタル）
    gasSensorDigital: 33,    // ガスセンサー（デジタル）
    limitSwitch: 2,          // リミットスイッチ

    // アナログセンサー（個別）- ADC対応ピン使用
    potentiometer: 34,       // ポテンショメータ
    ldrSensor: 35,           // 光センサー（LDR/CdS）
    thermistorSensor: 36,    // サーミスタ
    lm35Sensor: 39,          // LM35温度センサー
    gasSensorAnalog: 34,     // ガスセンサー（アナログ）
    soilMoistureSensor: 35,  // 土壌水分センサー
    waterLevelSensor: 36,    // 水位センサー
    flameSensorAnalog: 39,   // 炎センサー（アナログ）
    irReflectiveSensor: 34,  // IR反射センサー
    joystickX: 35,           // ジョイスティックX軸
    joystickY: 36,           // ジョイスティックY軸
  }
};

interface PinPresetStore {
  // 現在選択中のプリセット
  currentPresetId: string;

  // 全てのプリセット
  presets: PinPreset[];

  // プレミアム機能が有効かどうか（featureFlagStoreから取得するためdeprecated）
  isPremiumEnabled: boolean;

  // アクション
  setCurrentPreset: (presetId: string) => void;
  getCurrentPreset: () => PinPreset;
  addCustomPreset: (preset: Omit<PinPreset, 'id' | 'isCustom'>) => void;
  updatePreset: (id: string, preset: Partial<PinPreset>) => void;
  deletePreset: (id: string) => void;
  setPremiumEnabled: (enabled: boolean) => void;
}

export const usePinPresetStore = create<PinPresetStore>()(
  persist(
    (set, get) => ({
      currentPresetId: 'default',
      presets: [DEFAULT_PRESET],
      isPremiumEnabled: true, // 開発テスト用に有効化

      setCurrentPreset: (presetId: string) => {
        const preset = get().presets.find(p => p.id === presetId);
        if (!preset) return;

        // プレミアムプリセットの場合、プレミアムが有効かチェック
        if (preset.isPremium && !get().isPremiumEnabled) {
          console.warn('プレミアム機能が必要です');
          return;
        }

        set({ currentPresetId: presetId });
      },

      getCurrentPreset: () => {
        const { presets, currentPresetId } = get();
        return presets.find(p => p.id === currentPresetId) || DEFAULT_PRESET;
      },

      addCustomPreset: (preset) => {
        const id = `custom-${Date.now()}`;
        const newPreset: PinPreset = {
          ...preset,
          id,
          isCustom: true,
          isPremium: true,  // カスタムプリセットは有料機能
        };

        set(state => ({
          presets: [...state.presets, newPreset]
        }));
      },

      updatePreset: (id, updates) => {
        set(state => ({
          presets: state.presets.map(p =>
            p.id === id ? { ...p, ...updates } : p
          )
        }));
      },

      deletePreset: (id) => {
        // デフォルトプリセットは削除できない
        if (id === 'default') return;

        set(state => {
          const newPresets = state.presets.filter(p => p.id !== id);
          const newCurrentId = state.currentPresetId === id
            ? 'default'
            : state.currentPresetId;

          return {
            presets: newPresets,
            currentPresetId: newCurrentId
          };
        });
      },

      setPremiumEnabled: (enabled: boolean) => {
        set({ isPremiumEnabled: enabled });
      },
    }),
    {
      name: 'pin-preset-storage',
      version: 8,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Migration handles various historic state structures
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;

        // バージョン2以下からバージョン3への移行（サーボパルス幅追加）
        if (version < 3) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historic state has varying shapes
          const presets = state?.presets?.map((preset: any) => ({
            ...preset,
            servoConfig: preset.servoConfig || { ...DEFAULT_SERVO_CONFIG },
          })) || [DEFAULT_PRESET];

          state = {
            currentPresetId: state?.currentPresetId || 'default',
            presets,
            isPremiumEnabled: state?.isPremiumEnabled ?? true,
          };
        }

        // バージョン3からバージョン4への移行（追加センサーピン）
        if (version < 4) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historic state has varying shapes
          const presets = state?.presets?.map((preset: any) => ({
            ...preset,
            pins: {
              ...preset.pins,
              // 新規センサーピンを追加（未設定の場合のみ）
              ultrasonicTrig: preset.pins?.ultrasonicTrig ?? 18,
              ultrasonicEcho: preset.pins?.ultrasonicEcho ?? 19,
              dht: preset.pins?.dht ?? 4,
              touch: preset.pins?.touch ?? 4,
              sound: preset.pins?.sound ?? 34,
              light: preset.pins?.light ?? 35,
            },
          })) || [DEFAULT_PRESET];

          state = {
            ...state,
            presets,
          };
        }

        // バージョン5: Home Assistantピンは削除済み（対応ブロックがないため）

        // バージョン6: 汎用センサーピンを個別センサーピンに置き換え
        if (version < 6) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historic state has varying shapes
          const presets = state?.presets?.map((preset: any) => {
            const pins = { ...preset.pins };

            // 古い汎用ピンを削除
            delete pins.digitalSensor1;
            delete pins.digitalSensor2;
            delete pins.digitalSensor3;
            delete pins.digitalSensor4;
            delete pins.analogSensor1;
            delete pins.analogSensor2;
            delete pins.analogSensor3;
            delete pins.analogSensor4;
            delete pins.gpioPin1;
            delete pins.gpioPin2;
            delete pins.gpioPin3;
            delete pins.gpioPin4;

            // 新しい個別センサーピンを追加
            return {
              ...preset,
              pins: {
                ...pins,
                // デジタルセンサー
                buttonSensor: pins.buttonSensor ?? 16,
                pirSensor: pins.pirSensor ?? 17,
                tiltSensor: pins.tiltSensor ?? 23,
                vibrationSensor: pins.vibrationSensor ?? 5,
                hallSensor: pins.hallSensor ?? 12,
                photoInterrupter: pins.photoInterrupter ?? 26,
                irObstacleSensor: pins.irObstacleSensor ?? 27,
                flameSensorDigital: pins.flameSensorDigital ?? 32,
                gasSensorDigital: pins.gasSensorDigital ?? 33,
                limitSwitch: pins.limitSwitch ?? 2,
                // アナログセンサー
                potentiometer: pins.potentiometer ?? 34,
                ldrSensor: pins.ldrSensor ?? 35,
                thermistorSensor: pins.thermistorSensor ?? 36,
                lm35Sensor: pins.lm35Sensor ?? 39,
                gasSensorAnalog: pins.gasSensorAnalog ?? 34,
                soilMoistureSensor: pins.soilMoistureSensor ?? 35,
                waterLevelSensor: pins.waterLevelSensor ?? 36,
                flameSensorAnalog: pins.flameSensorAnalog ?? 39,
                irReflectiveSensor: pins.irReflectiveSensor ?? 34,
                joystickX: pins.joystickX ?? 35,
                joystickY: pins.joystickY ?? 36,
              },
            };
          }) || [DEFAULT_PRESET];

          state = {
            ...state,
            presets,
          };
        }

        // バージョン7: サーボパルス幅の個別設定を追加
        if (version < 7) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historic state has varying shapes
          const presets = state?.presets?.map((preset: any) => ({
            ...preset,
            servoConfig: {
              ...preset.servoConfig,
              perPinConfigs: preset.servoConfig?.perPinConfigs || [],
            },
          })) || [DEFAULT_PRESET];

          state = {
            ...state,
            presets,
          };
        }

        // バージョン8: ピンフィールド名を otto* から humanoid*/wheel*/transform* にリネーム
        // sunset: 2027-04-21（OTTO 排除 2026-04-21 の 1 年後）以降、
        //   この version < 8 ブロック全体と関連 pin rename ロジックを削除、
        //   必要なら version を 9 に上げて再初期化扱いとする。
        //   理由: 1 年あれば全アクティブユーザーが 1 度以上 migrate 完了する想定。
        if (version < 8) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Historic state has varying shapes
          const presets = state?.presets?.map((preset: any) => {
            const pins = { ...preset.pins };

            // Humanoid (旧 otto_bipedal)
            if ('ottoLeftLeg' in pins) { pins.humanoidLeftLeg = pins.ottoLeftLeg; delete pins.ottoLeftLeg; }
            if ('ottoRightLeg' in pins) { pins.humanoidRightLeg = pins.ottoRightLeg; delete pins.ottoRightLeg; }
            if ('ottoLeftFoot' in pins) { pins.humanoidLeftFoot = pins.ottoLeftFoot; delete pins.ottoLeftFoot; }
            if ('ottoRightFoot' in pins) { pins.humanoidRightFoot = pins.ottoRightFoot; delete pins.ottoRightFoot; }

            // Wheel (旧 otto_wheel)
            if ('ottoWheelLeft' in pins) { pins.wheelLeft = pins.ottoWheelLeft; delete pins.ottoWheelLeft; }
            if ('ottoWheelRight' in pins) { pins.wheelRight = pins.ottoWheelRight; delete pins.ottoWheelRight; }

            // Transform (旧 otto_ninja)
            if ('ottoNinjaLeftLeg' in pins) { pins.transformLeftLeg = pins.ottoNinjaLeftLeg; delete pins.ottoNinjaLeftLeg; }
            if ('ottoNinjaRightLeg' in pins) { pins.transformRightLeg = pins.ottoNinjaRightLeg; delete pins.ottoNinjaRightLeg; }
            if ('ottoNinjaLeftFoot' in pins) { pins.transformLeftFoot = pins.ottoNinjaLeftFoot; delete pins.ottoNinjaLeftFoot; }
            if ('ottoNinjaRightFoot' in pins) { pins.transformRightFoot = pins.ottoNinjaRightFoot; delete pins.ottoNinjaRightFoot; }

            return { ...preset, pins };
          }) || [DEFAULT_PRESET];

          state = {
            ...state,
            presets,
          };
        }

        return state;
      },
    }
  )
);
