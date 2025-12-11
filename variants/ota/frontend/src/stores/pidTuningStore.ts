/**
 * PID Parameter Tuning Store
 * Manages PID parameters for real-time tuning
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PIDPreset {
  id: string;
  name: string;
  kp: number;
  ki: number;
  kd: number;
  description?: string;
}

interface PIDTuningState {
  // Current PID values
  kp: number;
  ki: number;
  kd: number;

  // Presets
  presets: PIDPreset[];
  currentPresetId: string | null;

  // Actions
  setKp: (value: number) => void;
  setKi: (value: number) => void;
  setKd: (value: number) => void;
  setPID: (kp: number, ki: number, kd: number) => void;

  // Preset management
  savePreset: (name: string, description?: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;

  // Reset
  reset: () => void;
}

const defaultPresets: PIDPreset[] = [
  {
    id: 'default-line-trace',
    name: 'ライントレース（標準）',
    kp: 0.2,
    ki: 0.0001,
    kd: 5,
    description: '標準的なライントレース用設定'
  },
  {
    id: 'aggressive-line-trace',
    name: 'ライントレース（高速）',
    kp: 0.5,
    ki: 0.001,
    kd: 10,
    description: '高速走行向けの設定'
  },
  {
    id: 'smooth-line-trace',
    name: 'ライントレース（スムーズ）',
    kp: 0.1,
    ki: 0.00005,
    kd: 3,
    description: '滑らかな動きを優先した設定'
  },
  {
    id: 'micromouse-wall',
    name: 'マイクロマウス（壁追従）',
    kp: 1.0,
    ki: 0.01,
    kd: 15,
    description: '壁追従制御用の設定'
  }
];

export const usePIDTuningStore = create<PIDTuningState>()(
  persist(
    (set, get) => ({
      // Default values
      kp: 0.2,
      ki: 0.0001,
      kd: 5,

      presets: defaultPresets,
      currentPresetId: null,

      setKp: (value) => set({ kp: value, currentPresetId: null }),
      setKi: (value) => set({ ki: value, currentPresetId: null }),
      setKd: (value) => set({ kd: value, currentPresetId: null }),

      setPID: (kp, ki, kd) => set({ kp, ki, kd, currentPresetId: null }),

      savePreset: (name, description) => {
        const { kp, ki, kd, presets } = get();
        const id = `preset-${Date.now()}`;
        const newPreset: PIDPreset = { id, name, kp, ki, kd, description };
        set({ presets: [...presets, newPreset], currentPresetId: id });
      },

      loadPreset: (id) => {
        const preset = get().presets.find(p => p.id === id);
        if (preset) {
          set({ kp: preset.kp, ki: preset.ki, kd: preset.kd, currentPresetId: id });
        }
      },

      deletePreset: (id) => {
        // Don't delete default presets
        if (id.startsWith('default-') || id.startsWith('aggressive-') ||
            id.startsWith('smooth-') || id.startsWith('micromouse-')) {
          return;
        }
        const { presets, currentPresetId } = get();
        set({
          presets: presets.filter(p => p.id !== id),
          currentPresetId: currentPresetId === id ? null : currentPresetId
        });
      },

      reset: () => set({ kp: 0.2, ki: 0.0001, kd: 5, currentPresetId: null })
    }),
    {
      name: 'digicode-pid-tuning'
    }
  )
);
