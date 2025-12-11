import { create } from 'zustand';
import { bluetoothService } from '@/services/bluetoothService';
import type { ConnectionStatus } from '@/services/bluetoothService';

interface BluetoothState {
  status: ConnectionStatus;
  isSupported: boolean;
  output: string[];

  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  send: (data: string) => Promise<boolean>;
  executeCode: (code: string) => Promise<boolean>;
  uploadFile: (filename: string, content: string) => Promise<boolean>;
  clearOutput: () => void;
  resetESP32: () => Promise<void>;
  interrupt: () => Promise<void>;
}

const MAX_OUTPUT_LINES = 1000;

export const useBluetoothStore = create<BluetoothState>((set) => ({
  status: 'disconnected',
  isSupported: bluetoothService.isSupported,
  output: [],

  connect: async () => {
    const success = await bluetoothService.connect({
      onData: (data) => {
        set((state) => {
          // 改行で分割して追加
          const newLines = data.split(/\r?\n/).filter(line => line.length > 0);
          const updatedOutput = [...state.output, ...newLines];

          // 最大行数を超えたら古い行を削除
          if (updatedOutput.length > MAX_OUTPUT_LINES) {
            return { output: updatedOutput.slice(-MAX_OUTPUT_LINES) };
          }
          return { output: updatedOutput };
        });
      },
      onStatusChange: (status) => {
        set({ status });
      },
      onError: (error) => {
        console.error('Bluetooth error:', error);
        set((state) => ({
          output: [...state.output, `[エラー] ${error.message}`],
        }));
      },
    });

    return success;
  },

  disconnect: async () => {
    await bluetoothService.disconnect();
  },

  send: async (data: string) => {
    const success = await bluetoothService.writeLine(data);
    if (success) {
      set((state) => ({
        output: [...state.output, `> ${data}`],
      }));
    }
    return success;
  },

  executeCode: async (code: string) => {
    set((state) => ({
      output: [...state.output, '[コード実行中...]'],
    }));
    const success = await bluetoothService.executeCode(code);
    if (!success) {
      set((state) => ({
        output: [...state.output, '[コード実行失敗]'],
      }));
    }
    return success;
  },

  uploadFile: async (filename: string, content: string) => {
    set((state) => ({
      output: [...state.output, `[ファイルアップロード中: ${filename}]`],
    }));
    const success = await bluetoothService.uploadFile(filename, content);
    if (success) {
      set((state) => ({
        output: [...state.output, `[アップロード完了: ${filename}]`],
      }));
    } else {
      set((state) => ({
        output: [...state.output, `[アップロード失敗: ${filename}]`],
      }));
    }
    return success;
  },

  clearOutput: () => {
    set({ output: [] });
  },

  resetESP32: async () => {
    await bluetoothService.resetESP32();
    set((state) => ({
      output: [...state.output, '[ESP32をリセットしました]'],
    }));
  },

  interrupt: async () => {
    await bluetoothService.interrupt();
    set((state) => ({
      output: [...state.output, '[実行を中断しました]'],
    }));
  },
}));
