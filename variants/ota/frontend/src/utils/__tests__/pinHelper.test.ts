/**
 * pinHelper — getServoSpeed (第137 Phase 1、Option A settings-only) + getServoTrim + getPidGains (Phase B-1、Session 146)
 *
 * scope:
 * - getServoSpeed(pin?) の解決順序: perPin override → global default → 0 fallback
 * - getServoTrim(pin?) の解決順序: perPin override → global default → 0 fallback (E1 軸、case 23 incident A 解消)
 * - getPidGains() の解決: usePIDTuningStore 直接 read (case 23 incident F generator side 解消)
 *
 * 設計: pinPresetStore + pidTuningStore の persist migrate を直接 unit test するのは複雑なので、
 * `setState` で state を直接注入 → helper の挙動を検証する integration 形式
 * (rule 04 §「Static + unit + integration」軸の unit-level fallback verify)。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePinPresetStore, type PinPreset, type ServoConfig } from '../../stores/pinPresetStore';
import { usePIDTuningStore } from '../../stores/pidTuningStore';
import { getServoSpeed, getServoConfig, getServoTrim, getPidGains } from '../pinHelper';

const BASE_PRESET: PinPreset = usePinPresetStore.getState().presets[0];

function setServoConfig(config: ServoConfig): void {
  usePinPresetStore.setState({
    currentPresetId: 'default',
    presets: [{ ...BASE_PRESET, servoConfig: config }],
    isPremiumEnabled: true,
  });
}

describe('getServoSpeed — default behavior (legacy / unset)', () => {
  beforeEach(() => {
    // 初期 store 状態に reset (DEFAULT_SERVO_CONFIG = speedDegPerSec: 0)
    usePinPresetStore.setState({
      currentPresetId: 'default',
      presets: [BASE_PRESET],
      isPremiumEnabled: true,
    });
  });

  it('returns 0 when no pin specified and default servoConfig (DEFAULT_SERVO_CONFIG.speedDegPerSec===0)', () => {
    expect(getServoSpeed()).toBe(0);
  });

  it('returns 0 for any pin when default servoConfig (no perPin overrides)', () => {
    expect(getServoSpeed(13)).toBe(0);
    expect(getServoSpeed(32)).toBe(0);
  });

  it('returns 0 when global speedDegPerSec is undefined (legacy v8 state pre-migrate, fallback ?? 0)', () => {
    // Simulate legacy state where v8 servoConfig had no speedDegPerSec field
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      // speedDegPerSec: 未定義 = legacy v8 state
    });
    expect(getServoSpeed()).toBe(0);
    expect(getServoSpeed(13)).toBe(0);
  });

  it('DEFAULT_SERVO_CONFIG persists speedDegPerSec: 0 (constant verify、Phase 3 generator が早期 return する条件)', () => {
    // 初期 store の servoConfig 直接 read (DEFAULT_SERVO_CONFIG inline)
    expect(getServoConfig().speedDegPerSec).toBe(0);
  });
});

describe('getServoSpeed — global default override', () => {
  it('returns global speedDegPerSec when no pin specified', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 180,
    });
    expect(getServoSpeed()).toBe(180);
  });

  it('returns global speedDegPerSec for any pin (no perPin override present)', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 360,
    });
    expect(getServoSpeed(13)).toBe(360);
    expect(getServoSpeed(32)).toBe(360);
  });

  it('returns global speedDegPerSec=0 (explicit unlimited override, distinct from undefined fallback)', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
    });
    expect(getServoSpeed()).toBe(0);
    expect(getServoSpeed(13)).toBe(0);
  });
});

describe('getServoSpeed — per-pin override resolution', () => {
  it('returns perPin speedDegPerSec when matched (perPin overrides global)', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 360, // global
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400, speedDegPerSec: 60 }, // pin 13 = slow
      ],
    });
    expect(getServoSpeed(13)).toBe(60);
  });

  it('falls back to global when perPin entry exists but speedDegPerSec field is undefined', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 360,
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400 }, // legacy v7 perPin entry (pulse only, no speed)
      ],
    });
    expect(getServoSpeed(13)).toBe(360); // global fallback
  });

  it('falls back to global when pin does not match any perPin entry', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 120,
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400, speedDegPerSec: 60 },
      ],
    });
    expect(getServoSpeed(32)).toBe(120); // pin 32 not in perPin list, falls to global
  });

  it('returns perPin speedDegPerSec=0 when explicitly set (explicit unlimited override per-pin)', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 360, // global non-zero
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400, speedDegPerSec: 0 }, // pin 13 = explicit unlimited
      ],
    });
    expect(getServoSpeed(13)).toBe(0); // perPin 0 wins, NOT global 360
  });
});

// ============================================================================
// Phase B-1 (Session 146) — getServoTrim (E1 = pulse + speed + trim 3 軸統合)
// ============================================================================

describe('getServoTrim — default behavior (legacy / unset)', () => {
  beforeEach(() => {
    usePinPresetStore.setState({
      currentPresetId: 'default',
      presets: [BASE_PRESET],
      isPremiumEnabled: true,
    });
  });

  it('returns 0 when no pin specified and default servoConfig (DEFAULT_SERVO_CONFIG.trimDeg===0)', () => {
    expect(getServoTrim()).toBe(0);
  });

  it('returns 0 for any pin when default servoConfig (no perPin trim overrides)', () => {
    expect(getServoTrim(13)).toBe(0);
    expect(getServoTrim(27)).toBe(0);
  });

  it('returns 0 when global trimDeg is undefined (legacy v9 state pre-v10 migrate, fallback ?? 0)', () => {
    // Simulate legacy state where v9 servoConfig had no trimDeg field (case 21 reporting accuracy verify)
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
      // trimDeg: 未定義 = legacy v9 state、v10 migrate 前の挙動
    });
    expect(getServoTrim()).toBe(0);
    expect(getServoTrim(13)).toBe(0);
  });
});

describe('getServoTrim — global default override', () => {
  it('returns global trimDeg when no pin specified', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
      trimDeg: 5,
    });
    expect(getServoTrim()).toBe(5);
  });

  it('returns global trimDeg for any pin (no perPin override present)', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
      trimDeg: -10,
    });
    expect(getServoTrim(13)).toBe(-10);
    expect(getServoTrim(27)).toBe(-10);
  });
});

describe('getServoTrim — per-pin override resolution', () => {
  it('returns perPin trimDeg when matched (perPin overrides global)', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
      trimDeg: 5, // global
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400, trimDeg: -8 }, // pin 13 = override
      ],
    });
    expect(getServoTrim(13)).toBe(-8);
  });

  it('falls back to global when perPin entry exists but trimDeg field is undefined', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
      trimDeg: 7,
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400 }, // legacy v9 perPin entry (no trim field)
      ],
    });
    expect(getServoTrim(13)).toBe(7); // global fallback
  });

  it('falls back to global when pin does not match any perPin entry', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
      trimDeg: 3,
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400, trimDeg: -5 },
      ],
    });
    expect(getServoTrim(27)).toBe(3); // pin 27 not in perPin list, falls to global
  });

  it('returns perPin trimDeg=0 when explicitly set (explicit no-trim override per-pin)', () => {
    setServoConfig({
      servoType: '180',
      minPulse: 500,
      maxPulse: 2400,
      speedDegPerSec: 0,
      trimDeg: 10, // global non-zero
      perPinConfigs: [
        { pin: 13, minPulse: 500, maxPulse: 2400, trimDeg: 0 }, // pin 13 = explicit no-trim
      ],
    });
    expect(getServoTrim(13)).toBe(0); // perPin 0 wins, NOT global 10
  });
});

// ============================================================================
// Phase B-1 (Session 146) — getPidGains (case 23 incident F generator side 解消)
// ============================================================================

describe('getPidGains — usePIDTuningStore read-through', () => {
  beforeEach(() => {
    // pidTuningStore default = { kp: 0.2, ki: 0.0001, kd: 5 }
    usePIDTuningStore.getState().reset();
  });

  it('returns default kp/ki/kd from store on initial state', () => {
    const gains = getPidGains();
    expect(gains).toEqual({ kp: 0.2, ki: 0.0001, kd: 5 });
  });

  it('reflects setPID changes (slider operation in PIDTuningPanel)', () => {
    usePIDTuningStore.getState().setPID(0.8, 0.01, 12);
    const gains = getPidGains();
    expect(gains).toEqual({ kp: 0.8, ki: 0.01, kd: 12 });
  });

  it('reflects loadPreset (e.g. micromouse-wall = kp=1.0, ki=0.01, kd=15)', () => {
    usePIDTuningStore.getState().loadPreset('micromouse-wall');
    const gains = getPidGains();
    expect(gains).toEqual({ kp: 1.0, ki: 0.01, kd: 15 });
  });

  it('reflects setKp/setKi/setKd individual setters', () => {
    usePIDTuningStore.getState().setKp(0.5);
    usePIDTuningStore.getState().setKi(0.005);
    usePIDTuningStore.getState().setKd(8);
    expect(getPidGains()).toEqual({ kp: 0.5, ki: 0.005, kd: 8 });
  });
});
