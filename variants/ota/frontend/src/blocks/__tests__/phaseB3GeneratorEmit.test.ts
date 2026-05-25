/**
 * Phase B-3 generator emit verbatim test (Session 146、60.md §1 Phase B-3 + §2 baseline、
 *   Phase X-2 commit 1 (Session 152) で biped/morpher/rover init emit を lib actual API に揃え
 *   = expected string 全件 rewrite。 servo_write と pid_init は X-2 scope 外で従来通り)
 *
 * scope (case 23 incident A + F generator-side 完全解消 verify):
 * - biped_init / morpher_init / rover_init_servo: lib actual API match (concrete channel
 *   instance emit + attachChannels + 0-arg init() (biped/morpher) または initServoMode(IActuatorChannel*×2)
 *   (rover)) + 3 軸 (pulse + speed + trim) per-channel emit
 * - servo_write: trim 軸追加 emit (R1 invariant default 時 byte-identical)
 * - pid_init: KP/KI/KD optional + getPidGains() fallback (case 23 incident F generator-side 解消)
 *
 * R1 invariant: default 値 (pulse 500-2400 / speed 0 / trim 0) では 3 軸 setChannel* emit ゼロ、
 * lib actual API match の最小 line のみ。 user が ServoPulseDialog/ServoSpeedDialog/ServoTrimDialog
 * で明示時のみ behavior 変化。 注: pre-Phase-X-2 と byte-identical ではない (init() signature 変更で
 * concrete channel emit 必須、 ただし behavior は等価 = Phase X-2 commit msg 内 deviation 記録)。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';
import { usePinPresetStore, type PinPreset, type ServoConfig } from '../../stores/pinPresetStore';
import { usePIDTuningStore } from '../../stores/pidTuningStore';

// Block 定義 (forBlock generator 登録) を side-effect import
import '../arduino/robot/bipedBlocks';
import '../arduino/robot/morpherBlocks';
import '../arduino/robot/roverBlocks';
import '../arduino/robot/pidBlocks';
import '../arduino/actuator/servoBlocks';

const BASE_PRESET: PinPreset = usePinPresetStore.getState().presets[0];

function resetStore(): void {
  usePinPresetStore.setState({
    currentPresetId: 'default',
    presets: [BASE_PRESET],
    isPremiumEnabled: true,
  });
}

function setServoConfig(config: ServoConfig): void {
  usePinPresetStore.setState({
    currentPresetId: 'default',
    presets: [{ ...BASE_PRESET, servoConfig: config }],
    isPremiumEnabled: true,
  });
}

// Helper: 1 block の generator 単独実行 (workspaceToCode 経由)
function genFromBlock(blockType: string, fields: Record<string, string | number> = {}): string {
  const ws = new Blockly.Workspace();
  try {
    const block = ws.newBlock(blockType);
    for (const [key, value] of Object.entries(fields)) {
      block.setFieldValue(String(value), key);
    }
    block.initSvg && block.initSvg();
    return javascriptGenerator.workspaceToCode(ws);
  } finally {
    ws.dispose();
  }
}

describe('Phase B-3 + Phase X-2: biped_init lib actual API match + 3 軸 per-channel emit (E1)', () => {
  beforeEach(resetStore);

  it('default 値で setChannel* emit なし (R1 invariant)、lib actual API match', () => {
    const cpp = genFromBlock('biped_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13, PIN_BUZZER: 25,
    });
    expect(cpp).not.toContain('setChannelPulseRange');
    expect(cpp).not.toContain('setChannelMaxRate');
    expect(cpp).not.toContain('setChannelTrim');
    // Phase X-2: attachChannels + 0-arg init() + buzzer attach
    expect(cpp).toContain('biped.attachChannels(&_bipedCh0, &_bipedCh1, &_bipedCh2, &_bipedCh3);');
    expect(cpp).toContain('biped.init();');
    expect(cpp).toContain('buzzer.attach(25);');
    expect(cpp).toContain('biped.attachBuzzer(&buzzer);');
  });

  it('speedDegPerSec=60 (global) → 4 channel 全件 setChannelMaxRate emit (attachChannels と init の間)', () => {
    setServoConfig({
      servoType: '180', minPulse: 500, maxPulse: 2400,
      speedDegPerSec: 60, trimDeg: 0,
    });
    const cpp = genFromBlock('biped_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13, PIN_BUZZER: 25,
    });
    expect(cpp).toContain('biped.attachChannels(&_bipedCh0, &_bipedCh1, &_bipedCh2, &_bipedCh3);');
    expect(cpp).toContain('biped.setChannelMaxRate(0, 60);');
    expect(cpp).toContain('biped.setChannelMaxRate(1, 60);');
    expect(cpp).toContain('biped.setChannelMaxRate(2, 60);');
    expect(cpp).toContain('biped.setChannelMaxRate(3, 60);');
    expect(cpp).toContain('biped.init();');
  });

  it('trimDeg=5 (global) → 4 channel 全件 setChannelTrim emit (case 23 incident A 解消)', () => {
    setServoConfig({
      servoType: '180', minPulse: 500, maxPulse: 2400,
      speedDegPerSec: 0, trimDeg: 5,
    });
    const cpp = genFromBlock('biped_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13, PIN_BUZZER: 25,
    });
    expect(cpp).toContain('biped.setChannelTrim(0, 5);');
    expect(cpp).toContain('biped.setChannelTrim(3, 5);');
  });

  it('perPin trimDeg override → 該当 channel のみ override emit', () => {
    setServoConfig({
      servoType: '180', minPulse: 500, maxPulse: 2400,
      speedDegPerSec: 0, trimDeg: 0,
      perPinConfigs: [
        { pin: 27, minPulse: 500, maxPulse: 2400, trimDeg: -8 },  // pin 27 = LL = channel 0
        { pin: 13, minPulse: 500, maxPulse: 2400, trimDeg: 10 },  // pin 13 = RF = channel 3
      ],
    });
    const cpp = genFromBlock('biped_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13, PIN_BUZZER: 25,
    });
    expect(cpp).toContain('biped.setChannelTrim(0, -8);');
    expect(cpp).toContain('biped.setChannelTrim(3, 10);');
    expect(cpp).not.toContain('biped.setChannelTrim(1,');
    expect(cpp).not.toContain('biped.setChannelTrim(2,');
  });

  it('Phase X-2: emits/requires comment 付与 (rule 16 §D1)', () => {
    const cpp = genFromBlock('biped_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13, PIN_BUZZER: 25,
    });
    // definitions_['biped_channels'] 内に emits: comment
    expect(cpp).toContain('/* emits: _bipedCh0..3 (ServoChannel180), biped (DigiBiped), buzzer (IBuzzer&) */');
    expect(cpp).toContain('ServoChannel180 _bipedCh0(27);');
    expect(cpp).toContain('DigiBiped biped;');
    expect(cpp).toContain('IBuzzer& buzzer = getBuzzer();');
  });
});

