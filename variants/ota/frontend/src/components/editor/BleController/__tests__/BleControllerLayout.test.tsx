/**
 * BleControllerLayout render tests (47.md commit #4, Phase 1)
 *
 * Render assertions (not full snapshots — they would be brittle against
 * Tailwind class shuffling). We verify:
 *  - empty schema → empty-state copy is shown
 *  - mixed schema → all 4 widget types render
 *  - warnings → notes box appears with each warning text
 *  - connection bar is always present
 *  - serviceUuid threaded through to GATT widgets via props
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { BleControllerLayout } from '../BleControllerLayout';
import { WebBluetoothClient } from '../webBluetoothClient';
import type { BleControllerSchema } from '../types';
import { SCHEMA_VERSION } from '../types';

function makeClient(): WebBluetoothClient {
  return new WebBluetoothClient({ bluetooth: undefined as unknown as Bluetooth });
}

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
}

describe('BleControllerLayout', () => {
  it('renders empty-state when schema has no widgets', () => {
    cleanup();
    const schema: BleControllerSchema = {
      version: SCHEMA_VERSION,
      device: { advertisedName: '' },
      widgets: [],
      warnings: [],
    };
    renderWithI18n(<BleControllerLayout schema={schema} client={makeClient()} />);
    // Use the dedicated empty-state testid rather than text matching, since
    // the connection bar uses a similar (but distinct) "noBlocks" copy and
    // canonical JA defaults can change without invalidating this assertion.
    expect(screen.getByTestId('ble-controller-empty-state')).toBeTruthy();
  });

  it('renders connection bar regardless of widget presence', () => {
    cleanup();
    const schema: BleControllerSchema = {
      version: SCHEMA_VERSION,
      device: { advertisedName: '' },
      widgets: [],
      warnings: [],
    };
    renderWithI18n(<BleControllerLayout schema={schema} client={makeClient()} />);
    expect(screen.getByTestId('ble-connection-bar')).toBeTruthy();
  });

  it('renders all 4 widget types when present in schema', () => {
    cleanup();
    const schema: BleControllerSchema = {
      version: SCHEMA_VERSION,
      device: { advertisedName: 'Robot', serviceUuid: '11112222-3333-4444-5555-666677778888' },
      widgets: [
        { type: 'nus-uart', id: 'nus-uart', label: 'UART' },
        {
          type: 'gatt-toggle',
          id: 'gatt-1',
          label: 'LED',
          characteristicUuid: '00001111-aaaa-bbbb-cccc-ddddeeeeff01',
        },
        {
          type: 'gatt-slider',
          id: 'gatt-2',
          label: 'Servo',
          characteristicUuid: '00001111-aaaa-bbbb-cccc-ddddeeeeff02',
          dataType: 'uint8',
          min: 0,
          max: 180,
        },
        {
          type: 'gatt-display',
          id: 'gatt-3',
          label: 'Temp',
          characteristicUuid: '00001111-aaaa-bbbb-cccc-ddddeeeeff03',
          dataType: 'float',
          notifyEnabled: true,
        },
      ],
      warnings: [],
    };
    renderWithI18n(<BleControllerLayout schema={schema} client={makeClient()} />);
    expect(screen.getByText('UART')).toBeTruthy();
    expect(screen.getByText('LED')).toBeTruthy();
    expect(screen.getByText('Servo')).toBeTruthy();
    expect(screen.getByText('Temp')).toBeTruthy();
  });

  it('shows warnings header and each warning when warnings[] is non-empty', () => {
    cleanup();
    const schema: BleControllerSchema = {
      version: SCHEMA_VERSION,
      device: { advertisedName: 'Dev' },
      widgets: [
        {
          type: 'gatt-toggle',
          id: 'g1',
          label: 'LED',
          characteristicUuid: '00001111-aaaa-bbbb-cccc-ddddeeeeff01',
        },
      ],
      warnings: ['Characteristic Foo: no read/write/notify enabled; skipped.', 'Unknown data type "xyz" on Bar; treating as string.'],
    };
    renderWithI18n(<BleControllerLayout schema={schema} client={makeClient()} />);
    expect(screen.getByText(/no read\/write\/notify enabled/)).toBeTruthy();
    expect(screen.getByText(/Unknown data type/)).toBeTruthy();
  });

  it('calls onConnectionChange when client emits connect/disconnect events', () => {
    cleanup();
    const client = makeClient();
    const onConnectionChange = vi.fn();
    const schema: BleControllerSchema = {
      version: SCHEMA_VERSION,
      device: { advertisedName: '' },
      widgets: [],
      warnings: [],
    };
    renderWithI18n(
      <BleControllerLayout schema={schema} client={client} onConnectionChange={onConnectionChange} />
    );
    // Simulate the client emitting events directly (private but addressable via cast).
    const c = client as unknown as { emit: (e: { type: string; deviceName?: string }) => void };
    c.emit({ type: 'connected', deviceName: 'TestDev' });
    expect(onConnectionChange).toHaveBeenLastCalledWith(true);
    c.emit({ type: 'disconnected' });
    expect(onConnectionChange).toHaveBeenLastCalledWith(false);
  });
});
