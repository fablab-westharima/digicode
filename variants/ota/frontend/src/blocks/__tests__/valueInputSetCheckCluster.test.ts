/**
 * case 19 cluster T-1 regression test (Session 111, commit 1 `08f0202`).
 *
 * Verifies the setCheck tightening applied to 91 `appendValueInput` sites
 * across 24 block files by the same commit:
 *
 *   - Group N (78 sites): Number-only sinks → setCheck('Number')
 *   - Group M (13 sites): Mixed sinks (String wrap or Print:: overload) →
 *     setCheck(['Number', 'String', 'Boolean'])
 *
 * `array_set.VALUE` has 2 source-code sites (init + updateShape_ mutator)
 * but exposes 1 user-facing input → 1 test target. Total: 90 unique
 * (block, input) pairs × 4 connection patterns = 360 cases.
 *
 * Each pair is checked against 4 outputs:
 *   - text (String) → accept for Group M, REJECT for Group N
 *   - math_number (Number) → accept (both groups)
 *   - variables_get (untyped, Blockly v10 universal-compatible) → accept (both)
 *   - array_content (Array) → REJECT (both groups) — case 19 cluster invariant
 *
 * Mirrors `streamStorageSinkConnection.test.ts` (Session 110, G-1〜G-15) and
 * `serialPrintConnection.test.ts` (Session 106, BUG-079). Same connection-
 * checker layer, same case 19 defense pattern. UI 層 type-leak prevention
 * relies on this test surviving future setCheck loosening.
 */
import { describe, it, expect } from 'vitest';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';

// Import all 24 block files whose setCheck was tightened in commit `08f0202`.
import '../arduino/actuator/motorBlocks';
import '../arduino/actuator/servoBlocks';
import '../arduino/actuator/stepperBlocks';
import '../arduino/audio/dfplayerBlocks';
import '../arduino/communication/arduinoHABlocks';
import '../arduino/communication/azureIotBlocks';
import '../arduino/communication/bleBlocks';
import '../arduino/communication/googleServicesBlocks';
import '../arduino/communication/i2cSpiBlocks';
import '../arduino/communication/iotCloudBlocks';
import '../arduino/communication/mqttBlocks';
import '../arduino/core/interruptBlocks';
import '../arduino/data/arrayBlocks';
import '../arduino/display/displayBlocks';
import '../arduino/display/lcdBlocks';
import '../arduino/display/oledSsd1306Blocks';
import '../arduino/display/tftBlocks';
import '../arduino/m5stack/m5stackBlocks';
import '../arduino/robot/differentialDriveBlocks';
import '../arduino/robot/humanoidBlocks';
import '../arduino/robot/transformBlocks';
import '../arduino/sensor/lineSensorBlocks';
import '../arduino/sensor/qtrSensorBlocks';
import '../arduino/sensor/sensorMotionBlocks';

type Group = 'N' | 'M';

interface Target {
  readonly type: string;
  readonly input: string;
  readonly group: Group;
  readonly label?: string;
}

