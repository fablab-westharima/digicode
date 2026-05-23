/**
 * servo_write speed-aware cpp emit tests (第137 Phase 3、Option A settings-only)
 *
 * Critical contract (user requirement, R1 mitigation):
 *   - speed === 0 (default) → cpp output byte-identical to pre-Phase-3
 *     emit; the `_servoMoveAt` / `_servoLastAngle` helper is NOT injected
 *     into generator.definitions_ → not present anywhere in the produced
 *     fullCode (no globals overhead, no behavior change vs legacy).
 *   - speed > 0 → cpp routes through `_servoMoveAt(servo${pin}, ${pin},
 *     String(${angle}).toInt(), ${speed});` and the helper definition
 *     appears exactly once in globals.
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

describe('servo_write cpp emit — speed===0 default path (R1 byte-identical verify)', () => {
  it('speed=0: emits direct servo.write, helper NOT injected anywhere in fullCode', () => {
    const result = xmlToCpp(servoWriteXml(32, 90));

    // Direct call appears in loop body (existing pre-Phase-3 emit, unchanged)
    expect(result.loopCode).toContain('servo32.write(String(90).toInt());');

    // Critical R1 invariant: helper symbols ABSOLUTELY MUST NOT appear anywhere
    expect(result.fullCode).not.toContain('_servoMoveAt');
    expect(result.fullCode).not.toContain('_servoLastAngle');
    expect(result.fullCode).not.toContain('servo_speed_helper');
  });

  it('speed=0 with pin 32 ANGLE=180: cpp output matches the pre-Phase-3 emit (helper absent)', () => {
    const result = xmlToCpp(servoWriteXml(32, 180));

    // The Phase-2 emit `  servo${pin}.write(String(${angle}).toInt());\n` is
    // produced by the generator; xmlToCpp strips the leading 2-space indent
    // when extracting loopCode, so the assertion checks the body verbatim.
    expect(result.loopCode).toContain('servo32.write(String(180).toInt());');
    expect(result.fullCode).not.toMatch(/_servoMoveAt|_servoLastAngle/);
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
    expect(result.fullCode).not.toContain('_servoMoveAt');
  });
});

describe('servo_write cpp emit — speed>0 helper-injected path', () => {
  it('speed=180 global: routes through _servoMoveAt and injects helper once', () => {
    setSpeedConfig({ global: 180 });
    const result = xmlToCpp(servoWriteXml(32, 90));

    // Call routes through helper (not direct write)
    expect(result.loopCode).toContain('_servoMoveAt(servo32, 32, String(90).toInt(), 180);');
    expect(result.loopCode).not.toContain('servo32.write(String(90).toInt());');

    // Helper definition appears in globals (between #include and void setup())
    expect(result.globals).toContain('void _servoMoveAt(Servo &s, int pin, int target, int degPerSec)');
    expect(result.globals).toContain('int _servoLastAngle[40]');

    // Helper appears EXACTLY ONCE even if multiple servo_write blocks
    // (deduped via generator.definitions_ key 'servo_speed_helper')
    const helperCount = (result.fullCode.match(/void _servoMoveAt/g) || []).length;
    expect(helperCount).toBe(1);
  });

  it('helper body contains the rate-limit loop structure (delay-driven step)', () => {
    setSpeedConfig({ global: 360 });
    const result = xmlToCpp(servoWriteXml(13, 60));

    // Key structural elements of the rate-limit loop
    expect(result.globals).toContain('int stepMs = 1000 / degPerSec;');
    expect(result.globals).toMatch(/for \(int i = 0; i < steps; i\+\+\)/);
    expect(result.globals).toContain('delay(stepMs);');
    expect(result.globals).toContain('s.write(current);');
  });

  it('per-pin override: pin 13 speed=60, global=0 → pin 13 uses helper; helper injected', () => {
    setSpeedConfig({ global: 0, perPin: [{ pin: 13, speedDegPerSec: 60 }] });
    const result = xmlToCpp(servoWriteXml(13, 90));

    expect(result.loopCode).toContain('_servoMoveAt(servo13, 13, String(90).toInt(), 60);');
    expect(result.globals).toContain('_servoMoveAt(Servo &s');
  });

  it('per-pin scoping: pin 13 has override speed=60 but workspace only uses pin 32 → no helper (R1 preserved for unaffected pins)', () => {
    setSpeedConfig({ global: 0, perPin: [{ pin: 13, speedDegPerSec: 60 }] });
    // workspace ONLY references pin 32 — no servo_write block resolves > 0
    const result = xmlToCpp(servoWriteXml(32, 90));

    expect(result.loopCode).toContain('servo32.write(String(90).toInt());');
    expect(result.fullCode).not.toContain('_servoMoveAt');
  });
});

describe('servo_write cpp emit — mixed speed (one pin global=0, another pin overridden)', () => {
  it('two servo_write blocks: pin 13 (override 60) uses helper, pin 32 (global 0) uses direct write', () => {
    setSpeedConfig({ global: 0, perPin: [{ pin: 13, speedDegPerSec: 60 }] });
    const result = xmlToCpp(twoServoWriteXml(13, 32, 90));

    // pin 13 = via helper
    expect(result.loopCode).toContain('_servoMoveAt(servo13, 13, String(90).toInt(), 60);');
    // pin 32 = direct write (no override, global=0)
    expect(result.loopCode).toContain('servo32.write(String(90).toInt());');
    // helper is injected (because pin 13 needs it) — exactly once
    const helperCount = (result.fullCode.match(/void _servoMoveAt/g) || []).length;
    expect(helperCount).toBe(1);
  });
});
