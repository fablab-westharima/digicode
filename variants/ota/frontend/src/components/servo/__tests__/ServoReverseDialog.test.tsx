/**
 * ServoReverseDialog tests (Session 156 設計変更で ServoTrimDialog から分離、 reverse 専用)
 *
 * Phase 3-A〜3-E で reverse layer 全層完成 (L1-L9)、 Session 156 設計変更で reverse 軸を
 * ServoTrimDialog から分離 → 専用 dialog (= ServoSpeedDialog 同 form pattern)。
 *
 * テスト軸:
 * - 一括 reverse の save → store.servoConfig.reverse 反映
 * - sibling field (pulse / speed / trim) は破壊されず維持 (Bug 2 fix 同 logic、 ServoPulseDialog.test と parallel)
 * - perPin 行追加 → store.servoConfig.perPinConfigs に entry 追加 (= reverse field のみ、 trim 不在)
 * - perPin Switch toggle → perPinConfigs[i].reverse 反映
 * - reset (キャンセル) → 編集前 state に戻る
 */
import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { ServoReverseDialog } from '../ServoReverseDialog';
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

function renderReverseDialog() {
  const onOpenChange = vi.fn();
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ServoReverseDialog open={true} onOpenChange={onOpenChange} />
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

describe('ServoReverseDialog Session 156: reverse 専用 pinPresetStore 直書き', () => {
  it('global reverse Switch toggle → save で store.servoConfig.reverse 反映', () => {
    renderReverseDialog();

    // global reverse Switch (role="switch"、 per-pin rows 空なので [0] = global)
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    expect(after.reverse).toBe(true);
    // trim は ServoTrimDialog 担当、 本 dialog では touch しない
    expect(after.trimDeg).toBe(0);
  });

  it('parallel structure: saving reverse preserves pulse + speed + trim sibling fields (Bug 2 fix 同 logic)', () => {
    // Pre-condition: pulse + speed + trim 既存設定あり
    resetStore({
      servoType: '270',
      minPulse: 600,
      maxPulse: 2500,
      speedDegPerSec: 180,
      trimDeg: 7,
    });
    renderReverseDialog();

    // global reverse toggle
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    // reverse 更新
    expect(after.reverse).toBe(true);
    // pulse / speed / trim sibling field 全件維持
    expect(after.servoType).toBe('270');
    expect(after.minPulse).toBe(600);
    expect(after.maxPulse).toBe(2500);
    expect(after.speedDegPerSec).toBe(180);
    expect(after.trimDeg).toBe(7);
  });

  it('perPin 行追加 + reverse Switch toggle → save で perPinConfigs entry 追加 (reverse field のみ、 trim 不在)', () => {
    renderReverseDialog();

    // 追加 button click
    const addBtn = screen.getByText(/追加|Add/i).closest('button')!;
    fireEvent.click(addBtn);

    // GPIO 入力 = 0 → 13
    const gpioInputs = screen.getAllByDisplayValue('0') as HTMLInputElement[];
    // 一括 reverse は Switch (Input ではない)、 perPin GPIO のみ 0 表示
    fireEvent.change(gpioInputs[0], { target: { value: '13' } });

    // perPin reverse Switch (= [1]、 [0] = global)
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]);

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    const pin13 = after.perPinConfigs?.find((c) => c.pin === 13);
    expect(pin13).toBeDefined();
    expect(pin13?.reverse).toBe(true);
    // 新規 entry には trim field 不在 (= trim override は ServoTrimDialog で別途設定の paradigm)
    expect(pin13?.trimDeg).toBeUndefined();
    // 新規 entry には global pulse 値が default で入る
    expect(pin13?.minPulse).toBe(500);
    expect(pin13?.maxPulse).toBe(2400);
  });

  it('perPin 既存 trim override 共存: reverse 行追加で trim entry の trimDeg field は維持', () => {
    // Pre-condition: pin 13 に既存 trim override (ServoTrimDialog で設定済み想定)
    resetStore({
      perPinConfigs: [{ pin: 13, minPulse: 500, maxPulse: 2400, trimDeg: 5 }],
    });
    renderReverseDialog();

    // perPin に行追加 (pin 27 + reverse true)
    const addBtn = screen.getByText(/追加|Add/i).closest('button')!;
    fireEvent.click(addBtn);

    // GPIO 0 → 27
    const gpioInputs = screen.getAllByDisplayValue('0') as HTMLInputElement[];
    fireEvent.change(gpioInputs[0], { target: { value: '27' } });

    // perPin reverse Switch toggle (= [1]、 [0] = global)
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]);

    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    fireEvent.click(saveBtn);

    const after = usePinPresetStore.getState().presets[0].servoConfig;
    // 既存 pin 13 trim entry は維持 (= sibling field 保護)
    const pin13 = after.perPinConfigs?.find((c) => c.pin === 13);
    expect(pin13).toBeDefined();
    expect(pin13?.trimDeg).toBe(5);
    expect(pin13?.reverse).toBeUndefined();  // reverse 行で touch されず
    // 新規 pin 27 reverse entry 追加
    const pin27 = after.perPinConfigs?.find((c) => c.pin === 27);
    expect(pin27).toBeDefined();
    expect(pin27?.reverse).toBe(true);
    expect(pin27?.trimDeg).toBeUndefined();  // trim 行不在で field なし
  });

  it('saving with no changes leaves save button disabled', () => {
    renderReverseDialog();
    const saveBtn = screen.getByText(/保存|Save/i).closest('button')!;
    expect(saveBtn).toBeDisabled();
  });

  it('cancel button restores edited state (= localState reset to current store)', () => {
    renderReverseDialog();
    // edit (global reverse toggle on)
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    // hasChanges 確立で cancel ボタンが有効化
    const cancelBtn = screen.getByText(/キャンセル|Cancel/i).closest('button')!;
    expect(cancelBtn).not.toBeDisabled();
    fireEvent.click(cancelBtn);
    // 編集 state が初期値に戻る → cancel ボタン再 disable
    expect(cancelBtn).toBeDisabled();
    // store は変化なし
    expect(usePinPresetStore.getState().presets[0].servoConfig.reverse).toBe(false);
  });
});
