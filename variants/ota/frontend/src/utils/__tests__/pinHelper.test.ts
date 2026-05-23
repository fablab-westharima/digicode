/**
 * pinHelper — getServoSpeed (第137 Phase 1、Option A settings-only)
 *
 * scope:
 * - getServoSpeed(pin?) の解決順序: perPin override → global default → 0 fallback
 * - 0 = unlimited / native ESP32Servo write 速度 = 既存 cpp 完全互換 (Phase 3 helper 注入 skip 条件)
 * - >0 = rate-limit (Phase 3 で servo_write generator が `_servoMoveAt` helper 経由 emit)
 *
 * R2 (handover §3 R-2) mitigation: legacy state (speedDegPerSec field 不在) で fallback=0 保証、
 * v8→v9 migrate 後の挙動が既存挙動と完全 binary-identical であることを単体検証。
 *
 * 設計: pinPresetStore の persist migrate を直接 unit test するのは複雑なので、
 * `setState` で legacy-shape state を直接注入 → getServoSpeed の挙動を検証する
 * integration 形式 (rule 04 §「Static + unit + integration」軸の unit-level fallback verify)。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { usePinPresetStore, type PinPreset, type ServoConfig } from '../../stores/pinPresetStore';
import { getServoSpeed, getServoConfig } from '../pinHelper';

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
