import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Block category groups. Each ID filters the toolbox to a function-oriented
// view; `all_blocks` opts out of filtering, `custom` is the favorite picker.
// Replaces the pre-Session-104 use-case-oriented modes (humanoid / wheel /
// transform / homeassistant / generic) — see persist `migrate` below for the
// legacy → new mapping.
export type RobotMode =
  | 'input'         // センサー入力系
  | 'output'        // 表示・音響・出力系
  | 'robotics'      // ロボット・モーター制御
  | 'network'       // 通信・無線・プロトコル
  | 'homeassistant' // Home Assistant 連携
  | 'storage_time'  // 永続化・時計・タイマー
  | 'gpio_bus'      // GPIO・I2C/SPI・割り込み・UART
  | 'programming'   // ロジック・データ型・I/O プリミティブ
  | 'all_blocks'    // 全ブロック表示
  | 'custom';       // お気に入り

// 各モードの情報
export interface RobotModeInfo {
  id: RobotMode;
  name: string;
  icon: string;
  description: string;
  // このモードで表示するブロックカテゴリ（参考用、実体は toolboxGenerator.MODE_CATEGORY_ORDER）
  categories: string[];
}

// ブロックカテゴリ群モード定義（D-9: flat 10 entry、グループなし）
export const ROBOT_MODES: Record<RobotMode, RobotModeInfo> = {
  input: {
    id: 'input',
    name: 'インプット',
    icon: '📥',
    description: 'センサー入力系のブロック',
    categories: [
      'sensor_digital', 'sensor_analog', 'sensor_ultrasonic', 'sensor_dht',
      'sensor_motion', 'sensor_environment', 'sensor_air_quality', 'sensor_current',
      'sensor_tof', 'sensor_encoder_mag', 'gps', 'sensor_line', 'sensor_qtr', 'sensor_wall',
      'microphone', 'flow_meter', 'apds9960', 'sensor_health', 'hx711', 'piezo',
      'esp32_touch', 'rfid', 'ir_remote', 'camera',
    ],
  },
  output: {
    id: 'output',
    name: 'アウトプット',
    icon: '📤',
    description: '表示・音響・出力系のブロック',
    categories: [
      'neopixel', 'neomatrix',
      'display', 'oled_ssd1306', 'tft_display', 'epaper', 'max7219', 'tm1637', 'm5stack',
      'buzzer', 'audio_dfplayer',
      'relay',
    ],
  },
  robotics: {
    id: 'robotics',
    name: 'ロボティクス',
    icon: '🤖',
    description: 'ロボットキット・モーター制御',
    categories: [
      'robot_humanoid', 'robot_wheel', 'robot_transform',
      'motor', 'diff_drive', 'encoder', 'pid',
      'servo', 'stepper', 'stepper_driver',
    ],
  },
  network: {
    id: 'network',
    name: 'ネットワーク',
    icon: '🌐',
    description: '通信・無線・プロトコル',
    categories: [
      'wifi', 'http', 'mqtt', 'websocket',
      'ble', 'espnow', 'lora', 'modbus',
      'iot_cloud', 'azure_iot', 'notification', 'google_services',
      'ota', 'json',
    ],
  },
  homeassistant: {
    id: 'homeassistant',
    name: 'Home Assistant',
    icon: '🏠',
    description: 'Home Assistant 連携 (ArduinoHA)',
    categories: ['arduino_ha'],
  },
  storage_time: {
    id: 'storage_time',
    name: 'ストレージ/時間',
    icon: '💾',
    description: '永続化・時計・タイマー',
    categories: ['time', 'ntp_time', 'rtc', 'storage_nvs', 'storage_fs'],
  },
  gpio_bus: {
    id: 'gpio_bus',
    name: 'GPIO/バス',
    icon: '🔌',
    description: 'GPIO・I2C/SPI・割り込み・UART・CAN',
    categories: ['gpio', 'interrupt', 'i2c_spi', 'uart_extra', 'can_bus'],
  },
  programming: {
    id: 'programming',
    name: 'ロジック/プログラミング',
    icon: '💡',
    description: 'プログラミング基礎・I/O プリミティブ',
    categories: [
      'serial',
      'logic', 'loops',
      'math', 'text', 'lists',
      'variables', 'functions',
    ],
  },
  all_blocks: {
    id: 'all_blocks',
    name: '全ブロック表示',
    icon: '📦',
    description: 'すべてのブロックを表示',
    categories: ['all'],
  },
  custom: {
    id: 'custom',
    name: 'お気に入り',
    icon: '⭐',
    description: 'よく使うブロックを登録',
    categories: ['all'],
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
      // D-7: 新規 user の default は all_blocks (Takeda anchor 「heavy user 及第点 = 全部見える」)
      mode: 'all_blocks',
      setMode: (mode) => set({ mode }),
      getModeInfo: () => ROBOT_MODES[get().mode],
    }),
    {
      name: 'robot-mode-storage',
      // version 1 → 2: Session 104 で旧 7 use-case-mode を新 10 function-category-mode に置換。
      //   旧 mode を持つ persisted state は以下の mapping で読み替え。
      //   未知 mode は default ('all_blocks') にフォールバック。
      //   OTTO migration (version 1 で導入) も継続維持。
      // sunset: 2027-05-12（Session 104 の 1 年後）以降、modeMap から旧 ID 群を削除し
      //   version 3 にバンプ。1 年以上 inactive な user は最後に使った mode が失われるが
      //   UX 影響 acceptable。
      migrate: (persistedState: unknown, _version: number) => {
        if (typeof persistedState !== 'object' || persistedState === null) {
          return persistedState;
        }
        const state = persistedState as { mode?: string };
        const modeMap: Record<string, RobotMode> = {
          // OTTO 系 (version 1 から継承、2027-04-21 sunset)
          otto_bipedal: 'robotics',
          otto_wheel: 'robotics',
          otto_ninja: 'robotics',
          micromouse: 'robotics',
          line_trace: 'robotics',
          // Pre-Session-104 use-case modes → function-category modes
          robots_humanoid: 'robotics',
          robots_wheel: 'robotics',
          robots_transform: 'robotics',
          generic: 'all_blocks',
          // homeassistant / all_blocks / custom はそのまま carry-over
        };
        const validNewModes = new Set<RobotMode>([
          'input', 'output', 'robotics', 'network', 'homeassistant',
          'storage_time', 'gpio_bus', 'programming', 'all_blocks', 'custom',
        ]);
        if (state.mode) {
          if (modeMap[state.mode]) {
            state.mode = modeMap[state.mode];
          } else if (!validNewModes.has(state.mode as RobotMode)) {
            // 未知 mode → default fallback
            state.mode = 'all_blocks';
          }
        }
        return state;
      },
      version: 2,
    }
  )
);
