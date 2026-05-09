import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 書き込み方法の種類
 * - wifi: WiFi OTA書き込み（単一デバイス）
 * - wifi-batch: WiFi OTA一括書き込み（複数デバイス）
 * - usb: USB直接書き込み（esptool-js, fullPackageモード）
 * - ble: Bluetooth Low Energy経由書き込み（NimBLEOta）
 * - bin-generic: ファームウェア書出し (.bin、汎用、ha_ota_setup なし時の通常 firmware)
 * - bin-ha-ota: ファームウェア書出し (.bin、Home Assistant OTA 対応、ha_ota_setup あり時)
 */
export type FlashMethod =
  | 'wifi'
  | 'wifi-batch'
  | 'usb'
  | 'ble'
  | 'bin-generic'
  | 'bin-ha-ota';

/**
 * 対応ボード定義 (OTA版) — ESP32 系 16 boards 専用 (M5Stack 9 + XIAO 3 + 汎用 4)。
 *
 * 56.md (2026-05-05): RP2040 系 4 boards を完全削除。lib_deps universe が
 * RP2040 で incompatible (ArduinoWebsockets 等が ESP32-only API 依存) で
 * compile fail し、Phase 3.5 (lib_deps 細分化) より削除を選択。永続的な
 * 技術的負債解消、保守工数削減。
 *
 * 5 軸フラグ:
 * - supportsWifi:        ユーザープログラムで WiFi.h / wifi_connect / MQTT / Home Assistant / HTTP 系を使えるか (BP1-2a)
 * - supportsOta:         WiFi OTA（無線）でのプログラム書き込みに対応するか（対応 FW が焼けるか）
 * - supportsBle:         ユーザープログラムで BLE を使えるか（BP4 で BLE ブロック実装時に参照）
 * - supportsEspNow:      ESP32 ↔ ESP32 直接通信 (esp_now.h) に対応するか。
 * - supportsHallSensor:  ESP32 内蔵 hall sensor (`hallRead()` API) を持つか。
 *                        **現時点で全 16 boards `false`**: arduino-esp32 v3.2.1
 *                        で `hallRead()` 宣言が **全 chip family** から削除済
 *                        (ML30 内 packages 直接 grep で 0 hits 実証、2026-05-06
 *                        commit 4)。元祖 ESP32 (xtensa LX6) は hall 素子自体は
 *                        持つが Arduino core からアクセス不能、ESP32-S3
 *                        (xtensa LX7) と C3/C6 (RISC-V) は素子そのものが無い。
 *                        post-Phase 4-4 commit 4 で block-level board guard
 *                        機構として導入、将来 v4 で復活 or 新 chip 追加時に
 *                        該当 board のみ true にして再利用する。
 *
 * ツールボックスの可視性フィルタ（toolboxGenerator）とブロックジェネレータの
 * 条件分岐（wifiBlocks / servoBlocks 等）がこのフラグを参照する。
 * supportsWifi/Ota/Ble/EspNow は category-level filter (5 flag → カテゴリ単位)、
 * supportsHallSensor は block-level filter (個別 block 単位、新機構)。
 */
export interface BoardDefinition {
  id: string;
  name: string;
  fqbn: string;
  description: string;
  category: 'generic' | 'm5stack' | 'xiao';
  supportsWifi: boolean;
  supportsOta: boolean;
  supportsBle: boolean;
  supportsEspNow: boolean;
  supportsHallSensor: boolean;
  supportedFlashMethods: FlashMethod[];
  /**
   * BUG-073: True for boards we ship UI access to but cannot guarantee
   * compile/runtime quality on. Excluded from probabilistic-debug case
   * generation (and therefore from the release passRate denominator) and
   * surfaced in BoardSelector with an "実験的サポート" badge so users know
   * they are off the supported path.
   */
  experimental?: boolean;
}

/**
 * カテゴリ表示名 (OTA版)
 * 実際の UI 表示は i18n キー `boardSelector.categories.<id>` で行われる。
 * こちらはフォールバック/参考用。
 */
export const CATEGORY_LABELS: Record<BoardDefinition['category'], string> = {
  generic: '汎用 ESP32',
  m5stack: 'M5Stack シリーズ',
  xiao: 'Seeed Xiao シリーズ',
};

/**
 * 対応ボード一覧 (OTA版) — ESP32 系 16 boards (M5Stack 9 + XIAO 3 + 汎用 4)。
 *
 * カテゴリ表示順序 (UI、`memory:factory_scientist_course` 講座受講者は M5Stack
 * 系を主に使うため最上位):
 *   1. M5Stack 系 (上)
 *   2. XIAO 系 (Seeed)
 *   3. ESP32 Devkit 系 (汎用 ESP32、下)
 *
 * 各カテゴリ内は **発売日が新しい順** に並べる (受講者が最新製品を見つけやすく)。
 * BoardSelector.tsx の SelectGroup 順序もこの並びに合わせる。
 *
 * 販売終了 / 在庫限り表記:
 *   - M5Stack Gray (生産終了、後継 = M5Stack Basic v2.7 / Fire / Core2)
 *   - M5StickC Plus (在庫限り、後継 = M5StickC Plus2)
 *   - M5Stamp Pico 初代 (生産終了、後継 = M5Stamp Pico Mate)
 */
