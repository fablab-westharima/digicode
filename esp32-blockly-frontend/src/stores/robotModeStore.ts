import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// モードの定義
export type RobotMode =
  | 'otto_bipedal'    // OTTO 二足歩行
  | 'otto_wheel'      // OTTO Wheel
  | 'otto_ninja'      // OTTO Ninja
  | 'micromouse'      // マイクロマウス
  | 'line_trace'      // ロボトレース
  | 'homeassistant'   // Home Assistant
  | 'generic'         // 汎用デバイス
  | 'all_blocks'      // 全ブロック表示
  | 'custom';         // お気に入り

// モードのグループ定義
export type ModeGroup = 'otto' | 'competition' | 'iot' | 'other';

export interface ModeGroupInfo {
  id: ModeGroup;
  name: string;
  icon: string;
}

export const MODE_GROUPS: Record<ModeGroup, ModeGroupInfo> = {
  otto: { id: 'otto', name: 'OTTO ロボット', icon: '🤖' },
  competition: { id: 'competition', name: '競技ロボット', icon: '🏆' },
  iot: { id: 'iot', name: 'IoT / スマートホーム', icon: '🏠' },
  other: { id: 'other', name: 'その他', icon: '⚙️' },
};

// 各モードの情報
export interface RobotModeInfo {
  id: RobotMode;
  name: string;
  icon: string;
  description: string;
  // このモードで表示するブロックカテゴリ
  categories: string[];
  // グループ
  group: ModeGroup;
}

// ロボットモード定義
export const ROBOT_MODES: Record<RobotMode, RobotModeInfo> = {
  // OTTO ロボット
  otto_bipedal: {
    id: 'otto_bipedal',
    name: 'OTTO 二足歩行',
    icon: '🤖',
    description: '4サーボ二足歩行ロボット',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'otto_bipedal', // 専用カテゴリ
      'sensor_ultrasonic', // 超音波センサー
    ],
    group: 'otto',
  },
  otto_wheel: {
    id: 'otto_wheel',
    name: 'OTTO Wheel',
    icon: '🛞',
    description: '2輪駆動ロボット',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'otto_wheel', // 専用カテゴリ
      'sensor_ultrasonic',
    ],
    group: 'otto',
  },
  otto_ninja: {
    id: 'otto_ninja',
    name: 'OTTO Ninja',
    icon: '🦾',
    description: '歩行/走行変形ロボット',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'otto_ninja', // 専用カテゴリ
      'sensor_ultrasonic',
    ],
    group: 'otto',
  },
  // 競技ロボット
  micromouse: {
    id: 'micromouse',
    name: 'マイクロマウス',
    icon: '🐭',
    description: '迷路探索ロボット',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'motor', 'encoder',
      'sensor_wall', 'sensor_ultrasonic',
      'pid',
    ],
    group: 'competition',
  },
  line_trace: {
    id: 'line_trace',
    name: 'ロボトレース',
    icon: '🏎️',
    description: 'ライントレースロボット',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'motor', 'encoder',
      'sensor_line',
      'pid',
    ],
    group: 'competition',
  },
  // IoT / スマートホーム
  homeassistant: {
    id: 'homeassistant',
    name: 'Home Assistant',
    icon: '🏠',
    description: 'IoT/スマートホーム連携',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'mqtt',
      'sensor_dht', 'sensor_digital', 'sensor_analog',
      'gpio', 'neopixel',
    ],
    group: 'iot',
  },
  // その他
  generic: {
    id: 'generic',
    name: '汎用デバイス',
    icon: '🔧',
    description: 'マイコン工作・電子工作向け',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'gpio',
      'sensor_digital', 'sensor_analog', 'sensor_dht', 'sensor_ultrasonic',
      'actuator', 'neopixel',
    ],
    group: 'other',
  },
  all_blocks: {
    id: 'all_blocks',
    name: '全ブロック表示',
    icon: '📦',
    description: 'すべてのブロックを表示',
    categories: ['all'], // 全カテゴリ表示
    group: 'other',
  },
  custom: {
    id: 'custom',
    name: 'お気に入り',
    icon: '⭐',
    description: 'よく使うブロックを登録',
    categories: ['all'], // 全カテゴリ表示（お気に入り設定で絞り込む）
    group: 'other',
  },
};

interface RobotModeState {
  mode: RobotMode;
  setMode: (mode: RobotMode) => void;
  getModeInfo: () => RobotModeInfo;
}

export const useRobotModeStore = create<RobotModeState>()(
  persist(
    (set, get) => ({
      mode: 'otto_bipedal', // デフォルトはOTTO二足歩行
      setMode: (mode) => set({ mode }),
      getModeInfo: () => ROBOT_MODES[get().mode],
    }),
    {
      name: 'robot-mode-storage', // localStorageのキー
    }
  )
);
