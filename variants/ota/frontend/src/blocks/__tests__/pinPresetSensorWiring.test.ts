/**
 * BUG-089 (a') 配線 end-to-end test (Session 166)
 *
 * Pin Assign プリセット (pinPresetStore) → sensor_analog(11 key) + sensor_digital(10 key)
 * = 21 key / 20 block の追従検証。既存配線済み group (ultrasonic/motor/stepper) と同一構造:
 *   init default = preset / runtime = field (user 上書き可) / generator = getFieldValue emit。
 *
 * scope:
 *   a) 21 key matrix — 新規 block の PIN field default = preset 値 (unique pin で key 誤配線も検出)
 *   b) preset 切替追従 — currentPresetId 切替後の新規 block default が追従
 *   c) 生成 C++ emit — preset 由来 default が workspaceToCode に到達
 *   d) 後方互換 — XML 保存済み field 値は preset と無関係に保持される
 *   e) joystick (ii) validator — AXIS 切替時の preset 追従 5 case
 *      (④ XML load 干渉 = 実装より先に本 test で実証、破壊が出たら commit しない)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as Blockly from 'blockly';
import { usePinPresetStore, type PinPreset } from '../../stores/pinPresetStore';
// emit 検証は EditorPage と同一 pipeline (blocks-bootstrap + setups_ 注入) の xmlToCpp を使用
// (servoSpeedGenerator.test.ts と同 pattern)
import { xmlToCpp } from '../../../scripts/probabilistic-debug/lib/cpp-generator';

const BASE_PRESET: PinPreset = usePinPresetStore.getState().presets[0];

// 21 key 全件に unique な pin を割り当てる (default 値は 34/2 等で衝突しているため、
// unique 値でないと「別 key を読んでいる」誤配線を検出できない)
const UNIQUE_PINS = {
  // sensor_digital (10)
  buttonSensor: 1,
  pirSensor: 3,
  tiltSensor: 5,
  vibrationSensor: 7,
  hallSensor: 9,
  photoInterrupter: 11,
  irObstacleSensor: 13,
  flameSensorDigital: 15,
  gasSensorDigital: 17,
  limitSwitch: 19,
  // sensor_analog (11)
  potentiometer: 21,
  ldrSensor: 22,
  thermistorSensor: 23,
  lm35Sensor: 24,
  gasSensorAnalog: 25,
  soilMoistureSensor: 26,
  waterLevelSensor: 27,
  flameSensorAnalog: 28,
  irReflectiveSensor: 30,
  joystickX: 32,
  joystickY: 33,
} as const;

const UNIQUE_PRESET: PinPreset = {
  ...BASE_PRESET,
  pins: { ...BASE_PRESET.pins, ...UNIQUE_PINS },
};

function setStore(presets: PinPreset[], currentPresetId: string): void {
  usePinPresetStore.setState({ currentPresetId, presets, isPremiumEnabled: true });
}

function withWorkspace<T>(fn: (ws: Blockly.Workspace) => T): T {
  const ws = new Blockly.Workspace();
  try {
    return fn(ws);
  } finally {
    ws.dispose();
  }
}

// 19 single-pin block ↔ preset key の対応 (joystick は 1 block / 2 key で別 describe)
const SINGLE_PIN_BLOCKS: Array<[string, keyof typeof UNIQUE_PINS]> = [
  // sensor_digital
  ['button_sensor', 'buttonSensor'],
  ['pir_sensor', 'pirSensor'],
  ['tilt_sensor', 'tiltSensor'],
  ['vibration_sensor', 'vibrationSensor'],
  ['hall_sensor', 'hallSensor'],
  ['photo_interrupter', 'photoInterrupter'],
  ['ir_obstacle_sensor', 'irObstacleSensor'],
  ['flame_sensor_digital', 'flameSensorDigital'],
  ['gas_sensor_digital', 'gasSensorDigital'],
  ['limit_switch', 'limitSwitch'],
  // sensor_analog (joystick 除く)
  ['potentiometer', 'potentiometer'],
  ['ldr_sensor', 'ldrSensor'],
  ['thermistor_sensor', 'thermistorSensor'],
  ['lm35_sensor', 'lm35Sensor'],
  ['gas_sensor_analog', 'gasSensorAnalog'],
  ['soil_moisture_sensor', 'soilMoistureSensor'],
  ['water_level_sensor', 'waterLevelSensor'],
  ['flame_sensor_analog', 'flameSensorAnalog'],
  ['ir_reflective_sensor', 'irReflectiveSensor'],
];

describe('a) 21 key matrix: 新規 block の PIN field default = preset 値', () => {
  beforeEach(() => setStore([UNIQUE_PRESET], 'default'));

  it.each(SINGLE_PIN_BLOCKS)('%s → pins.%s', (blockType, key) => {
    withWorkspace((ws) => {
      const block = ws.newBlock(blockType);
      expect(Number(block.getFieldValue('PIN'))).toBe(UNIQUE_PINS[key]);
    });
  });

  it('joystick_sensor → pins.joystickX (AXIS default = X、key 20)', () => {
    withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor');
      expect(block.getFieldValue('AXIS')).toBe('X');
      expect(Number(block.getFieldValue('PIN'))).toBe(UNIQUE_PINS.joystickX);
    });
  });

  it('joystick_sensor AXIS→Y → pins.joystickY (key 21、21/21 key 全件到達)', () => {
    withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor');
      block.setFieldValue('Y', 'AXIS');
      expect(Number(block.getFieldValue('PIN'))).toBe(UNIQUE_PINS.joystickY);
    });
  });
});

describe('b) preset 切替追従: currentPresetId 切替後の新規 block default が追従', () => {
  const P2: PinPreset = {
    ...BASE_PRESET,
    id: 'p2',
    name: 'preset-2',
    isCustom: true,
    pins: { ...BASE_PRESET.pins, potentiometer: 38, buttonSensor: 4, joystickX: 36, joystickY: 37 },
  };

  beforeEach(() => setStore([UNIQUE_PRESET, P2], 'default'));

  it('analog 代表 (potentiometer): default preset 21 → p2 切替で 38', () => {
    withWorkspace((ws) => {
      expect(Number(ws.newBlock('potentiometer').getFieldValue('PIN'))).toBe(21);
    });
    setStore([UNIQUE_PRESET, P2], 'p2');
    withWorkspace((ws) => {
      expect(Number(ws.newBlock('potentiometer').getFieldValue('PIN'))).toBe(38);
    });
  });

  it('digital 代表 (button_sensor): default preset 1 → p2 切替で 4', () => {
    setStore([UNIQUE_PRESET, P2], 'p2');
    withWorkspace((ws) => {
      expect(Number(ws.newBlock('button_sensor').getFieldValue('PIN'))).toBe(4);
    });
  });

  it('joystick: p2 切替後の新規 block default = p2 の joystickX', () => {
    setStore([UNIQUE_PRESET, P2], 'p2');
    withWorkspace((ws) => {
      expect(Number(ws.newBlock('joystick_sensor').getFieldValue('PIN'))).toBe(36);
    });
  });
});

describe('c) 生成 C++ emit: preset 由来 default が生成 C++ に到達 (XML に PIN field なし = 新規配置 block 相当)', () => {
  beforeEach(() => setStore([UNIQUE_PRESET], 'default'));

  it('potentiometer (analog 代表): #define + analogRead が preset 値で emit', () => {
    const { fullCode } = xmlToCpp(
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="potentiometer"><field name="MODE">raw</field></block>' +
      '</xml>');
    expect(fullCode).toContain('#define POT_PIN_21 21');
    expect(fullCode).toContain('analogRead(POT_PIN_21)');
  });

  it('button_sensor (digital 代表): #define + digitalRead が preset 値で emit', () => {
    // pinMode は setups_ 経由で `void setup()` 存在時のみ注入されるため、単置 XML では
    // 検証対象外 (注入機構は本 fix 非接触の既存 infra)。pin 値伝搬は #define + read で証明。
    const { fullCode } = xmlToCpp(
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="button_sensor"><field name="STATE">pressed</field></block>' +
      '</xml>');
    expect(fullCode).toContain('#define BUTTON_PIN_1 1');
    expect(fullCode).toContain('digitalRead(BUTTON_PIN_1)');
  });

  it('joystick_sensor: AXIS default X で joystickX preset 値が emit', () => {
    const { fullCode } = xmlToCpp(
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="joystick_sensor"><field name="MODE">raw</field></block>' +
      '</xml>');
    expect(fullCode).toContain('#define JOY_X_PIN 32');
  });
});

describe('d) 後方互換: XML 保存済み field 値は preset と無関係に保持', () => {
  beforeEach(() => setStore([UNIQUE_PRESET], 'default'));

  it('potentiometer PIN=7 (preset 21 と不一致) の XML 読込 → field 7 保持 + emit 7', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="potentiometer"><field name="PIN">7</field><field name="MODE">raw</field></block>' +
      '</xml>';
    withWorkspace((ws) => {
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws);
      expect(Number(ws.getAllBlocks(false)[0].getFieldValue('PIN'))).toBe(7);
    });
    const { fullCode } = xmlToCpp(xml);
    expect(fullCode).toContain('#define POT_PIN_7 7');
  });

  it('button_sensor PIN=33 の XML 読込 → field 33 保持 + emit 33', () => {
    const xml =
      '<xml xmlns="https://developers.google.com/blockly/xml">' +
      '<block type="button_sensor"><field name="PIN">33</field><field name="STATE">pressed</field></block>' +
      '</xml>';
    withWorkspace((ws) => {
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xml), ws);
      expect(Number(ws.getAllBlocks(false)[0].getFieldValue('PIN'))).toBe(33);
    });
    const { fullCode } = xmlToCpp(xml);
    expect(fullCode).toContain('#define BUTTON_PIN_33 33');
  });
});

describe('e) joystick (ii) AXIS validator: preset 追従 5 case', () => {
  beforeEach(() => setStore([UNIQUE_PRESET], 'default'));

  it('① X→Y 未編集 (PIN = X preset のまま) → Y preset に追従', () => {
    withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor');
      expect(Number(block.getFieldValue('PIN'))).toBe(32);
      block.setFieldValue('Y', 'AXIS');
      expect(Number(block.getFieldValue('PIN'))).toBe(33);
    });
  });

  it('② X→Y 手入力済み (PIN ≠ X preset) → 不触', () => {
    withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor');
      block.setFieldValue(5, 'PIN');
      block.setFieldValue('Y', 'AXIS');
      expect(Number(block.getFieldValue('PIN'))).toBe(5);
    });
  });

  it('②-b 受容済み制約: 手入力値が切替前 preset と偶然同値 → 未編集と区別できず再 default される (dirty state 非追跡ゆえ原理的に不可避、実害なし)', () => {
    withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor');
      block.setFieldValue(32, 'PIN'); // user が手入力で 32 (= X preset と同値) を入れた場合
      block.setFieldValue('Y', 'AXIS');
      expect(Number(block.getFieldValue('PIN'))).toBe(33); // documented constraint
    });
  });

  it('③ Y→X 復帰 (PIN = Y preset のまま) → X preset に追従', () => {
    withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor');
      block.setFieldValue('Y', 'AXIS'); // PIN → 33
      block.setFieldValue('X', 'AXIS');
      expect(Number(block.getFieldValue('PIN'))).toBe(32);
    });
  });

  it('④ XML load 干渉なし: AXIS=Y + 保存 PIN が X preset と偶然同値 (= 最悪 case) の round-trip で保存値保持', () => {
    // user 操作で「AXIS=Y、PIN=32 (= X preset 値) を手入力」した block を作る
    const serialized = withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor');
      block.setFieldValue('Y', 'AXIS'); // PIN → 33
      block.setFieldValue(32, 'PIN'); // 手入力で 32 (X preset と同値)
      return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
    });

    // Blockly serialization の field 順 = append 順 (AXIS が PIN より先)。
    // この順序が validator 無害性の前提 (AXIS validator 発火後に PIN の保存値が適用される)。
    // init の field 順を変えるとこの assert が落ちて順序依存が surface する。
    const axisIdx = serialized.indexOf('name="AXIS"');
    const pinIdx = serialized.indexOf('name="PIN"');
    expect(axisIdx).toBeGreaterThanOrEqual(0);
    expect(pinIdx).toBeGreaterThan(axisIdx);

    // 再読込: AXIS=Y 適用時に validator が発火し PIN を一時 33 にし得るが、
    // 後続の PIN field 適用 (保存値 32) で上書きされ、最終状態は保存値を保持すること
    withWorkspace((ws) => {
      Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(serialized), ws);
      const block = ws.getAllBlocks(false)[0];
      expect(block.getFieldValue('AXIS')).toBe('Y');
      expect(Number(block.getFieldValue('PIN'))).toBe(32);
    });
  });

  it('⑤ preset 切替後の AXIS 切替: 既存 block は配置時の値を保持 (追従は新規配置 block のみ = founding intent)', () => {
    const P2: PinPreset = {
      ...BASE_PRESET,
      id: 'p2',
      name: 'preset-2',
      isCustom: true,
      pins: { ...BASE_PRESET.pins, joystickX: 10, joystickY: 11 },
    };
    withWorkspace((ws) => {
      const block = ws.newBlock('joystick_sensor'); // P1 (unique) 下で配置、PIN = 32
      setStore([UNIQUE_PRESET, P2], 'p2'); // preset を p2 へ切替
      block.setFieldValue('Y', 'AXIS');
      // PIN(32) は現 preset の joystickX(10) と不一致 → 手入力済み扱い (conservative) で不触
      expect(Number(block.getFieldValue('PIN'))).toBe(32);
    });
  });
});
