import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Device {
  uuid: string;
  name: string;
  ssid: string;
  lastConnected: string;
  ipAddress?: string;   // 固定IP（OTA書き込みに使用）
  gateway?: string;     // ゲートウェイ
  subnet?: string;      // サブネットマスク
  createdAt?: string;   // 作成日時
}

interface DeviceState {
  devices: Device[];
  currentDevice: Device | null;

  addDevice: (device: Device) => void;
  updateDevice: (uuid: string, device: Partial<Device>) => void;
  removeDevice: (uuid: string) => void;
  clearDevices: () => void;
  setCurrentDevice: (device: Device | null) => void;
  getDeviceByUuid: (uuid: string) => Device | undefined;
}

export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      devices: [],
      currentDevice: null,

      addDevice: (device: Device) => {
        console.log('[DeviceStore] addDevice called with:', device);
        set((state) => {
          // 既存のデバイスがあれば更新、なければ追加
          const existingIndex = state.devices.findIndex(d => d.uuid === device.uuid);
          if (existingIndex >= 0) {
            const newDevices = [...state.devices];
            newDevices[existingIndex] = { ...newDevices[existingIndex], ...device };
            console.log('[DeviceStore] Updated existing device at index', existingIndex, ':', newDevices[existingIndex]);
            return { devices: newDevices };
          }
          console.log('[DeviceStore] Added new device. Total devices:', state.devices.length + 1);
          return { devices: [...state.devices, device] };
        });
      },

      updateDevice: (uuid: string, updates: Partial<Device>) => {
        set((state) => ({
          devices: state.devices.map(d =>
            d.uuid === uuid ? { ...d, ...updates } : d
          ),
        }));
      },

      removeDevice: (uuid: string) => {
        set((state) => ({
          devices: state.devices.filter(d => d.uuid !== uuid),
          currentDevice: state.currentDevice?.uuid === uuid ? null : state.currentDevice,
        }));
      },

      clearDevices: () => {
        set({ devices: [], currentDevice: null });
      },

      setCurrentDevice: (device: Device | null) => {
        set({ currentDevice: device });
      },

      getDeviceByUuid: (uuid: string) => {
        return get().devices.find(d => d.uuid === uuid);
      },
    }),
    {
      name: 'esp32-devices-storage',
      version: 1,
      partialize: (state) => ({
        devices: state.devices,
      }),
    }
  )
);
