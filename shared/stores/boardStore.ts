import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 書き込み方法の種類
 */
export type FlashMethod = 'usb' | 'wifi' | 'wifi-batch' | 'download-bin' | 'download-uf2';

/**
 * 対応ボード定義
 */
export interface BoardDefinition {
  id: string;
  name: string;
  fqbn: string;
  description: string;
  category: 'generic' | 'm5stack' | 'xiao' | 'arduino' | 'esp8266' | 'rp2040';
  supportsOta: boolean; // OTA（無線）書き込み対応
  supportedFlashMethods: FlashMethod[]; // 対応する書き込み方法
}

/**
 * カテゴリ表示名
 */
export const CATEGORY_LABELS: Record<BoardDefinition['category'], string> = {
  generic: '汎用 ESP32',
  m5stack: 'M5Stack シリーズ',
  xiao: 'Seeed Xiao シリーズ',
  arduino: 'Arduino',
  esp8266: 'ESP8266',
  rp2040: 'Raspberry Pi / RP2040',
};

/**
 * 対応ボード一覧
 */
export const SUPPORTED_BOARDS: BoardDefinition[] = [
  // Arduino
  {
    id: 'arduino-uno',
    name: 'Arduino Uno',
    fqbn: 'arduino:avr:uno',
    description: 'ATmega328P、有線のみ',
    category: 'arduino',
    supportsOta: false,
    supportedFlashMethods: ['usb', 'download-bin'],
  },
  {
    id: 'arduino-nano',
    name: 'Arduino Nano',
    fqbn: 'arduino:avr:nano',
    description: 'ATmega328P、有線のみ',
    category: 'arduino',
    supportsOta: false,
    supportedFlashMethods: ['usb', 'download-bin'],
  },
  {
    id: 'arduino-nano-old',
    name: 'Arduino Nano (Old Bootloader)',
    fqbn: 'arduino:avr:nano:cpu=atmega328old',
    description: 'ATmega328P (旧ブートローダー)、有線のみ',
    category: 'arduino',
    supportsOta: false,
    supportedFlashMethods: ['usb', 'download-bin'],
  },
  {
    id: 'arduino-mega',
    name: 'Arduino Mega 2560',
    fqbn: 'arduino:avr:mega',
    description: 'ATmega2560、有線のみ',
    category: 'arduino',
    supportsOta: false,
    supportedFlashMethods: ['usb', 'download-bin'],
  },
  // ESP8266
  {
    id: 'esp8266-generic',
    name: 'ESP8266 Generic',
    fqbn: 'esp8266:esp8266:generic',
    description: 'WiFi対応、OTA可',
    category: 'esp8266',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'nodemcu',
    name: 'NodeMCU 1.0 (ESP-12E)',
    fqbn: 'esp8266:esp8266:nodemcuv2',
    description: 'WiFi対応、OTA可',
    category: 'esp8266',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'wemos-d1-mini',
    name: 'WEMOS D1 Mini',
    fqbn: 'esp8266:esp8266:d1_mini',
    description: 'WiFi対応、OTA可',
    category: 'esp8266',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  // 汎用 ESP32（メーカー不問）
  {
    id: 'esp32-generic',
    name: 'ESP32（無印）',
    fqbn: 'esp32:esp32:esp32',
    description: 'ESP32-WROOM等、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'esp32-s3-generic',
    name: 'ESP32-S3',
    fqbn: 'esp32:esp32:esp32s3',
    description: 'USB OTG、カメラ対応、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'esp32-c3-generic',
    name: 'ESP32-C3',
    fqbn: 'esp32:esp32:esp32c3',
    description: 'RISC-V、省電力、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'esp32-c6-generic',
    name: 'ESP32-C6',
    fqbn: 'esp32:esp32:esp32c6',
    description: 'WiFi 6、Thread/Zigbee、OTA可',
    category: 'generic',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  // M5Stackシリーズ
  {
    id: 'm5stack-basic',
    name: 'M5Stack Basic/Gray/Fire',
    fqbn: 'm5stack:esp32:m5stack_core',
    description: '2.0インチ画面、ボタン3個、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'm5stickc-plus',
    name: 'M5StickC Plus',
    fqbn: 'm5stack:esp32:m5stick_c_plus',
    description: '1.14インチ画面、IMU搭載、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'atom-lite',
    name: 'ATOM Lite',
    fqbn: 'm5stack:esp32:atom_lite',
    description: '24x24mm、RGB LED、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'atom-matrix',
    name: 'ATOM Matrix',
    fqbn: 'm5stack:esp32:atom_matrix',
    description: '24x24mm、5x5 LED、IMU、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'm5stamp-pico',
    name: 'M5Stamp Pico',
    fqbn: 'm5stack:esp32:stamp_pico',
    description: '超小型スタンプ型、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'm5stamp-c3',
    name: 'M5Stamp C3/C3U',
    fqbn: 'esp32:esp32:esp32c3',
    description: 'C3搭載スタンプ型、OTA可',
    category: 'm5stack',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  // Seeed Xiaoシリーズ
  {
    id: 'xiao-esp32c3',
    name: 'XIAO ESP32C3',
    fqbn: 'esp32:esp32:esp32c3',
    description: '21x17.5mm、RISC-V、OTA可',
    category: 'xiao',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'xiao-esp32s3',
    name: 'XIAO ESP32S3',
    fqbn: 'esp32:esp32:esp32s3',
    description: '21x17.5mm、カメラ対応、OTA可',
    category: 'xiao',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  {
    id: 'xiao-esp32c6',
    name: 'XIAO ESP32C6',
    fqbn: 'esp32:esp32:esp32c6',
    description: '21x17.5mm、WiFi 6、OTA可',
    category: 'xiao',
    supportsOta: true,
    supportedFlashMethods: ['usb', 'wifi', 'wifi-batch', 'download-bin'],
  },
  // RP2040シリーズ
  {
    id: 'raspberry-pi-pico',
    name: 'Raspberry Pi Pico',
    fqbn: 'rp2040:rp2040:rpipico',
    description: 'RP2040、264KB RAM、USB書き込み',
    category: 'rp2040',
    supportsOta: false,
    supportedFlashMethods: ['download-uf2'],
  },
  {
    id: 'raspberry-pi-pico-w',
    name: 'Raspberry Pi Pico W',
    fqbn: 'rp2040:rp2040:rpipicow',
    description: 'RP2040 + WiFi、USB書き込み',
    category: 'rp2040',
    supportsOta: false,
    supportedFlashMethods: ['download-uf2'],
  },
  {
    id: 'xiao-rp2040',
    name: 'XIAO RP2040',
    fqbn: 'rp2040:rp2040:seeed_xiao_rp2040',
    description: '21x17.5mm、小型、USB書き込み',
    category: 'rp2040',
    supportsOta: false,
    supportedFlashMethods: ['download-uf2'],
  },
  {
    id: 'adafruit-kb2040',
    name: 'Adafruit KB2040',
    fqbn: 'rp2040:rp2040:adafruit_kb2040',
    description: 'Pro Micro互換、USB書き込み',
    category: 'rp2040',
    supportsOta: false,
    supportedFlashMethods: ['download-uf2'],
  },
  {
    id: 'arduino-nano-rp2040-connect',
    name: 'Arduino Nano RP2040 Connect',
    fqbn: 'arduino:mbed_nano:nanorp2040connect',
    description: 'WiFi/BLE搭載、Arduino公式、USB書き込み',
    category: 'rp2040',
    supportsOta: false,
    supportedFlashMethods: ['download-uf2'],
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
