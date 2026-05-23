/**
 * controls_for direction-aware loop condition tests (Session 138 hotfix)
 *
 * Bug: builtinBlockOverrides.ts:64 was emitting hardcoded `var <= to` for
 * the C++ `controls_for` override regardless of the sign of `by`. With a
 * negative `by` (descending loop, e.g. 180 -> 0 by -1), `var <= to` is
 * false from the first iteration so the loop body never executes.
 *
 * AI-reported reproduction: prompt "33,34ピンのサーボを同時に0-180動かす"
 * generated a forward `controls_for` (0..180 by 1) and a backward
 * `controls_for` (180..0 by -1). The forward loop ran; the backward loop
 * silently skipped, so the servo only moved one way.
 *
 * Fix: runtime ternary on the sign of `by`, mirroring servo_sweep
 * (servoBlocks.ts:256). by===0 produces an infinite loop, matching
 * Blockly's stock JS generator semantics.
 *
 * Strategy: drive the same xmlToCpp pipeline that EditorPage uses so the
 * test exercises the real Blockly generator wiring. Each case asserts
 * (1) the ternary is present and (2) the old hardcoded-`<=` shape is
 * NOT present.
 */
import { describe, it, expect } from 'vitest';
import { xmlToCpp } from '../../../scripts/probabilistic-debug/lib/cpp-generator';

function controlsForXml(opts: {
  varName: string;
  from: string;
  to: string;
  by: string;
  byVariable?: boolean; // true => BY is variables_get instead of math_number
}): string {
  const byBlock = opts.byVariable
    ? `<block type="variables_get"><field name="VAR">${opts.by}</field></block>`
    : `<block type="math_number"><field name="NUM">${opts.by}</field></block>`;
  return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_loop">
    <statement name="LOOP">
      <block type="controls_for">
        <field name="VAR">${opts.varName}</field>
        <value name="FROM"><block type="math_number"><field name="NUM">${opts.from}</field></block></value>
        <value name="TO"><block type="math_number"><field name="NUM">${opts.to}</field></block></value>
        <value name="BY">${byBlock}</value>
        <statement name="DO">
          <block type="esp32_delay">
            <value name="TIME"><block type="math_number"><field name="NUM">10</field></block></value>
          </block>
        </statement>
      </block>
    </statement>
  </block>
</xml>`;
}

function forwardThenBackwardXml(): string {
  // User-reported regression shape: forward sweep (0..180 by 1) followed by
  // backward sweep (180..0 by -1) inside the same arduino_loop. With the
  // pre-fix generator, the backward loop emitted `angle <= 0` and silently
  // skipped — servo only moved one way.
  return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="arduino_loop">
    <statement name="LOOP">
      <block type="controls_for">
        <field name="VAR">angle</field>
        <value name="FROM"><block type="math_number"><field name="NUM">0</field></block></value>
        <value name="TO"><block type="math_number"><field name="NUM">180</field></block></value>
        <value name="BY"><block type="math_number"><field name="NUM">1</field></block></value>
        <statement name="DO">
          <block type="esp32_delay">
            <value name="TIME"><block type="math_number"><field name="NUM">15</field></block></value>
          </block>
        </statement>
        <next>
          <block type="controls_for">
            <field name="VAR">angle</field>
            <value name="FROM"><block type="math_number"><field name="NUM">180</field></block></value>
            <value name="TO"><block type="math_number"><field name="NUM">0</field></block></value>
            <value name="BY"><block type="math_number"><field name="NUM">-1</field></block></value>
            <statement name="DO">
              <block type="esp32_delay">
                <value name="TIME"><block type="math_number"><field name="NUM">15</field></block></value>
              </block>
            </statement>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`;
}

describe('controls_for direction-aware loop condition (Session 138 hotfix)', () => {
  it('ascending literal (from=0 to=10 by=1): runtime ternary emitted, `<=` path taken at runtime', () => {
    const result = xmlToCpp(
      controlsForXml({ varName: 'i', from: '0', to: '10', by: '1' }),
    );

    // Ternary must be present — direction is decided at runtime regardless
    // of whether `by` happens to be a literal.
    expect(result.loopCode).toContain('((1) >= 0) ? i <= 10 : i >= 10');

    // The pre-fix hardcoded shape (without ternary guard) MUST NOT appear.
    expect(result.loopCode).not.toMatch(/for \(int i = 0; i <= 10; i \+= 1\)/);
  });

  it('descending literal (from=180 to=0 by=-1): runtime ternary picks `>=` path — the bug repro case', () => {
    const result = xmlToCpp(
      controlsForXml({ varName: 'angle', from: '180', to: '0', by: '-1' }),
    );

    // With the fix, the ternary picks `angle >= 0` at runtime and the loop
    // body executes 181 times (180, 179, ..., 0).
    expect(result.loopCode).toContain('((-1) >= 0) ? angle <= 0 : angle >= 0');

    // 🔴 Critical regression guard: the pre-fix output shape (which never
    // entered the loop) MUST NOT reappear.
    expect(result.loopCode).not.toMatch(/for \(int angle = 180; angle <= 0; angle \+= -1\)/);
  });

  it('ascending with variable BY (variables_get): ternary preserves runtime direction', () => {
    const result = xmlToCpp(
      controlsForXml({
        varName: 'count',
        from: '0',
        to: '100',
        by: 'step',
        byVariable: true,
      }),
    );

    // `by` is now a variable reference; the ternary must be on the variable.
    expect(result.loopCode).toMatch(/\(\(step\) >= 0\) \? count <= 100 : count >= 100/);
  });

  it('user-reported regression: forward + backward sweep both produce a ternary, neither skips silently', () => {
    const result = xmlToCpp(forwardThenBackwardXml());

    // Both loops must emit a ternary — pre-fix, only forward worked and
    // backward silently produced `angle <= 0` which never entered.
    const ternaryMatches = result.loopCode.match(/\(\([^)]+\) >= 0\) \?/g) || [];
    expect(ternaryMatches.length).toBe(2);

    // Forward (by=1) ternary
    expect(result.loopCode).toContain('((1) >= 0) ? angle <= 180 : angle >= 180');
    // Backward (by=-1) ternary — the bug fix
    expect(result.loopCode).toContain('((-1) >= 0) ? angle <= 0 : angle >= 0');

    // Pre-fix broken shape (the actual bug surface) MUST NOT reappear.
    expect(result.loopCode).not.toMatch(/for \(int angle = 180; angle <= 0; angle \+= -1\)/);
  });
});
