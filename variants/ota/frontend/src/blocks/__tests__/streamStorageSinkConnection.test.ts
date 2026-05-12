/**
 * BUG-079 cluster regression test (Session 110, commit 1 `263c20d`).
 *
 * Verifies the setCheck = ['Number', 'String', 'Boolean'] applied to 17
 * value inputs across 8 block files (G-1〜G-15) by the same commit:
 *
 *   - Stream-like consumers (UART2, LCD, TFT, BLE NUS/GATT, WebSocket
 *     client/server, ESP-NOW)
 *   - Storage sinks (SD write/CSV columns, LittleFS write)
 *   - NVS (Preferences put value, get default)
 *
 * Each (block, input) pair is checked against 4 outputs:
 *   - text (String) → accept
 *   - math_number (Number) → accept
 *   - variables_get (untyped, Blockly v10 universal-compatible) → accept
 *   - array_content (Array) → REJECT — the BUG-079 case_0130 invariant
 *
 * Mirrors `serialPrintConnection.test.ts` (Session 106, BUG-079 fix for
 * esp32_serial_print/println). Same connection-checker layer, same
 * invariant. Round 5 case_0130 produced `Serial.println({0,0,0})` and
 * any sibling with setCheck(null) on a Stream/storage value input was
 * a latent same-class hole until G-1〜G-15.
 */
import { describe, it, expect } from 'vitest';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';

// Import all 8 block files whose setCheck was tightened in commit `263c20d`.
import '../arduino/communication/uart2Blocks';
import '../arduino/communication/bleBlocks';
import '../arduino/communication/webSocketBlocks';
import '../arduino/communication/espnowBlocks';
import '../arduino/display/lcdBlocks';
import '../arduino/display/tftBlocks';
import '../arduino/storage/storageFsBlocks';
import '../arduino/storage/storageNvsBlocks';
// `array_content` provider (the only block emitting 'Array' output — the
// hostile case that BUG-079 + G-1〜G-15 reject at connection time).
import '../arduino/data/arrayBlocks';

interface Target {
  readonly type: string;
  readonly input: string;
  readonly label?: string; // human label when type+input alone is ambiguous (sd_csv_append × 3)
}

const TARGETS: ReadonlyArray<Target> = [
  // Group I — Stream sink raw passthrough (G-1〜G-4)
  { type: 'serial2_print', input: 'TEXT' },
  { type: 'serial2_println', input: 'TEXT' },
  { type: 'lcd_print', input: 'TEXT' },
  { type: 'tft_print', input: 'TEXT' },

  // Group II — String() wrap consumers (G-5〜G-8)
  { type: 'ble_uart_write', input: 'TEXT' },
  { type: 'ble_notify', input: 'VALUE' },
  { type: 'websocket_send', input: 'TEXT' },
  { type: 'websocket_server_send', input: 'VALUE' },

  // Group III — Storage / NVS (G-9〜G-13)
  { type: 'sd_write', input: 'CONTENT' },
  { type: 'sd_csv_append', input: 'COL1', label: 'sd_csv_append(COL1)' },
  { type: 'sd_csv_append', input: 'COL2', label: 'sd_csv_append(COL2)' },
  { type: 'sd_csv_append', input: 'COL3', label: 'sd_csv_append(COL3)' },
  { type: 'fs_write', input: 'CONTENT' },
  { type: 'preferences_put', input: 'VALUE' },
  { type: 'preferences_get', input: 'DEFAULT' },

  // Group IV — setCheck newly added (was omitted entirely) (G-14, G-15)
  { type: 'espnow_send', input: 'DATA' },
  { type: 'espnow_broadcast', input: 'DATA' },
];

function inputConnection(sinkBlock: Blockly.Block, inputName: string): Blockly.Connection {
  const input = sinkBlock.getInput(inputName);
  expect(input, `Input '${inputName}' missing on block '${sinkBlock.type}'`).not.toBeNull();
  expect(input!.connection, `Input '${inputName}' has no connection on '${sinkBlock.type}'`).not.toBeNull();
  return input!.connection!;
}

function canConnectFromBlock(
  workspace: Blockly.Workspace,
  valueBlockType: string,
  sinkBlockType: string,
  inputName: string,
): boolean {
  const valueBlock = workspace.newBlock(valueBlockType);
  const sinkBlock = workspace.newBlock(sinkBlockType);
  const output = valueBlock.outputConnection;
  expect(output, `Block '${valueBlockType}' has no output connection`).not.toBeNull();
  const input = inputConnection(sinkBlock, inputName);
  return workspace.connectionChecker.canConnect(output, input, false);
}

function canConnectFromVariable(
  workspace: Blockly.Workspace,
  sinkBlockType: string,
  inputName: string,
): boolean {
  workspace.createVariable('x');
  const varBlock = workspace.newBlock('variables_get');
  varBlock.setFieldValue(workspace.getVariable('x')!.getId(), 'VAR');
  const sinkBlock = workspace.newBlock(sinkBlockType);
  const output = varBlock.outputConnection;
  expect(output).not.toBeNull();
  const input = inputConnection(sinkBlock, inputName);
  return workspace.connectionChecker.canConnect(output, input, false);
}

describe('BUG-079 cluster (G-1〜G-15): Stream/storage/NVS value input setCheck', () => {
  for (const target of TARGETS) {
    const label = target.label ?? `${target.type}(${target.input})`;
    describe(label, () => {
      it('accepts text (String output)', () => {
        const ws = new Blockly.Workspace();
        expect(canConnectFromBlock(ws, 'text', target.type, target.input)).toBe(true);
      });

      it('accepts math_number (Number output)', () => {
        const ws = new Blockly.Workspace();
        expect(canConnectFromBlock(ws, 'math_number', target.type, target.input)).toBe(true);
      });

      it('accepts variables_get (untyped output, Blockly v10 universal-compatible)', () => {
        const ws = new Blockly.Workspace();
        expect(canConnectFromVariable(ws, target.type, target.input)).toBe(true);
      });

      it('REJECTS array_content (Array output) — BUG-079 cluster invariant', () => {
        const ws = new Blockly.Workspace();
        expect(canConnectFromBlock(ws, 'array_content', target.type, target.input)).toBe(false);
      });
    });
  }
});
