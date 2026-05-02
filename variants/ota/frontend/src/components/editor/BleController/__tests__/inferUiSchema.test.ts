/**
 * inferUiSchema unit tests (47.md commit #1, Phase 1)
 *
 * Tests cover the rules in 47.md §8.3 and the backward-compat default
 * behaviour for old XML lacking the new LABEL / DATA_TYPE / MIN / MAX
 * fields introduced in commit #0.
 */
import { describe, it, expect } from 'vitest';
import { inferUiSchema } from '../inferUiSchema';
import { SCHEMA_VERSION } from '../types';

const xmlOpen = '<xml xmlns="https://developers.google.com/blockly/xml">';
const xmlClose = '</xml>';

function blockXml(inner: string): string {
  return xmlOpen + inner + xmlClose;
}

function characteristicBlock(opts: {
  charUuid?: string;
  serviceUuid?: string;
  label?: string;
  dataType?: string;
  min?: number;
  max?: number;
  read?: boolean;
  write?: boolean;
  notify?: boolean;
  /** When true, omits the new fields (LABEL/DATA_TYPE/MIN/MAX) — simulates pre-commit-#0 XML. */
  legacy?: boolean;
}): string {
  const charUuid = opts.charUuid ?? '00001111-1234-1234-1234-123456789ABC';
  const serviceUuid = opts.serviceUuid ?? '12345678-1234-1234-1234-123456789ABC';
  const label = opts.label ?? 'Characteristic';
  const dataType = opts.dataType ?? 'string';
  const min = opts.min ?? 0;
  const max = opts.max ?? 100;
  const read = opts.read ?? false;
  const write = opts.write ?? true;
  const notify = opts.notify ?? false;
  const legacyFields = opts.legacy
    ? ''
    : `<field name="LABEL">${label}</field>
       <field name="DATA_TYPE">${dataType}</field>
       <field name="MIN">${min}</field>
       <field name="MAX">${max}</field>`;
  return `<block type="ble_add_characteristic">
    ${legacyFields}
    <field name="SERVICE_UUID">${serviceUuid}</field>
    <field name="CHAR_UUID">${charUuid}</field>
    <field name="READ">${read ? 'TRUE' : 'FALSE'}</field>
    <field name="WRITE">${write ? 'TRUE' : 'FALSE'}</field>
    <field name="NOTIFY">${notify ? 'TRUE' : 'FALSE'}</field>
  </block>`;
}

describe('inferUiSchema — empty / no-BLE inputs', () => {
  it('returns empty schema for empty string', () => {
    const s = inferUiSchema('');
    expect(s.version).toBe(SCHEMA_VERSION);
    expect(s.device.advertisedName).toBe('');
    expect(s.widgets).toEqual([]);
    expect(s.warnings).toEqual([]);
  });

  it('returns empty schema for XML with no BLE blocks', () => {
    const xml = blockXml('<block type="arduino_setup"><statement name="DO"></statement></block>');
    const s = inferUiSchema(xml);
    expect(s.widgets).toEqual([]);
    expect(s.device.advertisedName).toBe('');
  });

  it('records a warning for malformed XML', () => {
    const s = inferUiSchema('<<not valid>>>');
    expect(s.warnings.length).toBeGreaterThan(0);
    expect(s.widgets).toEqual([]);
  });
});

describe('inferUiSchema — NUS UART', () => {
  it('infers a single nus-uart widget from ble_uart_setup', () => {
    const xml = blockXml(
      '<block type="ble_uart_setup"><field name="NAME">MyDevice</field></block>'
    );
    const s = inferUiSchema(xml);
    expect(s.device.advertisedName).toBe('MyDevice');
    expect(s.widgets).toHaveLength(1);
    expect(s.widgets[0]).toMatchObject({ type: 'nus-uart', id: 'nus-uart' });
  });

  it('deduplicates multiple ble_uart_setup blocks into a single widget', () => {
    const xml = blockXml(
      `<block type="ble_uart_setup"><field name="NAME">A</field></block>
       <block type="ble_uart_setup"><field name="NAME">B</field></block>`
    );
    const s = inferUiSchema(xml);
    expect(s.widgets.filter((w) => w.type === 'nus-uart')).toHaveLength(1);
    // First wins for advertised name
    expect(s.device.advertisedName).toBe('A');
  });
});

