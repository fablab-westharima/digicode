/**
 * ServoPulseDialog destructive-save fix tests (Session 138 Bug 2 hotfix)
 *
 * Background:
 *   `updatePreset` does a shallow merge at the top level of the preset
 *   object, so passing `{ servoConfig: { servoType, minPulse, maxPulse,
 *   perPinConfigs } }` previously REPLACED the entire `servoConfig`,
 *   wiping out `speedDegPerSec` set via ServoSpeedDialog.
 *
 * Fix:
 *   handleSave now spreads `...currentPreset.servoConfig` before the new
 *   pulse fields so sibling fields (speedDegPerSec etc.) are preserved.
 *
 * Tests cover both the negative case (destructive save would have wiped
 * speed) and the positive case (pulse field update still works), plus a
 * parallel-structure check that ServoSpeedDialog symmetrically preserves
 * pulse fields. parallel_structure_audit memory applies.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { ServoPulseDialog } from '../ServoPulseDialog';
import { ServoSpeedDialog } from '../ServoSpeedDialog';
import { usePinPresetStore, type PinPreset } from '@/stores/pinPresetStore';

// Disable analytics track during tests
vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

const BASE_PRESET: PinPreset = usePinPresetStore.getState().presets[0];

function resetStore(overrides?: Partial<PinPreset['servoConfig']>) {
  usePinPresetStore.setState({
    currentPresetId: 'default',
    presets: [
      {
        ...BASE_PRESET,
        servoConfig: {
          ...BASE_PRESET.servoConfig,
          servoType: '180',
          minPulse: 500,
          maxPulse: 2400,
          speedDegPerSec: 0,
          perPinConfigs: [],
          ...overrides,
        },
      },
    ],
    isPremiumEnabled: true,
  });
}

function renderPulseDialog() {
  const onOpenChange = vi.fn();
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ServoPulseDialog open={true} onOpenChange={onOpenChange} />
    </I18nextProvider>,
  );
  return { ...utils, onOpenChange };
}

function renderSpeedDialog() {
  const onOpenChange = vi.fn();
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ServoSpeedDialog open={true} onOpenChange={onOpenChange} />
    </I18nextProvider>,
  );
  return { ...utils, onOpenChange };
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

describe('ServoPulseDialog handleSave preserves sibling servoConfig fields (Bug 2 fix)', () => {
  it('saving pulse with an existing speedDegPerSec retains the speed value', () => {
    // Pre-condition: speed override is set (e.g. via prior ServoSpeedDialog Save)
    resetStore({ speedDegPerSec: 360 });
    renderPulseDialog();

    // Edit minPulse from 500 → 1000
    const minPulseInput = screen.getAllByDisplayValue('500')[0] as HTMLInputElement;
    fireEvent.change(minPulseInput, { target: { value: '1000' } });

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    // 🔴 critical assertion: speed must NOT be wiped by pulse save
    expect(after.speedDegPerSec).toBe(360);
    // Positive: pulse update still applied
    expect(after.minPulse).toBe(1000);
  });

  it('saving pulse retains perPin entries with existing speed overrides', () => {
    // Pre-condition: perPin entry has both pulse + speed override
    resetStore({
      perPinConfigs: [
        { pin: 32, minPulse: 500, maxPulse: 2400, speedDegPerSec: 60 },
      ],
    });
    renderPulseDialog();

    // Edit the global (一括) maxPulse 2400 → 2500
    const maxPulseInputs = screen.getAllByDisplayValue('2400') as HTMLInputElement[];
    // First match = global Card maxPulse input (perPin Card maxPulse comes after)
    fireEvent.change(maxPulseInputs[0], { target: { value: '2500' } });

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    // perPin entry's speedDegPerSec field must survive the save
    const pin32 = after.perPinConfigs?.find((c) => c.pin === 32);
    expect(pin32).toBeDefined();
    expect(pin32?.speedDegPerSec).toBe(60);
    // Positive: global maxPulse updated
    expect(after.maxPulse).toBe(2500);
  });

  it('saving pulse updates pulse fields (positive verify, default speedDegPerSec=0 case)', () => {
    resetStore({ speedDegPerSec: 0 });
    renderPulseDialog();

    // Edit minPulse 500 → 600
    const minPulseInput = screen.getAllByDisplayValue('500')[0] as HTMLInputElement;
    fireEvent.change(minPulseInput, { target: { value: '600' } });

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    expect(after.minPulse).toBe(600);
    // speedDegPerSec default (0) preserved
    expect(after.speedDegPerSec).toBe(0);
  });

  it('parallel structure: ServoSpeedDialog Save preserves pulse fields (symmetry verify)', () => {
    // Pre-condition: custom pulse values set
    resetStore({
      servoType: '270',
      minPulse: 600,
      maxPulse: 2500,
      perPinConfigs: [{ pin: 13, minPulse: 500, maxPulse: 2400 }],
    });
    renderSpeedDialog();

    // Change globalSpeed via the single number input (initial value=0)
    const speedInput = screen.getByDisplayValue('0') as HTMLInputElement;
    fireEvent.change(speedInput, { target: { value: '180' } });

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    expect(after.speedDegPerSec).toBe(180);
    // Pulse-side fields must survive ServoSpeedDialog Save (memory:parallel_structure_audit)
    expect(after.servoType).toBe('270');
    expect(after.minPulse).toBe(600);
    expect(after.maxPulse).toBe(2500);
    // Existing pulse-only perPin entry preserved (speedDegPerSec field stays undefined)
    const pin13 = after.perPinConfigs?.find((c) => c.pin === 13);
    expect(pin13).toBeDefined();
    expect(pin13?.minPulse).toBe(500);
    expect(pin13?.maxPulse).toBe(2400);
    expect(pin13?.speedDegPerSec).toBeUndefined();
  });
});
