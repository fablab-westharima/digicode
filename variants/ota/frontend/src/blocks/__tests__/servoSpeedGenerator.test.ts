/**
 * servo_write speed-aware cpp emit tests (Session 138 redesign: 非同期並列動作)
 *
 * Session 138 (2026-05-24): the original blocking helper (`_servoMoveAt` with
 * delay-driven for-loop, Session 137 Phase 3 commit f658c30) was unusable for
 * the actual founding use case (humanoid robot left+right leg simultaneous
 * sweep) because each `_servoMoveAt` call blocked the loop for steps×stepMs.
 * The helper is now a FreeRTOS background task: `_servoStart()` sets the
 * target and returns immediately; a 1 ms tick task advances every active
 * pin's current angle in parallel, fully concurrent with user delay() and
 * other blocking operations on the Arduino main loop.
 *
 * Critical contract (user requirement, R1 mitigation):
 *   - speed === 0 (default) → cpp output byte-identical to pre-Phase-3
 *     emit; the helper (struct, task fn, _servoStart) is NOT injected
 *     into generator.definitions_ → not present anywhere in the produced
 *     fullCode (no globals overhead, no behavior change vs legacy).
 *   - speed > 0 → cpp routes through `_servoStart(servo${pin}, ${pin},
 *     String(${angle}).toInt(), ${speed});` and the helper definition
 *     appears exactly once in globals (struct + task fn + _servoStart).
 *   - Per-pin override resolves through getServoSpeed(pinNum) so two
 *     servo_write blocks in the same workspace can take different paths.
 *
 * Strategy: drive the same xmlToCpp pipeline that EditorPage uses
 * (scripts/probabilistic-debug/lib/cpp-generator.ts) so the test runs
 * against the real Blockly generator wiring + setups_ injection. Reset
 * pinPresetStore before each case to a known servoConfig.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { xmlToCpp } from '../../../scripts/probabilistic-debug/lib/cpp-generator';
import { usePinPresetStore, type PinPreset, type PinServoConfig } from '@/stores/pinPresetStore';

const BASE_PRESET: PinPreset = usePinPresetStore.getState().presets[0];

function setSpeedConfig(opts: {
  global?: number;
  perPin?: Array<{ pin: number; speedDegPerSec: number }>;
}): void {
  const perPinConfigs: PinServoConfig[] = (opts.perPin || []).map((p) => ({
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
          speedDegPerSec: opts.global ?? 0,
          perPinConfigs,
        },
      },
    ],
    isPremiumEnabled: true,
  });
}

function servoWriteXml(pin: number, angle: number): string {
  return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup">
    <statement name="SETUP">
      <block type="servo_attach">
        <field name="PIN">${pin}</field>
      </block>
    </statement>
  </block>
  <block type="arduino_loop">
    <statement name="LOOP">
      <block type="servo_write">
        <field name="PIN">${pin}</field>
        <value name="ANGLE"><block type="math_number"><field name="NUM">${angle}</field></block></value>
      </block>
    </statement>
  </block>
</xml>`;
}

function twoServoWriteXml(pinA: number, pinB: number, angle: number): string {
  return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_setup">
    <statement name="SETUP">
      <block type="servo_attach">
        <field name="PIN">${pinA}</field>
        <next>
          <block type="servo_attach">
            <field name="PIN">${pinB}</field>
          </block>
        </next>
      </block>
    </statement>
  </block>
  <block type="arduino_loop">
    <statement name="LOOP">
      <block type="servo_write">
        <field name="PIN">${pinA}</field>
        <value name="ANGLE"><block type="math_number"><field name="NUM">${angle}</field></block></value>
        <next>
          <block type="servo_write">
            <field name="PIN">${pinB}</field>
            <value name="ANGLE"><block type="math_number"><field name="NUM">${angle}</field></block></value>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`;
}

beforeEach(() => {
  // 厳密にデフォルト servoConfig に戻す (speedDegPerSec: 0、perPinConfigs: 空)
  setSpeedConfig({ global: 0, perPin: [] });
});

// Symbols that the new (non-blocking, FreeRTOS-task) helper introduces.
// All must be absent in R1 (speed=0) cases and all present (helper count
// == 1 of each) in helper-injected cases. Asserting on a set rather than
// a single function name keeps the test from going stale if the helper
// internals get tuned (e.g. stack size, task name) — only the structural
// shape is the contract.
const HELPER_SYMBOLS = [
  '_servoStart',
  '_servoStates',
  '_servoBackgroundTask',
  '_servoTaskHandle',
  'xTaskCreatePinnedToCore',
];

describe('servo_write cpp emit — speed===0 default path (R1 byte-identical verify)', () => {
  it('speed=0: emits direct servo.write, helper symbols ABSOLUTELY absent in fullCode', () => {
    const result = xmlToCpp(servoWriteXml(32, 90));

    // Direct call appears in loop body (existing pre-Phase-3 emit, unchanged)
    expect(result.loopCode).toContain('servo32.write(String(90).toInt());');

    // Critical R1 invariant: every helper symbol must be absent everywhere
    for (const sym of HELPER_SYMBOLS) {
      expect(result.fullCode).not.toContain(sym);
    }
    expect(result.fullCode).not.toContain('servo_speed_helper');
  });

  it('speed=0 with pin 32 ANGLE=180: cpp output matches the pre-Phase-3 emit (helper absent)', () => {
    const result = xmlToCpp(servoWriteXml(32, 180));

    // The Phase-2 emit `  servo${pin}.write(String(${angle}).toInt());\n` is
    // produced by the generator; xmlToCpp strips the leading 2-space indent
    // when extracting loopCode, so the assertion checks the body verbatim.
    expect(result.loopCode).toContain('servo32.write(String(180).toInt());');
    expect(result.fullCode).not.toMatch(/_servoStart|_servoStates|_servoBackgroundTask/);
  });

  it('legacy state (speedDegPerSec undefined) behaves identical to speed=0', () => {
    // Simulate legacy v8 state where servoConfig has no speedDegPerSec field
    usePinPresetStore.setState({
      currentPresetId: 'default',
      presets: [
        {
          ...BASE_PRESET,
          servoConfig: {
            servoType: '180',
            minPulse: 500,
            maxPulse: 2400,
            // speedDegPerSec: 意図的に省略
          },
        },
      ],
      isPremiumEnabled: true,
    });

    const result = xmlToCpp(servoWriteXml(13, 45));
    expect(result.loopCode).toContain('servo13.write(String(45).toInt());');
    expect(result.fullCode).not.toContain('_servoStart');
  });
});

describe('servo_write cpp emit — speed>0 helper-injected path (non-blocking, FreeRTOS task)', () => {
  it('speed=180 global: routes through _servoStart and injects helper once', () => {
    setSpeedConfig({ global: 180 });
    const result = xmlToCpp(servoWriteXml(32, 90));

    // Call routes through helper (not direct write)
    expect(result.loopCode).toContain('_servoStart(servo32, 32, String(90).toInt(), 180);');
    expect(result.loopCode).not.toContain('servo32.write(String(90).toInt());');

    // Helper definition appears in globals (between #include and void setup())
    expect(result.globals).toContain('void _servoStart(Servo& s, int pin, int target, int degPerSec)');
    expect(result.globals).toContain('struct _ServoState');
    expect(result.globals).toContain('_ServoState _servoStates[40]');
    expect(result.globals).toContain('TaskHandle_t _servoTaskHandle');

    // Helper definition appears EXACTLY ONCE even if multiple servo_write
    // blocks (deduped via generator.definitions_ key 'servo_speed_helper')
    const helperCount = (result.fullCode.match(/void _servoStart\(Servo&/g) || []).length;
    expect(helperCount).toBe(1);
  });

  it('helper body contains the non-blocking FreeRTOS task structure (millis-driven, 1 ms tick, lazy spawn)', () => {
    setSpeedConfig({ global: 360 });
    const result = xmlToCpp(servoWriteXml(13, 60));

    // Key structural elements of the non-blocking design
    expect(result.globals).toContain('void _servoBackgroundTask(void*');
    expect(result.globals).toContain('vTaskDelay(1 / portTICK_PERIOD_MS)');
    expect(result.globals).toContain('xTaskCreatePinnedToCore(_servoBackgroundTask');
    // Task is lazy-spawned only on the first _servoStart call (nullptr guard)
    expect(result.globals).toContain('if (_servoTaskHandle == nullptr)');
    // State machine: 1° step per stepMs interval, no blocking delay
    expect(result.globals).toMatch(/st\.current \+= \(st\.current < st\.target\) \? 1 : -1/);
    expect(result.globals).toContain('st.servo->write(st.current)');
    // 🔴 Critical: the old blocking `delay(stepMs)` MUST be gone — its
    // presence in the helper body is the original Bug surface (humanoid
    // left/right leg can't move in parallel because each call blocks
    // for steps×stepMs ms).
    expect(result.globals).not.toMatch(/delay\(stepMs\)/);
    // Old helper symbols must not reappear
    expect(result.globals).not.toContain('_servoMoveAt');
    expect(result.globals).not.toContain('_servoLastAngle');
  });

  it('per-pin override: pin 13 speed=60, global=0 → pin 13 uses helper; helper injected', () => {
    setSpeedConfig({ global: 0, perPin: [{ pin: 13, speedDegPerSec: 60 }] });
    const result = xmlToCpp(servoWriteXml(13, 90));

    expect(result.loopCode).toContain('_servoStart(servo13, 13, String(90).toInt(), 60);');
    expect(result.globals).toContain('void _servoStart(Servo& s');
  });

  it('per-pin scoping: pin 13 has override speed=60 but workspace only uses pin 32 → no helper (R1 preserved for unaffected pins)', () => {
    setSpeedConfig({ global: 0, perPin: [{ pin: 13, speedDegPerSec: 60 }] });
    // workspace ONLY references pin 32 — no servo_write block resolves > 0
    const result = xmlToCpp(servoWriteXml(32, 90));

    expect(result.loopCode).toContain('servo32.write(String(90).toInt());');
    for (const sym of HELPER_SYMBOLS) {
      expect(result.fullCode).not.toContain(sym);
    }
  });
});

describe('servo_write cpp emit — mixed speed (one pin global=0, another pin overridden)', () => {
  it('two servo_write blocks: pin 13 (override 60) uses helper, pin 32 (global 0) uses direct write', () => {
    setSpeedConfig({ global: 0, perPin: [{ pin: 13, speedDegPerSec: 60 }] });
    const result = xmlToCpp(twoServoWriteXml(13, 32, 90));

    // pin 13 = via helper (non-blocking _servoStart, returns immediately)
    expect(result.loopCode).toContain('_servoStart(servo13, 13, String(90).toInt(), 60);');
    // pin 32 = direct write (no override, global=0)
    expect(result.loopCode).toContain('servo32.write(String(90).toInt());');
    // helper is injected (because pin 13 needs it) — exactly once
    const helperCount = (result.fullCode.match(/void _servoStart\(Servo&/g) || []).length;
    expect(helperCount).toBe(1);
  });

  it('two servo_write blocks with same global speed: BOTH route via _servoStart (non-blocking parallel — the founding use case)', () => {
    // This is the humanoid-robot motivating case: left + right leg must
    // sweep together. With the old blocking helper, the right leg only
    // started moving after the left finished. With FreeRTOS task, both
    // _servoStart calls return immediately and the background task drives
    // them in parallel.
    setSpeedConfig({ global: 180 });
    const result = xmlToCpp(twoServoWriteXml(13, 32, 90));

    expect(result.loopCode).toContain('_servoStart(servo13, 13, String(90).toInt(), 180);');
    expect(result.loopCode).toContain('_servoStart(servo32, 32, String(90).toInt(), 180);');
    // Helper still deduped to 1 instance
    const helperCount = (result.fullCode.match(/void _servoStart\(Servo&/g) || []).length;
    expect(helperCount).toBe(1);
    // No blocking delay anywhere in the helper body
    expect(result.globals).not.toMatch(/delay\(stepMs\)/);
  });
});
