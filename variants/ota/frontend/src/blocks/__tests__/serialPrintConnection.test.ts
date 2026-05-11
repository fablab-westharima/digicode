/**
 * BUG-079 regression test (2026-05-12, Session 106).
 *
 * Verifies `esp32_serial_print` / `esp32_serial_println` VALUE input
 * setCheck = ['Number', 'String', 'Boolean']:
 *   - accepts text (String) / math_number (Number) / array_get (Number)
 *   - accepts variables_get (Blockly any-typed output is compatible with typed input)
 *   - REJECTS array_content (Array output) — the case_0130 fix
 *
 * Round 5 case_0130 fail: `Serial.println({0, 0, 0})` brace-enclosed
 * initializer list could not match any HardwareSerial::println overload.
 * Fix: type-check at Blockly connection layer to block UI-level connection.
 */
import { describe, it, expect } from 'vitest';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';

import '../arduino/core/esp32Blocks';
import '../arduino/data/arrayBlocks';

describe('BUG-079: esp32_serial_print/println VALUE input setCheck', () => {
  function canConnect(workspace: Blockly.Workspace, valueBlockType: string, sinkBlockType: string): boolean {
    const valueBlock = workspace.newBlock(valueBlockType);
    const sinkBlock = workspace.newBlock(sinkBlockType);
    const output = valueBlock.outputConnection;
    const input = sinkBlock.getInput('VALUE')?.connection;
    expect(output).not.toBeNull();
    expect(input).not.toBeNull();
    return workspace.connectionChecker.canConnect(output, input!, false);
  }

  for (const sink of ['esp32_serial_print', 'esp32_serial_println']) {
    describe(sink, () => {
      it('accepts text (String output)', () => {
        const ws = new Blockly.Workspace();
        expect(canConnect(ws, 'text', sink)).toBe(true);
      });

      it('accepts math_number (Number output)', () => {
        const ws = new Blockly.Workspace();
        expect(canConnect(ws, 'math_number', sink)).toBe(true);
      });

      it('accepts variables_get (untyped output is universally compatible)', () => {
        const ws = new Blockly.Workspace();
        ws.createVariable('count');
        const varBlock = ws.newBlock('variables_get');
        varBlock.setFieldValue(ws.getVariable('count')!.getId(), 'VAR');
        const sinkBlock = ws.newBlock(sink);
        const output = varBlock.outputConnection;
        const input = sinkBlock.getInput('VALUE')?.connection;
        expect(ws.connectionChecker.canConnect(output, input!, false)).toBe(true);
      });

      it('REJECTS array_content (Array output) — BUG-079 case_0130 fix', () => {
        const ws = new Blockly.Workspace();
        expect(canConnect(ws, 'array_content', sink)).toBe(false);
      });
    });
  }
});
