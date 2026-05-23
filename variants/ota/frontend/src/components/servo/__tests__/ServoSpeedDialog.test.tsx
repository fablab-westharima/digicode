/**
 * ServoSpeedDialog render + state tests (第137 Phase 2、Option A settings-only)
 *
 * Coverage (6 cases):
 *   - renders nothing when open=false
 *   - renders title + speed input + Add button when open
 *   - global speed input updates local state (Save button enables)
 *   - Add row creates entry seeded with global speed
 *   - Save persists global + perPin via updatePreset; perPin without speed override is preserved
 *   - speed=0 (default) flows through to store unchanged (R1 verify: cpp emit unaffected upstream)
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
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
          speedDegPerSec: 0,
          perPinConfigs: [],
          ...overrides,
        },
      },
    ],
    isPremiumEnabled: true,
  });
}

function renderDialog(open: boolean) {
  const onOpenChange = vi.fn();
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ServoSpeedDialog open={open} onOpenChange={onOpenChange} />
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

describe('ServoSpeedDialog', () => {
  it('does not render content when open=false', () => {
    renderDialog(false);
    expect(screen.queryByText(/サーボスピード調整|Servo Speed Settings/i)).toBeNull();
  });

  it('renders title + speed input + Add button when open', () => {
    renderDialog(true);
    // DialogTitle と CardTitle が同 i18n value を含む lang あり (例: en では title===settings)、
    // getAllByText で >= 1 match (title 単独 or title+settings) を許容
    expect(screen.getAllByText(/サーボスピード調整|Servo Speed Settings/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/追加|Add/i)).toBeTruthy();
    // 一括設定 input (number 0)
    expect(screen.getByDisplayValue('0')).toBeTruthy();
  });

  it('global speed input updates local state (Save button enables)', () => {
    renderDialog(true);
    const saveBtn = screen.getByText(/保存|Save/i).closest('button');
    expect(saveBtn?.hasAttribute('disabled')).toBe(true); // initial = no changes

    const speedInput = screen.getByDisplayValue('0') as HTMLInputElement;
    fireEvent.change(speedInput, { target: { value: '180' } });
    expect(speedInput.value).toBe('180');
    expect(saveBtn?.hasAttribute('disabled')).toBe(false); // now enabled
  });

  it('Add button creates a per-pin row seeded with the current global speed', () => {
    resetStore({ speedDegPerSec: 120, perPinConfigs: [] });
    renderDialog(true);
    const addBtn = screen.getByText(/追加|Add/i).closest('button')!;
    fireEvent.click(addBtn);
    // After click: 2 number inputs with value 0 (pin) + 120 (speed seeded from global)
    const inputs = screen.getAllByRole('spinbutton');
    // Order: global speed (120) + pin (0) + perPin speed (120)
    const values = inputs.map((i) => (i as HTMLInputElement).value);
    expect(values).toContain('120');
    expect(values).toContain('0');
  });

  it('Save persists global + perPin via updatePreset (perPin without speed override is preserved)', () => {
    resetStore({
      speedDegPerSec: 0,
      perPinConfigs: [
        // legacy pulse-only entry (no speedDegPerSec field) - should be preserved unchanged
        { pin: 13, minPulse: 500, maxPulse: 2400 },
      ],
    });
    renderDialog(true);
    const speedInput = screen.getByDisplayValue('0') as HTMLInputElement;
    fireEvent.change(speedInput, { target: { value: '180' } });
    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    expect(after.speedDegPerSec).toBe(180);
    // legacy pulse-only entry preserved (rule 06: 不要な field 追加なし)
    expect(after.perPinConfigs).toEqual([
      { pin: 13, minPulse: 500, maxPulse: 2400 },
    ]);
  });

  it('Save with speed=0 default leaves store servoConfig speedDegPerSec=0 (R1 verify)', () => {
    resetStore({ speedDegPerSec: 0, perPinConfigs: [] });
    renderDialog(true);
    // 何も変更せず Save (button disabled なので変更が必要 = add row then trash で「変更検出」状態に)
    const addBtn = screen.getByText(/追加|Add/i).closest('button')!;
    fireEvent.click(addBtn);
    // trash the row immediately
    const trashBtn = document.querySelectorAll('button.text-red-400')[0] as HTMLButtonElement;
    fireEvent.click(trashBtn);
    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    expect(after.speedDegPerSec).toBe(0); // R1: helper 注入 skip 条件維持
    expect(after.perPinConfigs).toEqual([]);
  });
});
