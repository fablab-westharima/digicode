/**
 * SerialPidTransport — USB Serial 経由の PID gain transport (Phase D-2、Session 148)
 *
 * Protocol: SET_PID:name,kp,ki,kd line command (D-3 で DigiCodeUSB.ino processCommand 拡張)
 */

import { serialService } from '@/services/serialService';
import type { IPidTransport } from './IPidTransport';

interface SerialLike {
  writeLine(data: string): Promise<boolean>;
}

export class SerialPidTransport implements IPidTransport {
  readonly kind = 'serial' as const;

  private readonly serial: SerialLike;

  constructor(serial: SerialLike = serialService) {
    this.serial = serial;
  }

  async setPid(name: string, kp: number, ki: number, kd: number): Promise<void> {
    const ok = await this.serial.writeLine(`SET_PID:${name},${kp},${ki},${kd}`);
    if (!ok) throw new Error('Failed to send SET_PID via serial');
  }
}
