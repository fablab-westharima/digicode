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
 * OTA版ではESP32シリーズのみサポート
 */
export interface BoardDefinition {
  id: string;
  name: string;
  fqbn: string;
  description: string;
  category: 'generic' | 'm5stack' | 'xiao';
  supportsOta: boolean; // OTA（無線）書き込み対応
  supportedFlashMethods: FlashMethod[]; // 対応する書き込み方法
}

/**
 * カテゴリ表示名 (OTA版)
 * OTA版ではESP32対応カテゴリのみ
 */
export const CATEGORY_LABELS: Record<BoardDefinition['category'], string> = {
  generic: '汎用 ESP32',
  m5stack: 'M5Stack シリーズ',
  xiao: 'Seeed Xiao シリーズ',
};

/**
 * 対応ボード一覧 (OTA版)
 * OTA版ではESP32シリーズのみサポート（WiFi OTA書き込み対応）
 */
export const SUPPORTED_BOARDS: BoardDefinition[] = [
  // 汎用 ESP32（メーカー不問）
  {
    id: 'esp32-generic',
    name: 'ESP32（無印）',
    fqbn: 'esp32:esp32:esp32',
    description: 'ESP32-WROOM等、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'esp32-s3-generic',
    name: 'ESP32-S3',
    fqbn: 'esp32:esp32:esp32s3',
    description: 'USB OTG、カメラ対応、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'esp32-c3-generic',
    name: 'ESP32-C3',
    fqbn: 'esp32:esp32:esp32c3',
    description: 'RISC-V、省電力、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'esp32-c6-generic',
    name: 'ESP32-C6',
    fqbn: 'esp32:esp32:esp32c6',
    description: 'WiFi 6、Thread/Zigbee、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  // M5Stackシリーズ
  {
    id: 'm5stack-basic',
    name: 'M5Stack Basic/Gray/Fire',
    fqbn: 'm5stack:esp32:m5stack_core',
    description: '2.0インチ画面、ボタン3個、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'm5stickc-plus',
    name: 'M5StickC Plus',
    fqbn: 'm5stack:esp32:m5stick_c_plus',
    description: '1.14インチ画面、IMU搭載、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'atom-lite',
    name: 'ATOM Lite',
    fqbn: 'm5stack:esp32:atom_lite',
    description: '24x24mm、RGB LED、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'atom-matrix',
    name: 'ATOM Matrix',
    fqbn: 'm5stack:esp32:atom_matrix',
    description: '24x24mm、5x5 LED、IMU、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'm5stamp-pico',
    name: 'M5Stamp Pico',
    fqbn: 'm5stack:esp32:stamp_pico',
    description: '超小型スタンプ型、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'm5stamp-c3',
    name: 'M5Stamp C3/C3U',
    fqbn: 'esp32:esp32:esp32c3',
    description: 'C3搭載スタンプ型、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  // Seeed Xiaoシリーズ
  {
    id: 'xiao-esp32c3',
    name: 'XIAO ESP32C3',
    fqbn: 'esp32:esp32:esp32c3',
    description: '21x17.5mm、RISC-V、OTA可',
    category: 'xiao',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'xiao-esp32s3',
    name: 'XIAO ESP32S3',
    fqbn: 'esp32:esp32:esp32s3',
    description: '21x17.5mm、カメラ対応、OTA可',
    category: 'xiao',
    supportsOta: true,
    supportedFlashMethods: ['wifi', 'wifi-batch', 'usb', 'ble'],
  },
  {
    id: 'xiao-esp32c6',
    name: 'XIAO ESP32C6',
    fqbn: 'esp32:esp32:esp32c6',
    description: '21x17.5mm、WiFi 6、OTA可',
    category: 'xiao',
    supportsOta: true,
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
