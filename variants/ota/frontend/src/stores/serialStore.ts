import { create } from 'zustand';
import { serialService } from '@/services/serialService';
import type { ConnectionStatus } from '@/services/serialService';
import i18n from '@/i18n';

interface SerialState {
  status: ConnectionStatus;
  isSupported: boolean;
  output: string[];
  baudRate: number;

  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  send: (data: string) => Promise<boolean>;
  executeCode: (code: string) => Promise<boolean>;
  clearOutput: () => void;
  setBaudRate: (baudRate: number) => void;
  resetESP32: () => Promise<void>;
  forceReleaseAllPorts: () => Promise<number>;
}

const MAX_OUTPUT_LINES = 1000;

// ラインバッファ - チャンク間で不完全な行を保持
let lineBuffer = '';

/**
 * シリアルデータを適切にラインバッファリングして処理する
 * チャンクが行の途中で切れても、完全な行のみを出力に追加
 */
function processSerialData(
  data: string,
  currentOutput: string[]
): string[] {
  // バッファに新しいデータを追加
  lineBuffer += data;

  // 完全な行を抽出（\r\n または \n で終わる部分）
  const completeLines: string[] = [];
  let lastNewlineIndex = -1;

  for (let i = 0; i < lineBuffer.length; i++) {
    if (lineBuffer[i] === '\n') {
      // 改行を見つけた - その前までを1行として抽出
      let lineEnd = i;
      // \r\n の場合は \r も除去
      if (i > 0 && lineBuffer[i - 1] === '\r') {
        lineEnd = i - 1;
      }
      const line = lineBuffer.substring(lastNewlineIndex + 1, lineEnd);
      if (line.length > 0) {
        completeLines.push(line);
      }
      lastNewlineIndex = i;
    }
  }

  // バッファを更新（未処理の不完全な行のみ残す）
  if (lastNewlineIndex >= 0) {
    lineBuffer = lineBuffer.substring(lastNewlineIndex + 1);
  }

  // 新しい完全な行を出力に追加
  if (completeLines.length === 0) {
    return currentOutput;
  }

  const updatedOutput = [...currentOutput, ...completeLines];

  // 最大行数を超えたら古い行を削除
  if (updatedOutput.length > MAX_OUTPUT_LINES) {
    return updatedOutput.slice(-MAX_OUTPUT_LINES);
  }

  return updatedOutput;
}

export const useSerialStore = create<SerialState>((set, get) => ({
  status: 'disconnected',
  isSupported: serialService.isSupported,
  output: [],
  baudRate: 115200,

  connect: async () => {
    const { baudRate } = get();

    // 接続時にラインバッファをクリア
    lineBuffer = '';

    const success = await serialService.connect({
      baudRate,
      onData: (data) => {
        set((state) => ({
          output: processSerialData(data, state.output),
        }));
      },
      onStatusChange: (status) => {
        set({ status });
        // 切断時にラインバッファをクリア
        if (status === 'disconnected') {
          lineBuffer = '';
        }
      },
      onError: (error) => {
        console.error('Serial error:', error);
        set((state) => ({
          output: [...state.output, i18n.t('firmware.serial.errorPrefix', { defaultValue: '[エラー] {{message}}', message: error.message })],
        }));
      },
    });

    return success;
  },

  disconnect: async () => {
    await serialService.disconnect();
    // 切断時にラインバッファをクリア
    lineBuffer = '';
  },

  send: async (data: string) => {
    const success = await serialService.writeLine(data);
    if (success) {
      set((state) => ({
        output: [...state.output, `> ${data}`],
      }));
    }
    return success;
  },

  executeCode: async (code: string) => {
    set((state) => ({
      output: [...state.output, i18n.t('firmware.serial.running', { defaultValue: '[コード実行中...]' })],
    }));
    const success = await serialService.executeCode(code);
    if (!success) {
      set((state) => ({
        output: [...state.output, i18n.t('firmware.serial.runFailed', { defaultValue: '[コード実行失敗]' })],
      }));
    }
    return success;
  },

  clearOutput: () => {
    lineBuffer = '';
    set({ output: [] });
  },

  setBaudRate: (baudRate: number) => {
    set({ baudRate });
  },

  resetESP32: async () => {
    await serialService.resetESP32();
    set((state) => ({
      output: [...state.output, i18n.t('firmware.serial.resetDone', { defaultValue: '[ESP32をリセットしました]' })],
    }));
  },

  forceReleaseAllPorts: async () => {
    try {
      const releasedCount = await serialService.forceReleaseAllPorts();
      return releasedCount;
    } catch (error) {
      console.error('Failed to release USB ports:', error);
      throw error;
    }
  },
}));