describe('Phase B-3 + Phase X-2: morpher_init lib actual API match + 3 軸 per-channel emit (E1)', () => {
  beforeEach(resetStore);

  it('default 値で R1 invariant、lib actual API match', () => {
    const cpp = genFromBlock('morpher_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13,
    });
    expect(cpp).not.toContain('setChannelPulseRange');
    expect(cpp).not.toContain('setChannelMaxRate');
    expect(cpp).not.toContain('setChannelTrim');
    expect(cpp).toContain('morpher.attachChannels(&_morpherCh0, &_morpherCh1, &_morpherCh2, &_morpherCh3);');
    expect(cpp).toContain('morpher.init();');
  });

  it('global trim=3 → 4 channel 全件 emit', () => {
    setServoConfig({
      servoType: '180', minPulse: 500, maxPulse: 2400,
      speedDegPerSec: 0, trimDeg: 3,
    });
    const cpp = genFromBlock('morpher_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13,
    });
    expect(cpp).toContain('morpher.setChannelTrim(0, 3);');
    expect(cpp).toContain('morpher.setChannelTrim(1, 3);');
  });

  it('Phase X-2: emits comment + ServoChannel180 instance emit', () => {
    const cpp = genFromBlock('morpher_init', {
      PIN_LL: 27, PIN_RL: 15, PIN_LF: 14, PIN_RF: 13,
    });
    expect(cpp).toContain('/* emits: _morpherCh0..3 (ServoChannel180), morpher (DigiMorpher) */');
    expect(cpp).toContain('ServoChannel180 _morpherCh0(27);');
    expect(cpp).toContain('DigiMorpher morpher;');
  });
});

describe('Phase B-3 + Phase X-2: rover_init_servo lib actual API match + 3 軸 per-channel emit (連続回転 servo)', () => {
  beforeEach(resetStore);

  it('default 値で R1 invariant、lib actual API match', () => {
    const cpp = genFromBlock('rover_init_servo', { PIN_L: 14, PIN_R: 13 });
    expect(cpp).not.toContain('setChannelPulseRange');
    expect(cpp).not.toContain('setChannelMaxRate');
    expect(cpp).not.toContain('setChannelTrim');
    expect(cpp).toContain('rover.initServoMode(&_roverChL, &_roverChR);');
  });

  it('speedDegPerSec=120 → 2 channel emit (連続回転 servo の加速度制限)', () => {
    setServoConfig({
      servoType: '360', minPulse: 500, maxPulse: 2400,
      speedDegPerSec: 120, trimDeg: 0,
    });
    const cpp = genFromBlock('rover_init_servo', { PIN_L: 14, PIN_R: 13 });
    expect(cpp).toContain('rover.setChannelMaxRate(0, 120);');
    expect(cpp).toContain('rover.setChannelMaxRate(1, 120);');
  });

  it('Phase X-2: emits comment + ContinuousServoChannel instance emit', () => {
    const cpp = genFromBlock('rover_init_servo', { PIN_L: 14, PIN_R: 13 });
    expect(cpp).toContain('/* emits: _roverChL, _roverChR (ContinuousServoChannel), rover (DigiRover) */');
    expect(cpp).toContain('ContinuousServoChannel _roverChL(14);');
    expect(cpp).toContain('ContinuousServoChannel _roverChR(13);');
    expect(cpp).toContain('DigiRover rover;');
  });
});

