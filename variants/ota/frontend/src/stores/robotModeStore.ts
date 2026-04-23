import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// モードの定義
export type RobotMode =
  | 'robots_humanoid'  // ヒューマノイドロボット
  | 'robots_wheel'     // 車輪ロボット（micromouse / line_trace 統合）
  | 'robots_transform' // 変形ロボット
  | 'homeassistant'    // Home Assistant
  | 'generic'          // 汎用デバイス
  | 'all_blocks'       // 全ブロック表示
  | 'custom';          // お気に入り

// モードのグループ定義
export type ModeGroup = 'robots' | 'iot' | 'other';

export interface ModeGroupInfo {
  id: ModeGroup;
  name: string;
  icon: string;
}

export const MODE_GROUPS: Record<ModeGroup, ModeGroupInfo> = {
  robots: { id: 'robots', name: 'Robots', icon: '🤖' },
  iot: { id: 'iot', name: 'IoT / スマートホーム', icon: '🏠' },
  other: { id: 'other', name: 'その他', icon: '⚙️' },
};

// 各モードの情報
export interface RobotModeInfo {
  id: RobotMode;
  name: string;
  icon: string;
  description: string;
  // このモードで表示するブロックカテゴリ（参考用）
  categories: string[];
  // グループ
  group: ModeGroup;
}

// ロボットモード定義
export const ROBOT_MODES: Record<RobotMode, RobotModeInfo> = {
  // Robots グループ
  robots_humanoid: {
    id: 'robots_humanoid',
    name: 'Humanoid',
    icon: '🤖',
    description: '4サーボ二足歩行ロボット',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'robot_humanoid',
      'sensor_ultrasonic',
    ],
    group: 'robots',
  },
  robots_wheel: {
    id: 'robots_wheel',
    name: 'Wheel',
    icon: '🛞',
    description: '車輪ロボット（2輪・競技）',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'robot_wheel',
      'motor', 'diff_drive', 'encoder', 'pid',
      'sensor_ultrasonic', 'sensor_line', 'sensor_qtr', 'sensor_wall',
    ],
    group: 'robots',
  },
  robots_transform: {
    id: 'robots_transform',
    name: 'Transform',
    icon: '🦾',
    description: '変形ロボット（歩行/走行変形）',
    categories: [
      'logic', 'loops', 'math', 'variables', 'functions',
      'time', 'serial',
      'robot_transform',
      'sensor_ultrasonic',
    ],
    group: 'robots',
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
      'neopixel',
    ],
    group: 'other',
  },
  all_blocks: {
    id: 'all_blocks',
    name: '全ブロック表示',
    icon: '📦',
    description: 'すべてのブロックを表示',
    categories: ['all'],
    group: 'other',
  },
  custom: {
    id: 'custom',
    name: 'お気に入り',
    icon: '⭐',
    description: 'よく使うブロックを登録',
    categories: ['all'],
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
      mode: 'robots_humanoid', // デフォルトは Humanoid
      setMode: (mode) => set({ mode }),
      getModeInfo: () => ROBOT_MODES[get().mode],
    }),
    {
      name: 'robot-mode-storage',
      // 旧モード名から新モード名へのマイグレーション
      migrate: (persistedState: any, _version: number) => {
        const modeMap: Record<string, RobotMode> = {
          otto_bipedal: 'robots_humanoid',
          otto_wheel: 'robots_wheel',
          otto_ninja: 'robots_transform',
          micromouse: 'robots_wheel',
          line_trace: 'robots_wheel',
        };
        if (persistedState?.mode && modeMap[persistedState.mode]) {
          persistedState.mode = modeMap[persistedState.mode];
        }
        return persistedState;
      },
      version: 1,
    }
  )
);
