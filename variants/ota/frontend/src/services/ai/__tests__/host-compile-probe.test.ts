/**
 * Phase X-2 commit 2 host-compile probe (Session 152、 rule 18 + AI-#4 解消)
 *
 * 各 robot block の最小 XML fixture × xmlToCpp 出力 → compile-api endpoint へ submit →
 * 200 OK = lib API 互換性 verify。
 *
 * env var `DIGICODE_COMPILE_API_URL` (例: `https://compile.digital-fab.jp` または
 * `http://localhost:13004` for ML30 tunnel) 必須、 unset 時は全 test skip (CI で safe-by-default)。
 *
 * Phase X-5 cutover (ML30 docker rebuild + image tag pinning) 完了後に env 設定で
 * full probe 実行可能 = X-1.5 + X-2 commit に対する end-to-end runtime verify gate。
 * cutover 前 (ML30 = main-c1162c3、 X-1.5 lib refactor 未反映) は 4-arg
 * `initDcMotorMode(IActuatorChannel*×4)` 旧 signature 期待で fail するため、 skip-by-default が正しい。
 *
 * sample-e2e-probe Check 4 (Phase X-4 で追加予定) と機能重複あり = 後者は canonical sample
 * 単位 macro-probe (68 sample × 1 case)、 本 host-compile-probe は generator emit 単位
 * micro-probe (各 robot block × 最小 fixture)。
 */

import { describe, it, expect } from 'vitest';
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// Side-effect import (block 定義 + forBlock generator 登録)
import '../../../blocks/arduino/core/esp32Blocks';  // arduino_setup / arduino_loop / esp32_delay 等
import '../../../blocks/arduino/robot/bipedBlocks';
import '../../../blocks/arduino/robot/morpherBlocks';
import '../../../blocks/arduino/robot/roverBlocks';
import '../../../blocks/arduino/audio/buzzerBlocks';
import '../../../blocks/arduino/actuator/stepperBlocks';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generator = javascriptGenerator as any;

const COMPILE_API_URL = process.env.DIGICODE_COMPILE_API_URL;

// 各 block の最小 fixture: arduino_setup に init + arduino_loop に 1 motion を配置
interface Fixture {
  id: string;
  description: string;
  blocklyXml: string;
}

