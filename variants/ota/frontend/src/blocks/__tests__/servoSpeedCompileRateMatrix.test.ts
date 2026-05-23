/**
 * servo_write compile-rate matrix (Session 138 redesign: 非同期並列動作)
 *
 * user 要件 #6「コンパイル率の検証計画」の CI gate 実装。
 * 10 fixtures × 5 speed values × 2 scope (global vs per-pin) を網羅し、
 * 全件で xmlToCpp が exit 0 + 期待 emit パターン (helper 有無 / call shape / dedup
 * count) と一致することを machine-verify。Phase 3 の servoSpeedGenerator.test.ts
 * との重複は意図的 = Phase 3 が「2 path 分岐の構造」を verify、本 file
 * が「広 speed × scope matrix での compile 率 100% 維持」を verify、軸が別。
 *
 * Session 138 redesign: 旧 blocking helper (_servoMoveAt + delay) を non-
 * blocking FreeRTOS task helper (_servoStart + _servoBackgroundTask) に置換。
 * call shape も `_servoMoveAt(servo${pin}, ${pin}, ..., ${speed})` から
 * `_servoStart(servo${pin}, ${pin}, ..., ${speed})` に変更。R1 invariant
 * (speed=0 で helper 完全不在) は維持、speed>0 で複数サーボの並列動作可能に。
 *
 * 採用 fixture (10 cases):
 *   1. global=0 / 1 write           — baseline (R1: helper absent)
 *   2. global=30 / 1 write          — slow extreme (helper present)
 *   3. global=180 / 1 write         — moderate (helper present)
 *   4. global=360 / 1 write         — quick (helper present)
 *   5. global=720 / 1 write         — fast extreme (helper present)
 *   6. global=0 + perPin{pin13=60} / write pin 13     — perPin override only
 *   7. global=0 + perPin{pin13=60} / write pin 32     — unaffected pin (R1 per-pin preserved)
 *   8. global=360 + perPin{pin32=0} / write pin 32    — explicit unlimited override (R1 explicit-0 path)
 *   9. global=180 / 2 writes pins 13+32              — helper dedup (count==1)
 *  10. global=0 + perPin{pin13=60} / 2 writes 13+32  — mixed path (helper+direct in same cpp)
 *
 * Acceptance gate (★ user 要件 #6): 10/10 (100%) PASS が release blocker。
 * 9/10 以下なら hotfix or scope 調整、release 停止。
 *
 * Production smoke (本 file scope 外、user-driven):
 *   default speed=0 で 65 canonical samples を ML30 / Cloud compile → 65/65 exit 0
 *   verify (audit-sample-structural 65/65 clean + sample-e2e-probe 196 cases PASS
 *   で構造的予防済、Phase 3 で確認)。任意の non-default speed 設定 + servo sample
 *   の実機書込 verify は user-driven UAT で別途実施。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { xmlToCpp } from '../../../scripts/probabilistic-debug/lib/cpp-generator';
import { usePinPresetStore, type PinPreset, type PinServoConfig } from '@/stores/pinPresetStore';

const BASE_PRESET: PinPreset = usePinPresetStore.getState().presets[0];

interface MatrixCase {
  id: string;
  description: string;
  global: number;
  perPin?: Array<{ pin: number; speedDegPerSec: number }>;
  writes: Array<{ pin: number; angle: number }>;
  expectHelperCount: number;            // exactly N occurrences of `void _servoMoveAt`
  expectedCalls: Array<{ pin: number; usesHelper: boolean; speed?: number }>;
}

const MATRIX: ReadonlyArray<MatrixCase> = [
  {
    id: 'case_01_global0_single',
    description: 'baseline: global=0, single write pin 32 → R1 byte-identical, helper absent',
    global: 0,
    writes: [{ pin: 32, angle: 90 }],
    expectHelperCount: 0,
    expectedCalls: [{ pin: 32, usesHelper: false }],
  },
  {
    id: 'case_02_global30_single',
    description: 'slow extreme: global=30, single write pin 32 → helper present, call routes via _servoMoveAt(...,30)',
    global: 30,
    writes: [{ pin: 32, angle: 90 }],
    expectHelperCount: 1,
    expectedCalls: [{ pin: 32, usesHelper: true, speed: 30 }],
  },
  {
    id: 'case_03_global180_single',
    description: 'moderate: global=180, single write pin 32 → helper present, call speed=180',
    global: 180,
    writes: [{ pin: 32, angle: 90 }],
    expectHelperCount: 1,
    expectedCalls: [{ pin: 32, usesHelper: true, speed: 180 }],
  },
  {
    id: 'case_04_global360_single',
    description: 'quick: global=360, single write pin 32 → helper present, call speed=360',
    global: 360,
    writes: [{ pin: 32, angle: 90 }],
    expectHelperCount: 1,
    expectedCalls: [{ pin: 32, usesHelper: true, speed: 360 }],
  },
  {
    id: 'case_05_global720_single',
    description: 'fast extreme: global=720, single write pin 32 → helper present, call speed=720',
    global: 720,
    writes: [{ pin: 32, angle: 90 }],
    expectHelperCount: 1,
    expectedCalls: [{ pin: 32, usesHelper: true, speed: 720 }],
  },
  {
    id: 'case_06_perPin60_match',
    description: 'perPin only: global=0 + pin13=60, write pin 13 → helper present, call speed=60',
    global: 0,
    perPin: [{ pin: 13, speedDegPerSec: 60 }],
    writes: [{ pin: 13, angle: 90 }],
    expectHelperCount: 1,
    expectedCalls: [{ pin: 13, usesHelper: true, speed: 60 }],
  },
  {
    id: 'case_07_perPin60_unrelated_pin',
    description: 'perPin scope: global=0 + pin13=60, write pin 32 (unaffected) → helper ABSENT (R1 per-pin preserved for unrelated pins)',
    global: 0,
    perPin: [{ pin: 13, speedDegPerSec: 60 }],
    writes: [{ pin: 32, angle: 90 }],
    expectHelperCount: 0,
    expectedCalls: [{ pin: 32, usesHelper: false }],
  },
  {
    id: 'case_08_explicit_zero_override',
    description: 'explicit 0 override: global=360 + pin32=0, write pin 32 → helper ABSENT for explicitly-0 pin (perPin 0 wins over global>0)',
    global: 360,
    perPin: [{ pin: 32, speedDegPerSec: 0 }],
    writes: [{ pin: 32, angle: 90 }],
    expectHelperCount: 0,
    expectedCalls: [{ pin: 32, usesHelper: false }],
  },
  {
    id: 'case_09_helper_dedup',
    description: 'helper dedup: global=180, 2 writes (pin 13 + pin 32) → both route via helper, helper definition appears EXACTLY ONCE',
    global: 180,
    writes: [
      { pin: 13, angle: 45 },
      { pin: 32, angle: 90 },
    ],
    expectHelperCount: 1,
    expectedCalls: [
      { pin: 13, usesHelper: true, speed: 180 },
      { pin: 32, usesHelper: true, speed: 180 },
    ],
  },
  {
    id: 'case_10_mixed_paths_same_workspace',
    description: 'mixed paths: global=0 + pin13=60, 2 writes (pin 13 via helper + pin 32 direct) → both paths coexist, helper count==1',
    global: 0,
    perPin: [{ pin: 13, speedDegPerSec: 60 }],
    writes: [
      { pin: 13, angle: 45 },
      { pin: 32, angle: 90 },
    ],
    expectHelperCount: 1,
    expectedCalls: [
      { pin: 13, usesHelper: true, speed: 60 },
      { pin: 32, usesHelper: false },
    ],
  },
];

function configureStore(c: MatrixCase): void {
  const perPinConfigs: PinServoConfig[] = (c.perPin || []).map((p) => ({
    pin: p.pin,
    minPulse: BASE_PRESET.servoConfig.minPulse,
    maxPulse: BASE_PRESET.servoConfig.maxPulse,
    speedDegPerSec: p.speedDegPerSec,
  }));
  usePinPresetStore.setState({
    currentPresetId: 'default',
    presets: [
      {
        ...BASE_PRESET,
        servoConfig: {
          ...BASE_PRESET.servoConfig,
          speedDegPerSec: c.global,
          perPinConfigs,
        },
      },
    ],
    isPremiumEnabled: true,
  });
}

function buildXml(writes: Array<{ pin: number; angle: number }>): string {
  // chain N servo_write blocks in arduino_loop via <next>
  const buildChain = (rest: typeof writes): string => {
    if (rest.length === 0) return '';
    const [head, ...tail] = rest;
    const nextChain = buildChain(tail);
    return `<block type="servo_write"><field name="PIN">${head.pin}</field><value name="ANGLE"><block type="math_number"><field name="NUM">${head.angle}</field></block></value>${nextChain ? `<next>${nextChain}</next>` : ''}</block>`;
  };
  // arduino_setup with chained servo_attach calls (one per unique pin)
  const uniquePins = Array.from(new Set(writes.map((w) => w.pin)));
  const buildAttachChain = (pins: number[]): string => {
    if (pins.length === 0) return '';
    const [head, ...tail] = pins;
    const nextChain = buildAttachChain(tail);
    return `<block type="servo_attach"><field name="PIN">${head}</field>${nextChain ? `<next>${nextChain}</next>` : ''}</block>`;
  };
  return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup">
    <statement name="SETUP">${buildAttachChain(uniquePins)}</statement>
  </block>
  <block type="arduino_loop">
    <statement name="LOOP">${buildChain(writes)}</statement>
  </block>
</xml>`;
}

beforeEach(() => {
  // 厳密にデフォルト servoConfig に戻す
  usePinPresetStore.setState({
    currentPresetId: 'default',
    presets: [BASE_PRESET],
    isPremiumEnabled: true,
  });
});

describe('servo_write compile rate matrix — 10/10 (100%) PASS gate (user 要件 #6)', () => {
  describe.each(MATRIX)('$id', (c) => {
    it(`xmlToCpp runs without throwing (compile rate gate: must produce valid cpp text)`, () => {
      configureStore(c);
      expect(() => xmlToCpp(buildXml(c.writes))).not.toThrow();
    });

    it('produces non-empty cpp fullCode (compile rate gate: must emit code)', () => {
      configureStore(c);
      const result = xmlToCpp(buildXml(c.writes));
      expect(result.fullCode.length).toBeGreaterThan(0);
      // arduino_setup body must include servo.attach (sanity, fixture wiring OK)
      expect(result.setupCode).toMatch(/servo\d+\.attach\(/);
    });

    it(`helper definition appears exactly ${c.expectHelperCount} time(s) in fullCode`, () => {
      configureStore(c);
      const result = xmlToCpp(buildXml(c.writes));
      // Session 138 redesign: helper signature is `_servoStart(Servo& s, ...)`,
      // appears exactly once when at least one servo_write resolves speed>0
      const helperCount = (result.fullCode.match(/void _servoStart\(Servo&/g) || []).length;
      expect(helperCount).toBe(c.expectHelperCount);

      // R1 invariant cross-check: when expectHelperCount===0, every helper
      // symbol must be ABSOLUTELY absent — function, state struct, task fn,
      // task handle, xTaskCreate call, the servo_speed_helper marker, and
      // any old (blocking) helper symbol must also be gone. Keeping the
      // assertion set tight prevents drift if the helper internals get
      // tuned in a future refactor.
      if (c.expectHelperCount === 0) {
        const newSymbols = [
          '_servoStart',
          '_servoStates',
          '_servoBackgroundTask',
          '_servoTaskHandle',
          'xTaskCreatePinnedToCore',
          'servo_speed_helper',
        ];
        for (const sym of newSymbols) {
          expect(result.fullCode).not.toContain(sym);
        }
        // Old (Session 137 Phase 3) blocking helper symbols must also be
        // absent — re-introduction would re-surface the parallel-blocking bug.
        expect(result.fullCode).not.toContain('_servoMoveAt');
        expect(result.fullCode).not.toContain('_servoLastAngle');
      }
    });

    it('each servo_write emits the expected call shape (helper or direct, per matrix)', () => {
      configureStore(c);
      const result = xmlToCpp(buildXml(c.writes));
      for (const call of c.expectedCalls) {
        if (call.usesHelper) {
          // helper-routed: _servoStart(servo${pin}, ${pin}, String(${angle}).toInt(), ${speed})
          // — non-blocking, returns immediately, background task drives the motion
          const pattern = new RegExp(`_servoStart\\(servo${call.pin}, ${call.pin}, String\\([^)]+\\)\\.toInt\\(\\), ${call.speed}\\);`);
          expect(result.loopCode).toMatch(pattern);
          // Old blocking call shape must not coexist
          const oldPattern = new RegExp(`_servoMoveAt\\(servo${call.pin}`);
          expect(result.loopCode).not.toMatch(oldPattern);
        } else {
          // direct write: servo${pin}.write(String(${angle}).toInt());
          const pattern = new RegExp(`servo${call.pin}\\.write\\(String\\([^)]+\\)\\.toInt\\(\\)\\);`);
          expect(result.loopCode).toMatch(pattern);
        }
      }
    });
  });
});
