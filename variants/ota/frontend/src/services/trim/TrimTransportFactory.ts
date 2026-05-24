/**
 * TrimTransportFactory — 接続方式自動判定で ITrimTransport を生成 (Phase D-1、Session 148)
 *
 * Priority: WiFi → USB Serial → BLE GATT NUS (60.md §1 Phase D verbatim、 case 23 incident B 解消)
 *
 * 戻り値 null = どの transport も unavailable = UI 側で「接続なし」 表示誘導。
 */

import { useWifiStore } from '@/stores/wifiStore';
import { serialService } from '@/services/serialService';
import { bluetoothService } from '@/services/bluetoothService';
import { HttpTrimTransport } from './HttpTrimTransport';
import { SerialTrimTransport } from './SerialTrimTransport';
import { BleTrimTransport } from './BleTrimTransport';
import type { ITrimTransport } from './ITrimTransport';

export function createTrimTransport(): ITrimTransport | null {
  const wifi = useWifiStore.getState();
  if (wifi.status === 'connected' && wifi.host) {
    return new HttpTrimTransport(wifi.getDeviceUrl());
  }
  if (serialService.isConnected) {
    return new SerialTrimTransport();
  }
  if (bluetoothService.isConnected) {
    return new BleTrimTransport();
  }
  return null;
}
