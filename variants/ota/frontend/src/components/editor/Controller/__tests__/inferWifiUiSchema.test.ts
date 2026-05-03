/**
 * inferWifiUiSchema tests (47.md Phase 2 commit #3, §14.5)
 *
 * Pure-function tests — no Blockly setup needed. The Blockly extractor
 * (`extractWsServerData`) is a thin map over `block.getFieldValue(...)`
 * with no business logic worth testing in isolation.
 */

import { describe, it, expect } from 'vitest';
import { inferWifiUiSchema, type WsServerRegistration } from '../inferWifiUiSchema';
import { DEFAULT_WS_SERVER_PORT, DEFAULT_WS_SERVER_PATH } from '../types';

function reg(overrides: Partial<WsServerRegistration> = {}): WsServerRegistration {
  return {
    channelId: 'channel1',
    label: 'Channel 1',
    dataType: 'uint8',
    min: 0,
    max: 100,
    canRead: false,
    canWrite: true,
    canNotify: false,
    ...overrides,
  };
}

describe('inferWifiUiSchema — schema scaffold', () => {
  it('emits connection=wifi, version=1.0, single device, no warnings on empty input', () => {
    const schema = inferWifiUiSchema({
      projectName: 'My Project',
      registrations: [],
    });
    expect(schema.connection).toBe('wifi');
    expect(schema.version).toBe('1.0');
    expect(schema.devices).toHaveLength(1);
    expect(schema.warnings).toEqual([]);
  });

  it('falls back to default port=81 / path="/" when serverStart omitted', () => {
    const schema = inferWifiUiSchema({
      projectName: 'My Project',
      registrations: [],
    });
    expect(schema.devices[0].endpoint.port).toBe(DEFAULT_WS_SERVER_PORT);
    expect(schema.devices[0].endpoint.path).toBe(DEFAULT_WS_SERVER_PATH);
  });

  it('uses serverStart fields when provided', () => {
    const schema = inferWifiUiSchema({
      projectName: 'My Project',
      serverStart: { port: 8080, path: '/ws' },
      registrations: [],
    });
    expect(schema.devices[0].endpoint).toEqual({ port: 8080, path: '/ws' });
  });

  it('derives stable deviceId from projectName and uses projectName as deviceLabel', () => {
    const schema = inferWifiUiSchema({
      projectName: 'My Cool Robot!',
      registrations: [],
    });
    expect(schema.devices[0].deviceLabel).toBe('My Cool Robot!');
    expect(schema.devices[0].deviceId).toBe('my-cool-robot');
  });

  it('falls back to "Device 1" / "device-1" when projectName blank', () => {
    const schema = inferWifiUiSchema({ projectName: '', registrations: [] });
    expect(schema.devices[0].deviceLabel).toBe('Device 1');
    expect(schema.devices[0].deviceId).toBe('device-1');
  });
});