describe('Phase X-2 commit 1: rover_init_dc_motor lib actual API match (Q-D=A DcMotorChannel*×2)', () => {
  beforeEach(resetStore);

  it('default 値で DcMotorChannel ×2 + initDcMotorMode emit', () => {
    const cpp = genFromBlock('rover_init_dc_motor', {
      PIN_LA: 16, PIN_LB: 17, PIN_RA: 18, PIN_RB: 19,
    });
    // Phase X-1.5 Q-D=A refactor: DcMotorChannel(forwardPin, reversePin) ×2 instance
    expect(cpp).toContain('/* emits: _roverMotorL, _roverMotorR (DcMotorChannel), rover (DigiRover) */');
    expect(cpp).toContain('DcMotorChannel _roverMotorL(16, 17);');
    expect(cpp).toContain('DcMotorChannel _roverMotorR(18, 19);');
    expect(cpp).toContain('DigiRover rover;');
    expect(cpp).toContain('rover.initDcMotorMode(&_roverMotorL, &_roverMotorR);');
  });
});

describe('Phase B-3: servo_write trim 軸追加 (E1)', () => {
  beforeEach(resetStore);

  it('default trim=0 → byte-identical 旧挙動 (R1 invariant)', () => {
    const cpp = genFromBlock('servo_write', { PIN: 13 });
    // default angle '90' (no ANGLE value input connected)
    expect(cpp).toContain('servo13.write(String(90).toInt());');
    expect(cpp).not.toContain('constrain');
  });

  it('trim=5 (global、speed=0) → constrain(angle + 5, 0, 180) で wrap', () => {
    setServoConfig({
      servoType: '180', minPulse: 500, maxPulse: 2400,
      speedDegPerSec: 0, trimDeg: 5,
    });
    const cpp = genFromBlock('servo_write', { PIN: 13 });
    expect(cpp).toContain('constrain(String(90).toInt() + (5), 0, 180)');
  });

  it('perPin trim=-10 (pin 13) → 該当 pin のみ override', () => {
    setServoConfig({
      servoType: '180', minPulse: 500, maxPulse: 2400,
      speedDegPerSec: 0, trimDeg: 0,
      perPinConfigs: [{ pin: 13, minPulse: 500, maxPulse: 2400, trimDeg: -10 }],
    });
    const cpp = genFromBlock('servo_write', { PIN: 13 });
    expect(cpp).toContain('constrain(String(90).toInt() + (-10), 0, 180)');
  });
});

describe('Phase B-3: pid_init getPidGains() fallback (case 23 incident F generator-side 解消)', () => {
  beforeEach(() => {
    usePIDTuningStore.getState().reset();  // default: kp=0.2, ki=0.0001, kd=5
  });

  it('default pidTuningStore → cpp emit に store 値が反映 (kp=0.2, ki=0.0001, kd=5)', () => {
    const cpp = genFromBlock('pid_init', { NAME: 'line' });
    // pidTuningStore default = { kp: 0.2, ki: 0.0001, kd: 5 }
    expect(cpp).toContain('float pid_line_kp = 0.2;');
    expect(cpp).toContain('float pid_line_ki = 0.0001;');
    expect(cpp).toContain('float pid_line_kd = 5;');
  });

  it('PIDTuningPanel slider 操作 (setPID(0.8, 0.01, 12)) → cpp emit に反映 = orphan 解消', () => {
    usePIDTuningStore.getState().setPID(0.8, 0.01, 12);
    const cpp = genFromBlock('pid_init', { NAME: 'wall' });
    expect(cpp).toContain('float pid_wall_kp = 0.8;');
    expect(cpp).toContain('float pid_wall_ki = 0.01;');
    expect(cpp).toContain('float pid_wall_kd = 12;');
  });

  it('loadPreset(micromouse-wall) → kp=1.0/ki=0.01/kd=15 が pid_init cpp に反映', () => {
    usePIDTuningStore.getState().loadPreset('micromouse-wall');
    const cpp = genFromBlock('pid_init', { NAME: 'wall' });
    expect(cpp).toContain('float pid_wall_kp = 1;');
    expect(cpp).toContain('float pid_wall_ki = 0.01;');
    expect(cpp).toContain('float pid_wall_kd = 15;');
  });
});
