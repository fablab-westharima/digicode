/**
 * HttpTrimTransport — WiFi OTA 経由のトリム transport (Phase D-1、Session 148)
 *
 * 既存 trimService.ts の API を class 形式で port。 endpoint shape 完全互換:
 *   GET  /trim                -> TrimData
 *   POST /trim {index, value} -> single set
 *   POST /trim {trims: [...]} -> batch set
 *   POST /trim/save           -> NVS persist
 *   POST /trim/test {action, index?} -> test motion
 */

import type { ITrimTransport, TrimData, TrimTestAction } from './ITrimTransport';

export class HttpTrimTransport implements ITrimTransport {
  readonly kind = 'http' as const;

  constructor(private readonly deviceUrl: string) {}

  async getTrims(): Promise<TrimData> {
    const response = await fetch(`${this.deviceUrl}/trim`, { method: 'GET' });
    if (!response.ok) {
      throw new Error('Failed to get trims');
    }
    return response.json();
  }

  async setTrim(index: number, value: number): Promise<void> {
    const response = await fetch(`${this.deviceUrl}/trim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, value }),
    });
    if (!response.ok) {
      throw new Error('Failed to set trim');
    }
  }

  async setTrims(trims: number[]): Promise<void> {
    const response = await fetch(`${this.deviceUrl}/trim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trims }),
    });
    if (!response.ok) {
      throw new Error('Failed to set trims');
    }
  }

  async saveTrims(): Promise<void> {
    const response = await fetch(`${this.deviceUrl}/trim/save`, { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to save trims');
    }
  }

  async testServo(action: TrimTestAction, index?: number): Promise<void> {
    const body: { action: string; index?: number } = { action };
    if (index !== undefined) {
      body.index = index;
    }
    const response = await fetch(`${this.deviceUrl}/trim/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error('Failed to test servo');
    }
  }
}
