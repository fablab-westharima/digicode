/**
 * ServoTrimDialog rewrite tests (Phase 3-E、Session 156)
 *
 * Phase 3-E rewrite で transport (HTTP/Serial/BLE) + localStorage 経路を全廃止、
 * pinPresetStore.servoConfig 直書き paradigm (= ServoPulse/Speed と同 form) に統一。
 *
 * テスト軸:
 * - 一括 trim / 一括 reverse の save → store.servoConfig.{trimDeg,reverse} 反映
 * - sibling field (pulse / speed) は破壊されず維持 (Bug 2 fix 同 logic、 ServoPulseDialog.test と parallel)
 * - perPin 行追加 → store.servoConfig.perPinConfigs に entry 追加
 * - perPin reverse Switch toggle → store 反映
 * - reset (キャンセル) → 編集前 state に戻る
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { ServoTrimDialog } from '../ServoTrimDialog';
import { usePinPresetStore, type PinPreset } from '@/stores/pinPresetStore';

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
          trimDeg: 0,
          reverse: false,
          perPinConfigs: [],
          ...overrides,
        },
      },
    ],
    isPremiumEnabled: true,
  });
}

function renderTrimDialog() {
  const onOpenChange = vi.fn();
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ServoTrimDialog open={true} onOpenChange={onOpenChange} />
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

describe('ServoTrimDialog Phase 3-E: pinPresetStore 直書き paradigm (transport 経路廃止)', () => {
  it('global trim を edit → save で store.servoConfig.trimDeg 反映', () => {
    renderTrimDialog();

    // global trim input (initial 0)
    const trimInput = screen.getAllByDisplayValue('0')[0] as HTMLInputElement;
    fireEvent.change(trimInput, { target: { value: '7' } });

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    expect(after.trimDeg).toBe(7);
    expect(after.reverse).toBe(false);
  });

  it('global reverse Switch toggle → save で store.servoConfig.reverse 反映', () => {
    renderTrimDialog();

    // Switch component の role="switch"
    const switches = screen.getAllByRole('switch');
    // First switch = global reverse (per-pin rows は空 = no switches)
    fireEvent.click(switches[0]);

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    expect(after.reverse).toBe(true);
    expect(after.trimDeg).toBe(0);
  });

  it('parallel structure: saving trim/reverse preserves pulse + speed sibling fields (Bug 2 fix 同 logic)', () => {
    // Pre-condition: pulse + speed 既存設定あり
    resetStore({
      servoType: '270',
      minPulse: 600,
      maxPulse: 2500,
      speedDegPerSec: 180,
    });
    renderTrimDialog();

    // global trim 0 → -5
    const trimInput = screen.getAllByDisplayValue('0')[0] as HTMLInputElement;
    fireEvent.change(trimInput, { target: { value: '-5' } });

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    // trim 更新
    expect(after.trimDeg).toBe(-5);
    // pulse / speed sibling field 維持
    expect(after.servoType).toBe('270');
    expect(after.minPulse).toBe(600);
    expect(after.maxPulse).toBe(2500);
    expect(after.speedDegPerSec).toBe(180);
  });

  it('perPin 行追加 + trim 設定 → save で store.servoConfig.perPinConfigs に entry 追加', () => {
    renderTrimDialog();

    // 追加 button click
    const addBtn = screen.getByText(/追加|Add/i).closest('button')!;
    fireEvent.click(addBtn);

    // GPIO 入力 = 0 → 13
    const gpioInputs = screen.getAllByDisplayValue('0') as HTMLInputElement[];
    // 一括 trim input + perPin GPIO + perPin trim °  の 3 件 0、 perPin GPIO は 2 番目
    fireEvent.change(gpioInputs[1], { target: { value: '13' } });

    // perPin trim ° input は最後の 0 表示 (一括 trim, perPin trim ° の 2 件)
    const allZeroInputs = screen.getAllByDisplayValue('0') as HTMLInputElement[];
    const perPinTrimInput = allZeroInputs[allZeroInputs.length - 1];
    fireEvent.change(perPinTrimInput, { target: { value: '10' } });

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    const pin13 = after.perPinConfigs?.find((c) => c.pin === 13);
    expect(pin13).toBeDefined();
    expect(pin13?.trimDeg).toBe(10);
    expect(pin13?.reverse).toBe(false);
    // 新規 entry には global pulse 値が default で入る
    expect(pin13?.minPulse).toBe(500);
    expect(pin13?.maxPulse).toBe(2400);
  });

  it('perPin reverse Switch toggle → save で perPinConfigs[i].reverse 反映', () => {
    // Pre-condition: pin 13 に既存 trim override 存在
    resetStore({
      perPinConfigs: [{ pin: 13, minPulse: 500, maxPulse: 2400, trimDeg: 5 }],
    });
    renderTrimDialog();

    // Switch 2 件あるはず: [0] global reverse / [1] perPin row reverse
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
    // perPin reverse toggle
    fireEvent.click(switches[1]);

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    const pin13 = after.perPinConfigs?.find((c) => c.pin === 13);
    expect(pin13).toBeDefined();
    expect(pin13?.reverse).toBe(true);
    expect(pin13?.trimDeg).toBe(5);
  });

  it('saving with no changes leaves save button disabled', () => {
    renderTrimDialog();
    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    expect(saveBtn).toBeDisabled();
  });

  it('cancel button restores edited state (= localState reset to current store)', () => {
    renderTrimDialog();
    // edit
    const trimInput = screen.getAllByDisplayValue('0')[0] as HTMLInputElement;
    fireEvent.change(trimInput, { target: { value: '15' } });
    // hasChanges 確立で cancel ボタンが有効化
    const cancelBtn = screen.getByText(/キャンセル|Cancel/i).closest('button')!;
    expect(cancelBtn).not.toBeDisabled();
    fireEvent.click(cancelBtn);
    // 編集 state が初期値に戻る → cancel ボタン再 disable
    expect(cancelBtn).toBeDisabled();
    // store は変化なし
    expect(usePinPresetStore.getState().presets[0].servoConfig.trimDeg).toBe(0);
  });
});
