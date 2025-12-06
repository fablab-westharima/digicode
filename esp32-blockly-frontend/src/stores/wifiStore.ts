import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WifiState {
  status: ConnectionStatus;
  host: string;  // mDNSホスト名 (例: esp32-robot001.local)
  deviceName: string;  // デバイス名

  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  setHost: (host: string) => void;
  setDeviceName: (name: string) => void;

  // OTA更新用のデバイスURL取得
  getDeviceUrl: () => string;
}

export const useWifiStore = create<WifiState>((set, get) => ({
  status: 'disconnected',
  host: '',
  deviceName: '',

  connect: async () => {
    const { host, deviceName } = get();

    if (!host) {
      console.error('ホストが設定されていません');
      set({ status: 'error' });
      return false;
    }

    // デバイスを書込み先として指定（接続確認は行わない）
    // 実際の接続確認はOTA書込み時に行う
    console.log(`Device selected: ${deviceName} (${host})`);
    set({ status: 'connected' });
    return true;
  },

  disconnect: async () => {
    set({ status: 'disconnected' });
  },

  setHost: (host: string) => {
    set({ host });
  },

  setDeviceName: (name: string) => {
    set({ deviceName: name });
  },

  getDeviceUrl: () => {
    const { host } = get();
    return `http://${host}`;
  },
}));