describe('inferWifiUiSchema — widget inference', () => {
  it('bool + WRITE → gatt-toggle', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [reg({ channelId: 'led', dataType: 'bool', canWrite: true })],
    });
    const w = schema.devices[0].widgets[0];
    expect(w).toMatchObject({
      type: 'gatt-toggle',
      id: 'led',
      channelId: 'led',
      label: 'Channel 1',
    });
    expect(schema.warnings).toEqual([]);
  });

  it('numeric + WRITE → gatt-slider with MIN/MAX preserved', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({
          channelId: 'servo',
          label: 'Servo angle',
          dataType: 'uint8',
          min: 0,
          max: 180,
          canWrite: true,
        }),
      ],
    });
    expect(schema.devices[0].widgets[0]).toMatchObject({
      type: 'gatt-slider',
      id: 'servo',
      label: 'Servo angle',
      dataType: 'uint8',
      min: 0,
      max: 180,
    });
  });

  it('numeric + READ-only → gatt-display number, notify=false', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({
          channelId: 'temp',
          label: 'Temperature',
          dataType: 'float',
          canWrite: false,
          canRead: true,
        }),
      ],
    });
    expect(schema.devices[0].widgets[0]).toMatchObject({
      type: 'gatt-display',
      dataType: 'float',
      notifyEnabled: false,
    });
  });

  it('numeric + NOTIFY-only → gatt-display number, notify=true', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({
          channelId: 'rpm',
          dataType: 'uint16',
          canWrite: false,
          canNotify: true,
        }),
      ],
    });
    expect(schema.devices[0].widgets[0]).toMatchObject({
      type: 'gatt-display',
      dataType: 'uint16',
      notifyEnabled: true,
    });
  });

  it('string + READ → gatt-display string', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({
          channelId: 'status',
          dataType: 'string',
          canWrite: false,
          canRead: true,
        }),
      ],
    });
    expect(schema.devices[0].widgets[0]).toMatchObject({
      type: 'gatt-display',
      dataType: 'string',
      notifyEnabled: false,
    });
  });

  it('string + WRITE-only → gatt-display string fallback (Phase 1 behavior)', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({ channelId: 'msg', dataType: 'string', canWrite: true }),
      ],
    });
    expect(schema.devices[0].widgets[0]).toMatchObject({
      type: 'gatt-display',
      dataType: 'string',
    });
  });

  it('bool + NOTIFY-only → gatt-display rendered as 0/1 string', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({
          channelId: 'door',
          dataType: 'bool',
          canWrite: false,
          canNotify: true,
        }),
      ],
    });
    expect(schema.devices[0].widgets[0]).toMatchObject({
      type: 'gatt-display',
      dataType: 'string',
      notifyEnabled: true,
    });
  });
});

describe('inferWifiUiSchema — N channels + warnings', () => {
  it('renders N channels in registration order', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({ channelId: 'led', dataType: 'bool', canWrite: true }),
        reg({ channelId: 'servo', dataType: 'uint8', canWrite: true, min: 0, max: 180 }),
        reg({ channelId: 'temp', dataType: 'float', canWrite: false, canRead: true }),
      ],
    });
    expect(schema.devices[0].widgets.map((w) => w.id)).toEqual(['led', 'servo', 'temp']);
    expect(schema.warnings).toEqual([]);
  });

  it('warns on duplicate channelId and keeps first occurrence', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({ channelId: 'led', label: 'first', dataType: 'bool', canWrite: true }),
        reg({ channelId: 'led', label: 'second', dataType: 'bool', canWrite: true }),
      ],
    });
    expect(schema.devices[0].widgets).toHaveLength(1);
    expect(schema.devices[0].widgets[0].label).toBe('first');
    expect(schema.warnings).toContain('Channel "led" appears multiple times; first occurrence used.');
  });

  it('warns and skips when no R/W/N enabled', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({
          channelId: 'orphan',
          canWrite: false,
          canRead: false,
          canNotify: false,
        }),
      ],
    });
    expect(schema.devices[0].widgets).toHaveLength(0);
    expect(schema.warnings).toContain('Channel "orphan": no read/write/notify enabled; skipped.');
  });

  it('warns and falls back to string on unknown DATA_TYPE', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [
        reg({
          channelId: 'weird',
          dataType: 'double', // not in the catalog
          canRead: true,
          canWrite: false,
        }),
      ],
    });
    expect(schema.devices[0].widgets[0]).toMatchObject({
      type: 'gatt-display',
      dataType: 'string',
    });
    expect(schema.warnings.some((w) => w.includes('Unknown data type "double"'))).toBe(true);
  });

  it('warns and skips on empty channelId', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [reg({ channelId: '   ', canWrite: true })],
    });
    expect(schema.devices[0].widgets).toHaveLength(0);
    expect(schema.warnings).toContain('Channel with empty id was skipped.');
  });

  it('uses channelId as label fallback when label is blank', () => {
    const schema = inferWifiUiSchema({
      projectName: 'p',
      registrations: [reg({ channelId: 'anon', label: '', canWrite: true, dataType: 'bool' })],
    });
    expect(schema.devices[0].widgets[0].label).toBe('anon');
  });
});
