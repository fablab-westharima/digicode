import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 書き込み方法の種類
 * - wifi: WiFi OTA書き込み（単一デバイス）
 * - wifi-batch: WiFi OTA一括書き込み（複数デバイス）
 * - usb: USB直接書き込み（esptool-js, fullPackageモード）
 * - ble: Bluetooth Low Energy経由書き込み（NimBLEOta）
 */
export type FlashMethod = 'wifi' | 'wifi-batch' | 'usb' | 'ble';

/**
 * 対応ボード定義 (OTA版)
 * ESP32 系を中心に、RP2040 系（Pico/Pico W/XIAO RP2040/Nano RP2040 Connect）にも対応。
 *
 * 3 軸フラグ (2026-04-20, BP1-2a で導入):
 * - supportsWifi: ユーザープログラムで WiFi.h / wifi_connect / MQTT / Home Assistant / HTTP 系を使えるか
 * - supportsOta:  WiFi OTA（無線）でのプログラム書き込みに対応するか（対応 FW が焼けるか）
 * - supportsBle:  ユーザープログラムで BLE を使えるか（BP4 で BLE ブロック実装時に参照）
 *
 * ツールボックスの可視性フィルタ（toolboxGenerator）とブロックジェネレータの
 * 条件分岐（wifiBlocks / servoBlocks 等）がこのフラグを参照する。
 */
export interface BoardDefinition {
  id: string;
  name: string;
  fqbn: string;
  description: string;
  category: 'generic' | 'm5stack' | 'xiao' | 'rp2040';
  supportsWifi: boolean;
  supportsOta: boolean;
  supportsBle: boolean;
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
  rp2040: 'Raspberry Pi / RP2040',
};

/**
 * 対応ボード一覧 (OTA版)
 *
 * カテゴリ表示順序 (UI、`memory:factory_scientist_course` 講座受講者は M5Stack
 * 系を主に使うため最上位):
 *   1. M5Stack 系 (上)
 *   2. XIAO 系 (Seeed)
 *   3. Raspberry Pi 系 (Pico / Nano RP2040 Connect)
 *   4. ESP32 Devkit 系 (汎用 ESP32、下)
 *
 * 各カテゴリ内は **発売日が新しい順** に並べる (受講者が最新製品を見つけやすく)。
 * BoardSelector.tsx の SelectGroup 順序もこの並びに合わせる。
 *
 * M5StackS3 BAT は 2024 投入の IoT/バッテリー対応 ESP32-S3 board。
 * 2026-04-30 ボード UI 整理タスクで追加 (改定log 第62回)、20 boards に拡張。
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'rp2040-xiao',
    name: 'XIAO RP2040',
    fqbn: 'rp2040:rp2040:seeed_xiao_rp2040',
    description: '21x17.5mm、RP2040、USB書き込みのみ',
    category: 'xiao',
    supportsWifi: false,
    supportsOta: false,
    supportsBle: false,
    supportedFlashMethods: ['usb'],
    // BUG-073: PIO raspberrypi platform missing 'seeed_xiao_rp2040' board.json.
    experimental: true,
  },
  // ===== 3. Raspberry Pi 系 (発売日新しい順、3 boards) =====
  // DigiCodeOTA ファームウェアが ESP32 専用のため OTA 非対応、USB 書き込みのみ。
  {
    id: 'rp2040-pico-w',
    name: 'Raspberry Pi Pico W',
    fqbn: 'rp2040:rp2040:rpipicow',
    description: 'RP2040 + CYW43439、WiFi対応、USB書き込みのみ',
    category: 'rp2040',
    supportsWifi: true,
    supportsOta: false,
    supportsBle: false,
    supportedFlashMethods: ['usb'],
    // BUG-073: framework-arduino-mbed WiFi.cpp upstream bug (`ap_list`
    // not declared) leaks into the resolved framework path.
    experimental: true,
  },
  {
    id: 'rp2040-nano-connect',
    name: 'Arduino Nano RP2040 Connect',
    fqbn: 'arduino:mbed_nano:nanorp2040connect',
    description: 'RP2040 + NINA-W102、WiFi対応、USB書き込みのみ',
    category: 'rp2040',
    supportsWifi: true,
    supportsOta: false,
    supportsBle: false,
    supportedFlashMethods: ['usb'],
    // BUG-073: arduino-mbed core has no PIO equivalent; falling back through
    // raspberrypi/pico still pulls in framework-arduino-mbed WiFi.cpp.
    experimental: true,
  },
  {
    id: 'rp2040-pico',
    name: 'Raspberry Pi Pico',
    fqbn: 'rp2040:rp2040:rpipico',
    description: 'RP2040、USB書き込みのみ',
    category: 'rp2040',
    supportsWifi: false,
    supportsOta: false,
    supportsBle: false,
    supportedFlashMethods: ['usb'],
    // BUG-073: shares the framework resolution problem with the pico-w
    // variant; kept experimental until the RP2040 framework story is fixed.
    experimental: true,
  },
  // ===== 4. ESP32 Devkit 系 (汎用、発売日新しい順、4 boards) =====
  {
    id: 'esp32-c6-generic',
    name: 'ESP32-C6',
    fqbn: 'esp32:esp32:esp32c6',
    description: 'WiFi 6、Thread/Zigbee、OTA可',
    category: 'generic',
    supportsWifi: true,
    supportsOta: true,
    supportsBle: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
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