const TARGETS: ReadonlyArray<Target> = [
  // ===== Group N (Number-only sinks, 78 sites) =====

  // actuator
  { type: 'motor_move', input: 'SPEED', group: 'N' },
  { type: 'motor_speed', input: 'SPEED', group: 'N' },
  { type: 'servo_write', input: 'ANGLE', group: 'N' },
  { type: 'servo_sweep', input: 'START', group: 'N' },
  { type: 'servo_sweep', input: 'END', group: 'N', label: 'servo_sweep(END)' },
  { type: 'servo_sweep', input: 'SPEED', group: 'N', label: 'servo_sweep(SPEED)' },
  { type: 'stepper_move', input: 'STEPS', group: 'N' },
  { type: 'stepper_rotate', input: 'ANGLE', group: 'N' },

  // audio
  { type: 'dfplayer_play', input: 'TRACK', group: 'N' },
  { type: 'dfplayer_volume', input: 'VOL', group: 'N' },

  // communication: HA / BLE / I2C-SPI / MQTT
  { type: 'ha_number_create', input: 'MIN', group: 'N' },
  { type: 'ha_number_create', input: 'MAX', group: 'N', label: 'ha_number_create(MAX)' },
  { type: 'ha_number_create', input: 'STEP', group: 'N', label: 'ha_number_create(STEP)' },
  { type: 'ble_beacon_broadcast', input: 'MAJOR', group: 'N' },
  { type: 'ble_beacon_broadcast', input: 'MINOR', group: 'N', label: 'ble_beacon_broadcast(MINOR)' },
  { type: 'ble_scan_start', input: 'DURATION', group: 'N' },
  { type: 'i2c_write', input: 'ADDR', group: 'N' },
  { type: 'i2c_write', input: 'DATA', group: 'N', label: 'i2c_write(DATA)' },
  { type: 'i2c_write_register', input: 'ADDR', group: 'N', label: 'i2c_write_register(ADDR)' },
  { type: 'i2c_write_register', input: 'REG', group: 'N' },
  { type: 'i2c_write_register', input: 'VALUE', group: 'N', label: 'i2c_write_register(VALUE)' },
  { type: 'spi_transfer', input: 'DATA', group: 'N', label: 'spi_transfer(DATA)' },
  { type: 'mqtt_setup', input: 'PORT', group: 'N' },
  { type: 'mqtt_set_buffer_size', input: 'SIZE', group: 'N' },
  { type: 'mqtt_set_keepalive', input: 'SECONDS', group: 'N' },

  // core
  { type: 'ticker_attach', input: 'INTERVAL_MS', group: 'N' },

  // display coordinates (Group N portion)
  { type: 'display_text', input: 'X', group: 'N', label: 'display_text(X)' },
  { type: 'display_text', input: 'Y', group: 'N', label: 'display_text(Y)' },
  { type: 'lcd_print_at', input: 'X', group: 'N', label: 'lcd_print_at(X)' },
  { type: 'lcd_print_at', input: 'Y', group: 'N', label: 'lcd_print_at(Y)' },

  // tft (19 sites)
  { type: 'tft_draw_pixel', input: 'X', group: 'N' },
  { type: 'tft_draw_pixel', input: 'Y', group: 'N', label: 'tft_draw_pixel(Y)' },
  { type: 'tft_draw_line', input: 'X1', group: 'N' },
  { type: 'tft_draw_line', input: 'Y1', group: 'N' },
  { type: 'tft_draw_line', input: 'X2', group: 'N' },
  { type: 'tft_draw_line', input: 'Y2', group: 'N' },
  { type: 'tft_draw_rect', input: 'X', group: 'N', label: 'tft_draw_rect(X)' },
  { type: 'tft_draw_rect', input: 'Y', group: 'N', label: 'tft_draw_rect(Y)' },
  { type: 'tft_draw_rect', input: 'W', group: 'N' },
  { type: 'tft_draw_rect', input: 'H', group: 'N' },
  { type: 'tft_draw_circle', input: 'X', group: 'N', label: 'tft_draw_circle(X)' },
  { type: 'tft_draw_circle', input: 'Y', group: 'N', label: 'tft_draw_circle(Y)' },
  { type: 'tft_draw_circle', input: 'R', group: 'N', label: 'tft_draw_circle(R)' },
  { type: 'tft_set_cursor', input: 'X', group: 'N', label: 'tft_set_cursor(X)' },
  { type: 'tft_set_cursor', input: 'Y', group: 'N', label: 'tft_set_cursor(Y)' },
  { type: 'tft_set_cursor', input: 'SIZE', group: 'N' },
  { type: 'tft_color_rgb', input: 'R', group: 'N', label: 'tft_color_rgb(R)' },
  { type: 'tft_color_rgb', input: 'G', group: 'N' },
  { type: 'tft_color_rgb', input: 'B', group: 'N' },

  // robot: differential drive (14 sites)
  { type: 'diff_drive_set_speed', input: 'LEFT', group: 'N' },
  { type: 'diff_drive_set_speed', input: 'RIGHT', group: 'N' },
  { type: 'diff_drive_forward', input: 'SPEED', group: 'N', label: 'diff_drive_forward(SPEED)' },
  { type: 'diff_drive_backward', input: 'SPEED', group: 'N', label: 'diff_drive_backward(SPEED)' },
  { type: 'diff_drive_spin', input: 'SPEED', group: 'N', label: 'diff_drive_spin(SPEED)' },
  { type: 'diff_drive_curve', input: 'SPEED', group: 'N', label: 'diff_drive_curve(SPEED)' },
  { type: 'diff_drive_curve', input: 'RATIO', group: 'N' },
  { type: 'diff_drive_forward_distance', input: 'DISTANCE', group: 'N' },
  { type: 'diff_drive_forward_distance', input: 'SPEED', group: 'N', label: 'diff_drive_forward_distance(SPEED)' },
  { type: 'diff_drive_rotate_angle', input: 'ANGLE', group: 'N', label: 'diff_drive_rotate_angle(ANGLE)' },
  { type: 'diff_drive_rotate_angle', input: 'SPEED', group: 'N', label: 'diff_drive_rotate_angle(SPEED)' },
  { type: 'diff_drive_line_trace', input: 'BASE_SPEED', group: 'N' },
  // diff_drive_line_trace.ERROR: dead input (generator does not valueToCode it,
  // Q-7 案 a). setCheck applied for UI type contract consistency; test verifies
  // the connection-checker contract regardless of generator dead path.
  { type: 'diff_drive_line_trace', input: 'ERROR', group: 'N' },
  { type: 'diff_drive_line_trace', input: 'CORRECTION', group: 'N' },

  // robot: humanoid (7 sites, all STEPS)
  { type: 'humanoid_walk', input: 'STEPS', group: 'N', label: 'humanoid_walk(STEPS)' },
  { type: 'humanoid_turn', input: 'STEPS', group: 'N', label: 'humanoid_turn(STEPS)' },
  { type: 'humanoid_jump', input: 'STEPS', group: 'N', label: 'humanoid_jump(STEPS)' },
  { type: 'humanoid_dance', input: 'STEPS', group: 'N', label: 'humanoid_dance(STEPS)' },
  { type: 'humanoid_swing', input: 'STEPS', group: 'N', label: 'humanoid_swing(STEPS)' },
  { type: 'humanoid_bend', input: 'STEPS', group: 'N', label: 'humanoid_bend(STEPS)' },
  { type: 'humanoid_moonwalk', input: 'STEPS', group: 'N', label: 'humanoid_moonwalk(STEPS)' },

  // robot: transform
  { type: 'transform_roll_rotate', input: 'POWER', group: 'N' },
  { type: 'transform_turn', input: 'STEPS', group: 'N', label: 'transform_turn(STEPS)' },

  // sensor
  { type: 'line_sensor_calibrate', input: 'DURATION', group: 'N', label: 'line_sensor_calibrate(DURATION)' },
  { type: 'line_sensor_detected', input: 'THRESHOLD', group: 'N', label: 'line_sensor_detected(THRESHOLD)' },
  { type: 'qtr_calibrate', input: 'SAMPLES', group: 'N', label: 'qtr_calibrate(SAMPLES)' },
  { type: 'qtr_auto_calibrate', input: 'DURATION', group: 'N', label: 'qtr_auto_calibrate(DURATION)' },
  { type: 'qtr_line_detected', input: 'THRESHOLD', group: 'N', label: 'qtr_line_detected(THRESHOLD)' },
  { type: 'mpu6050_calibrate', input: 'SAMPLES', group: 'N', label: 'mpu6050_calibrate(SAMPLES)' },

  // ===== Group M (Mixed sinks, 12 unique pairs / 13 source sites) =====

  // azure iot
  { type: 'azure_iot_hub_publish_d2c', input: 'PAYLOAD', group: 'M' },
  { type: 'azure_iot_central_publish', input: 'VALUE', group: 'M', label: 'azure_iot_central_publish(VALUE)' },
  { type: 'azure_iot_update_device_twin', input: 'VALUE', group: 'M', label: 'azure_iot_update_device_twin(VALUE)' },

  // google services
  { type: 'google_sheets_format_row', input: 'TS', group: 'M' },
  { type: 'google_sheets_format_row', input: 'VAL', group: 'M' },

  // iot cloud
  { type: 'iot_cloud_publish', input: 'PAYLOAD', group: 'M', label: 'iot_cloud_publish(PAYLOAD)' },

  // display TEXT (Print:: overload accepts mixed)
  { type: 'display_text', input: 'TEXT', group: 'M', label: 'display_text(TEXT)' },
  { type: 'lcd_print_at', input: 'TEXT', group: 'M', label: 'lcd_print_at(TEXT)' },
  { type: 'oled_ssd1306_print', input: 'TEXT', group: 'M' },

  // m5stack LCD
  { type: 'm5stack_lcd_print', input: 'TEXT', group: 'M', label: 'm5stack_lcd_print(TEXT)' },
  { type: 'm5stack_lcd_print_at', input: 'TEXT', group: 'M', label: 'm5stack_lcd_print_at(TEXT)' },

  // array_set (2 source-code sites in init + updateShape_, 1 user-facing input)
  { type: 'array_set', input: 'VALUE', group: 'M' },
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

describe('case 19 cluster T-1: VALUE input setCheck (91 source sites / 90 unique pairs)', () => {
  for (const target of TARGETS) {
    const label = target.label ?? `${target.type}(${target.input})`;
    describe(`[${target.group}] ${label}`, () => {
      it(`${target.group === 'M' ? 'accepts' : 'REJECTS'} text (String output)`, () => {
        const ws = new Blockly.Workspace();
        const expected = target.group === 'M';
        expect(canConnectFromBlock(ws, 'text', target.type, target.input)).toBe(expected);
      });

      it('accepts math_number (Number output)', () => {
        const ws = new Blockly.Workspace();
        expect(canConnectFromBlock(ws, 'math_number', target.type, target.input)).toBe(true);
      });

      it('accepts variables_get (untyped output, Blockly v10 universal-compatible)', () => {
        const ws = new Blockly.Workspace();
        expect(canConnectFromVariable(ws, target.type, target.input)).toBe(true);
      });

      it('REJECTS array_content (Array output) — case 19 cluster invariant', () => {
        const ws = new Blockly.Workspace();
        expect(canConnectFromBlock(ws, 'array_content', target.type, target.input)).toBe(false);
      });
    });
  }
});