const FIXTURES: Fixture[] = [
  {
    id: 'biped_init_only',
    description: 'biped_init (concrete ServoChannel180 × 4 + attachChannels + 0-arg init + buzzer attach)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="biped_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field><field name="PIN_BUZZER">25</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="biped_home_blocking"></block></statement></block></xml>`,
  },
  {
    id: 'biped_walk_blocking',
    description: 'biped_init + biped_walk_blocking(steps, direction, speed)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="biped_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field><field name="PIN_BUZZER">25</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="biped_walk_blocking"><value name="STEPS"><block type="math_number"><field name="NUM">3</field></block></value><field name="DIRECTION">1</field><field name="SPEED">normal</field></block></statement></block></xml>`,
  },
  {
    id: 'biped_gesture',
    description: 'biped_init + biped_gesture(GestureId, millis())',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="biped_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field><field name="PIN_BUZZER">25</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="biped_gesture"><field name="GESTURE">GESTURE_GREETING</field></block></statement></block></xml>`,
  },
  {
    id: 'morpher_init_only',
    description: 'morpher_init (concrete ServoChannel180 × 4 + attachChannels + 0-arg init)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="morpher_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="morpher_home_blocking"></block></statement></block></xml>`,
  },
  {
    id: 'morpher_shift_blocking',
    description: 'morpher_init + morpher_shift_blocking(MorphMode enum, speed)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="morpher_init"><field name="PIN_LL">27</field><field name="PIN_RL">15</field><field name="PIN_LF">14</field><field name="PIN_RF">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="morpher_shift_blocking"><field name="MODE">roll</field><field name="SPEED">normal</field></block></statement></block></xml>`,
  },
  {
    id: 'rover_init_servo_only',
    description: 'rover_init_servo (ContinuousServoChannel × 2 + initServoMode 2-arg pointer)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="rover_init_servo"><field name="PIN_L">14</field><field name="PIN_R">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="rover_stop"></block></statement></block></xml>`,
  },
  {
    id: 'rover_init_dc_motor_only',
    description: 'rover_init_dc_motor (Q-D=A: DcMotorChannel × 2 + initDcMotorMode 2-arg pointer)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="rover_init_dc_motor"><field name="PIN_LA">16</field><field name="PIN_LB">17</field><field name="PIN_RA">18</field><field name="PIN_RB">19</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="rover_forward"><field name="SPEED">50</field></block></statement></block></xml>`,
  },
  {
    id: 'rover_forward',
    description: 'rover_init_servo + rover_forward (lib match: rover.forward(speed))',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="rover_init_servo"><field name="PIN_L">14</field><field name="PIN_R">13</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="rover_forward"><field name="SPEED">50</field></block></statement></block></xml>`,
  },
  {
    id: 'buzzer_play_preset',
    description: 'buzzer_play_preset (IBuzzer& getBuzzer() reference + playPreset BEEP_<intent>)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="buzzer_play_preset"><field name="PIN">25</field><field name="PRESET">BEEP_STARTUP</field></block></statement></block></xml>`,
  },
  {
    id: 'buzzer_play_tone',
    description: 'buzzer_play_tone (IBuzzer abstract method match: playTone(int, int))',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="buzzer_play_tone"><field name="PIN">25</field><value name="FREQ"><block type="math_number"><field name="NUM">440</field></block></value><value name="DURATION"><block type="math_number"><field name="NUM">200</field></block></value></block></statement></block></xml>`,
  },
  {
    id: 'stepper_init_4wire',
    description: 'stepper_init_4wire (F-7: lib 4-arg ctor, no mode enum)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="stepper_init_4wire"><field name="IN1">13</field><field name="IN2">12</field><field name="IN3">14</field><field name="IN4">27</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="stepper_stop"></block></statement></block></xml>`,
  },
  {
    id: 'stepper_init_driver',
    description: 'stepper_init_driver (F-10 + Q-G=ζ: lib 3-arg DRIVER ctor with enable pin)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="stepper_init_driver"><field name="STEP">14</field><field name="DIR">27</field><field name="EN">26</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="stepper_stop"></block></statement></block></xml>`,
  },
  {
    id: 'stepper_init_hw',
    description: 'stepper_init_hw (StepperHwChannel 3-arg, FastAccelStepper backed)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="stepper_init_hw"><field name="STEP">14</field><field name="DIR">27</field><field name="EN">26</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="stepper_stop"></block></statement></block></xml>`,
  },
  {
    id: 'stepper_step_blocking',
    description: 'stepper_step_blocking (Q-F=ε: polling loop emit replacing waitUntilIdle)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="stepper_init_driver"><field name="STEP">14</field><field name="DIR">27</field><field name="EN">26</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="stepper_step_blocking"><value name="STEPS"><block type="math_number"><field name="NUM">1000</field></block></value></block></statement></block></xml>`,
  },
  {
    id: 'stepper_rotate_blocking',
    description: 'stepper_rotate_blocking (Q-F=ε: polling loop emit)',
    blocklyXml: `<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup" x="50" y="50"><statement name="SETUP"><block type="stepper_init_4wire"><field name="IN1">13</field><field name="IN2">12</field><field name="IN3">14</field><field name="IN4">27</field></block></statement></block><block type="arduino_loop" x="50" y="250"><statement name="LOOP"><block type="stepper_rotate_blocking"><value name="ANGLE"><block type="math_number"><field name="NUM">90</field></block></value></block></statement></block></xml>`,
  },
];

function xmlToCpp(xml: string): string {
  const ws = new Blockly.Workspace();
  try {
    const dom = Blockly.utils.xml.textToDom(xml);
    Blockly.Xml.domToWorkspace(dom, ws);
    return generator.workspaceToCode(ws);
  } finally {
    ws.dispose();
  }
}

describe('Phase X-2 commit 2: host-compile probe (env DIGICODE_COMPILE_API_URL gated)', () => {
  if (!COMPILE_API_URL) {
    it.skip('compile API URL not set, skipping (set DIGICODE_COMPILE_API_URL env to run; Phase X-5 cutover prerequisite)', () => {});
    return;
  }

  // env 設定時のみ実行 = Phase X-5 cutover 完了後の verify gate
  for (const fixture of FIXTURES) {
    it(`${fixture.id}: ${fixture.description} → compile 200 OK`, async () => {
      const cpp = xmlToCpp(fixture.blocklyXml);
      expect(cpp).toBeTruthy();
      expect(cpp.length).toBeGreaterThan(0);

      // compile-api 経由で submit (capi src/server.ts:83 = POST /api/compile)
      const response = await fetch(`${COMPILE_API_URL}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: cpp,
          board: 'esp32:esp32:esp32',
        }),
        // cold compile ~100-200s 想定 (capi server.ts コメント cited、 PIO cache miss)
        signal: AbortSignal.timeout(240000),
      });

      expect(response.status, `${fixture.id}: HTTP status not 200, response body: ${await response.text().catch(() => 'unreadable')}`).toBe(200);
    }, 300000); // vitest it() 3rd arg = timeout(ms) は number overload (object {timeout} は overload 不一致)
  }
});
