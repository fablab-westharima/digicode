/**
 * BlePidTransport — BLE GATT NUS 経由の PID gain transport (Phase D-2、Session 148)
 *
 * SerialPidTransport と同 line protocol。 BLE 20-byte chunk 分割は bluetoothService が内部吸収。
 * 前提: device 側 user code が ble_uart_setup block を含む必要あり (R-9 mitigation、 trim と同様)。
 */

import { bluetoothService } from '@/services/bluetoothService';
import type { IPidTransport } from './IPidTransport';

interface BleLike {
  writeLine(data: string): Promise<boolean>;
}

export class BlePidTransport implements IPidTransport {
  readonly kind = 'ble' as const;

  constructor(private readonly ble: BleLike = bluetoothService) {}

  async setPid(name: string, kp: number, ki: number, kd: number): Promise<void> {
    const ok = await this.ble.writeLine(`SET_PID:${name},${kp},${ki},${kd}`);
    if (!ok) throw new Error('Failed to send SET_PID via BLE');
  }
}