describe('inferUiSchema — GATT widget inference', () => {
  it('bool + write → toggle widget', () => {
    const xml = blockXml(
      `<block type="ble_init"><field name="NAME">Dev</field></block>` +
        characteristicBlock({ dataType: 'bool', write: true, label: 'LED' })
    );
    const s = inferUiSchema(xml);
    expect(s.device.advertisedName).toBe('Dev');
    expect(s.widgets).toHaveLength(1);
    expect(s.widgets[0]).toMatchObject({ type: 'gatt-toggle', label: 'LED' });
  });

  it('uint8 + write + min/max → slider widget with bounds', () => {
    const xml = blockXml(
      characteristicBlock({
        dataType: 'uint8',
        write: true,
        label: 'Servo',
        min: 0,
        max: 180,
      })
    );
    const s = inferUiSchema(xml);
    expect(s.widgets).toHaveLength(1);
    expect(s.widgets[0]).toMatchObject({
      type: 'gatt-slider',
      label: 'Servo',
      dataType: 'uint8',
      min: 0,
      max: 180,
    });
  });

  it('float + read + notify → display widget with notifyEnabled', () => {
    const xml = blockXml(
      characteristicBlock({
        dataType: 'float',
        write: false,
        read: true,
        notify: true,
        label: 'Temp',
      })
    );
    const s = inferUiSchema(xml);
    expect(s.widgets[0]).toMatchObject({
      type: 'gatt-display',
      label: 'Temp',
      dataType: 'float',
      notifyEnabled: true,
    });
  });

  it('string + write-only → display widget (Phase 1 fallback)', () => {
    const xml = blockXml(
      characteristicBlock({
        dataType: 'string',
        write: true,
        read: false,
        notify: false,
        label: 'Note',
      })
    );
    const s = inferUiSchema(xml);
    expect(s.widgets[0]).toMatchObject({
      type: 'gatt-display',
      label: 'Note',
      dataType: 'string',
    });
  });

  it('no R/W/N enabled → warning + skipped', () => {
    const xml = blockXml(
      characteristicBlock({ write: false, read: false, notify: false, label: 'Dead' })
    );
    const s = inferUiSchema(xml);
    expect(s.widgets).toHaveLength(0);
    expect(s.warnings.some((w) => w.includes('Dead'))).toBe(true);
  });

  it('duplicate CHAR_UUID → warning + first wins', () => {
    const same = '00009999-1234-1234-1234-123456789ABC';
    const xml = blockXml(
      characteristicBlock({ charUuid: same, label: 'First', dataType: 'bool', write: true }) +
        characteristicBlock({ charUuid: same, label: 'Second', dataType: 'bool', write: true })
    );
    const s = inferUiSchema(xml);
    expect(s.widgets).toHaveLength(1);
    expect(s.widgets[0]).toMatchObject({ label: 'First' });
    expect(s.warnings.some((w) => w.includes('multiple times'))).toBe(true);
  });

  it('unknown DATA_TYPE → warning + falls back to string display', () => {
    const xml = blockXml(
      characteristicBlock({
        dataType: 'invalid_type',
        write: false,
        read: true,
        label: 'Weird',
      })
    );
    const s = inferUiSchema(xml);
    expect(s.warnings.some((w) => w.includes('Unknown data type'))).toBe(true);
    expect(s.widgets[0]).toMatchObject({ type: 'gatt-display', dataType: 'string' });
  });
});

describe('inferUiSchema — backward compat (legacy XML pre-commit-#0)', () => {
  it('legacy ble_add_characteristic without DATA_TYPE/LABEL/MIN/MAX → string display with UUID-prefix label', () => {
    const xml = blockXml(
      characteristicBlock({
        legacy: true,
        write: false,
        read: true,
        charUuid: '00009999-aaaa-bbbb-cccc-ddddeeeeffff',
      })
    );
    const s = inferUiSchema(xml);
    expect(s.widgets).toHaveLength(1);
    expect(s.widgets[0]).toMatchObject({
      type: 'gatt-display',
      dataType: 'string',
      label: 'Char 00009999',
    });
    expect(s.warnings).toEqual([]);
  });

  it('legacy block with write checkbox set → string-write display (no crash, no widget loss)', () => {
    const xml = blockXml(characteristicBlock({ legacy: true, write: true, read: true }));
    const s = inferUiSchema(xml);
    expect(s.widgets).toHaveLength(1);
    expect(s.widgets[0].type).toBe('gatt-display');
  });
});

describe('inferUiSchema — mixed real-world scenario', () => {
  it('NUS UART + 3 GATT (toggle / slider / display) → 4 widgets in declared order', () => {
    const xml = blockXml(
      `<block type="ble_uart_setup"><field name="NAME">Robot</field></block>` +
        characteristicBlock({
          charUuid: '00001111-aaaa-bbbb-cccc-ddddeeeeff01',
          label: 'LED',
          dataType: 'bool',
          write: true,
        }) +
        characteristicBlock({
          charUuid: '00001111-aaaa-bbbb-cccc-ddddeeeeff02',
          label: 'Servo',
          dataType: 'uint8',
          write: true,
          min: 0,
          max: 180,
        }) +
        characteristicBlock({
          charUuid: '00001111-aaaa-bbbb-cccc-ddddeeeeff03',
          label: 'Temp',
          dataType: 'float',
          write: false,
          read: true,
          notify: true,
        })
    );
    const s = inferUiSchema(xml);
    expect(s.device.advertisedName).toBe('Robot');
    expect(s.widgets).toHaveLength(4);
    expect(s.widgets.map((w) => w.type)).toEqual([
      'nus-uart',
      'gatt-toggle',
      'gatt-slider',
      'gatt-display',
    ]);
    expect(s.warnings).toEqual([]);
  });

  it('captures custom GATT serviceUuid from ble_add_service', () => {
    const customSvc = '11112222-3333-4444-5555-666677778888';
    const xml = blockXml(
      `<block type="ble_init"><field name="NAME">Dev</field></block>
       <block type="ble_add_service"><field name="UUID">${customSvc}</field></block>` +
        characteristicBlock({
          serviceUuid: customSvc,
          dataType: 'bool',
          write: true,
          label: 'LED',
        })
    );
    const s = inferUiSchema(xml);
    expect(s.device.serviceUuid).toBe(customSvc);
    expect(s.widgets).toHaveLength(1);
  });
});
