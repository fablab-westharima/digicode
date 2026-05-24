/**
 * BleTrimTransport — BLE GATT NUS 経由のトリム transport (Phase D-1、Session 148)
 *
 * SerialTrimTransport と同 line protocol (DigiCodeBLE.ino processCommand 拡張、 59.md §1-4.3)。
 * BLE 20-byte chunk 制約は bluetoothService が内部で chunk 分割で吸収するため、
 * transport 層は line ベース command を構築するのみ。
 *
 * 前提: device 側 user code が `ble_uart_setup` block を含む必要あり (R-9 mitigation)。
 * bluetoothService.connect は filter で UART_SERVICE_UUID を必須化するため、
 * NUS 未登録 device には connect そのものが不可 = isConnected=false で factory 側 skip される。
 */

import { bluetoothService } from '@/services/bluetoothService';
import type { ITrimTransport, TrimData, TrimTestAction } from './ITrimTransport';

interface BleLike {
  writeLine(data: string): Promise<boolean>;
}

export class BleTrimTransport implements ITrimTransport {
  readonly kind = 'ble' as const;

  constructor(private readonly ble: BleLike = bluetoothService) {}

  async getTrims(): Promise<TrimData> {
    // best-effort: Serial と同様、request/response correlation 未実装。
    await this.ble.writeLine('GET_TRIMS');
    return { count: 0, trims: [] };
  }

  async setTrim(index: number, value: number): Promise<void> {
    const ok = await this.ble.writeLine(`SET_TRIM:${index},${value}`);
    if (!ok) throw new Error('Failed to send SET_TRIM via BLE');
  }

  async setTrims(trims: number[]): Promise<void> {
    const ok = await this.ble.writeLine(`SET_TRIMS:${trims.join(',')}`);
    if (!ok) throw new Error('Failed to send SET_TRIMS via BLE');
  }

  async saveTrims(): Promise<void> {
    const ok = await this.ble.writeLine('SAVE_TRIMS');
    if (!ok) throw new Error('Failed to send SAVE_TRIMS via BLE');
  }

  async testServo(action: TrimTestAction, index?: number): Promise<void> {
    const cmd = index !== undefined ? `TEST_TRIM:${action},${index}` : `TEST_TRIM:${action}`;
    const ok = await this.ble.writeLine(cmd);
    if (!ok) throw new Error('Failed to send TEST_TRIM via BLE');
  }
}
