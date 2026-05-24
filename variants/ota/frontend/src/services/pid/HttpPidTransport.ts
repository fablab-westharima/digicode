/**
 * HttpPidTransport — WiFi OTA 経由の PID gain transport (Phase D-2、Session 148)
 *
 * POST /pid {name, kp, ki, kd} (D-3 で DigiCodeOTA.ino endpoint 実装)
 */

import type { IPidTransport } from './IPidTransport';

export class HttpPidTransport implements IPidTransport {
  readonly kind = 'http' as const;

  constructor(private readonly deviceUrl: string) {}

  async setPid(name: string, kp: number, ki: number, kd: number): Promise<void> {
    const response = await fetch(`${this.deviceUrl}/pid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, kp, ki, kd }),
    });
    if (!response.ok) {
      throw new Error('Failed to set PID');
    }
  }
}
