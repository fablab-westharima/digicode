/**
 * PidTransportFactory — 接続方式自動判定で IPidTransport を生成 (Phase D-2、Session 148)
 *
 * Priority: WiFi → USB Serial → BLE GATT NUS (trim と同一設計 pattern、 case 23 incident F transport-side 解消)
 */

import { useWifiStore } from '@/stores/wifiStore';
import { serialService } from '@/services/serialService';
import { bluetoothService } from '@/services/bluetoothService';
import { HttpPidTransport } from './HttpPidTransport';
import { SerialPidTransport } from './SerialPidTransport';
import { BlePidTransport } from './BlePidTransport';
import type { IPidTransport } from './IPidTransport';

export function createPidTransport(): IPidTransport | null {
  const wifi = useWifiStore.getState();
  if (wifi.status === 'connected' && wifi.host) {
    return new HttpPidTransport(wifi.getDeviceUrl());
  }
  if (serialService.isConnected) {
    return new SerialPidTransport();
  }
  if (bluetoothService.isConnected) {
    return new BlePidTransport();
  }
  return null;
}