export const SUPPORTED_BOARDS: BoardDefinition[] = [
  // ===== 1. M5Stack 系 (発売日新しい順、9 boards) =====
  {
    id: 'm5stamp-s3-bat',
    name: 'M5StampS3 BAT',
    fqbn: 'esp32:esp32:esp32s3',
    description: 'IoT/バッテリー対応、ESP32-S3FN8 (8MB Flash)、1.27mmピッチ、OTA可',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-S3 (xtensa LX7、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'm5stack-atoms3-lite',
    name: 'ATOMS3 Lite',
    fqbn: 'm5stack:esp32:m5stack_atoms3',
    description: '24x24mm、ESP32-S3FN8 (8MB Flash)、RGB LED、OTA可',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-S3 (xtensa LX7、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'm5stamp-s3a',
    name: 'M5StampS3A',
    fqbn: 'esp32:esp32:esp32s3',
    description: '1.27mmピッチ、ESP32-S3搭載、OTA可',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-S3 (xtensa LX7、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'm5stamp-c3',
    name: 'M5Stamp C3/C3U',
    fqbn: 'esp32:esp32:esp32c3',
    description: 'C3搭載スタンプ型、OTA可',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-C3 (RISC-V、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'm5stickc-plus',
    name: 'M5StickC Plus',
    fqbn: 'm5stack:esp32:m5stick_c_plus',
    description: '1.14インチ画面、IMU搭載、OTA可（在庫限り、後継: M5StickC Plus2）',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-PICO-D4 (xtensa LX6、hall 素子はあるが arduino-esp32 v3 で API 削除)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'atom-lite',
    name: 'ATOM Lite',
    fqbn: 'm5stack:esp32:atom_lite',
    description: '24x24mm、RGB LED、OTA可',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-PICO-D4 (xtensa LX6、hall 素子はあるが arduino-esp32 v3 で API 削除)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'atom-matrix',
    name: 'ATOM Matrix',
    fqbn: 'm5stack:esp32:atom_matrix',
    description: '24x24mm、5x5 LED、IMU、OTA可',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-PICO-D4 (xtensa LX6、hall 素子はあるが arduino-esp32 v3 で API 削除)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'm5stamp-pico',
    name: 'M5Stamp Pico',
    fqbn: 'm5stack:esp32:stamp_pico',
    description: '超小型スタンプ型、OTA可（初代、生産終了。後継: M5Stamp Pico Mate）',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-PICO (xtensa LX6、hall 素子はあるが arduino-esp32 v3 で API 削除)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'm5stack-basic',
    name: 'M5Stack Basic/Gray/Fire',
    fqbn: 'm5stack:esp32:m5stack_core',
    description: '2.0インチ画面、ボタン3個、OTA可（Gray は生産終了）',
    category: 'm5stack',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32 (xtensa LX6、hall 素子はあるが arduino-esp32 v3 で API 削除)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  // ===== 2. XIAO 系 (発売日新しい順、4 boards) =====
  {
    id: 'xiao-esp32c6',
    name: 'XIAO ESP32C6',
    fqbn: 'esp32:esp32:esp32c6',
    description: '21x17.5mm、WiFi 6、OTA可',
    category: 'xiao',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-C6 (RISC-V、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'xiao-esp32s3',
    name: 'XIAO ESP32S3',
    fqbn: 'esp32:esp32:esp32s3',
    description: '21x17.5mm、カメラ対応、OTA可',
    category: 'xiao',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-S3 (xtensa LX7、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'xiao-esp32c3',
    name: 'XIAO ESP32C3',
    fqbn: 'esp32:esp32:esp32c3',
    description: '21x17.5mm、RISC-V、OTA可',
    category: 'xiao',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-C3 (RISC-V、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  // ===== 3. ESP32 Devkit 系 (汎用、発売日新しい順、4 boards) =====
  {
    id: 'esp32-c6-generic',
    name: 'ESP32-C6',
    fqbn: 'esp32:esp32:esp32c6',
    description: 'WiFi 6、Thread/Zigbee、OTA可',
    category: 'generic',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-C6 (RISC-V、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'esp32-s3-generic',
    name: 'ESP32-S3',
    fqbn: 'esp32:esp32:esp32s3',
    description: 'USB OTG、カメラ対応、OTA可',
    category: 'generic',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-S3 (xtensa LX7、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'esp32-c3-generic',
    name: 'ESP32-C3',
    fqbn: 'esp32:esp32:esp32c3',
    description: 'RISC-V、省電力、OTA可',
    category: 'generic',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-C3 (RISC-V、hall 素子なし)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
  {
    id: 'esp32-generic',
    name: 'ESP32（無印）',
    fqbn: 'esp32:esp32:esp32',
    description: 'ESP32-WROOM等、OTA可',
    category: 'generic',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportsEspNow: true,
    supportsHallSensor: false, // ESP32-WROOM (xtensa LX6、hall 素子はあるが arduino-esp32 v3 で API 削除)
    supportedFlashMethods: ['wifi', 'usb', 'ble', 'bin-generic', 'bin-ha-ota'],
  },
];

/**
 * ボード選択ストア
 */
interface BoardStore {
  selectedBoardId: string;
  setSelectedBoard: (boardId: string) => void;
  getSelectedBoard: () => BoardDefinition;
  getFqbn: () => string;
}

export const useBoardStore = create<BoardStore>()(
  persist(
    (set, get) => ({
      selectedBoardId: 'esp32-generic',

      setSelectedBoard: (boardId: string) => {
        const board = SUPPORTED_BOARDS.find(b => b.id === boardId);
        if (board) {
          set({ selectedBoardId: boardId });
        }
      },

      getSelectedBoard: () => {
        const { selectedBoardId } = get();
        return SUPPORTED_BOARDS.find(b => b.id === selectedBoardId) || SUPPORTED_BOARDS[0];
      },

      getFqbn: () => {
        return get().getSelectedBoard().fqbn;
      },
    }),
    {
      name: 'board-selection-storage',
      version: 1,
    }
  )
);
