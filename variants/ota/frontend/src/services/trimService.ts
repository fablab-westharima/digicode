/**
 * サーボトリム設定サービス
 * ESP32ファームウェアのトリムAPIと通信するサービス
 */

export interface ServoConfig {
  index: number;
  name: string;
  pin: number;
  type: '180' | '360';
}

export interface TrimPreset {
  id: string;
  name: string;
  servos: ServoConfig[];
}

export interface TrimData {
  count: number;
  trims: number[];
}

class TrimService {
  /**
   * トリム値を取得
   */
  async getTrims(deviceUrl: string): Promise<TrimData> {
    const response = await fetch(`${deviceUrl}/trim`, {
      method: 'GET',
    });
    if (!response.ok) {
      throw new Error('Failed to get trims');
    }
    return response.json();
  }

  /**
   * トリム値を設定（単一）
   */
  async setTrim(deviceUrl: string, index: number, value: number): Promise<void> {
    const response = await fetch(`${deviceUrl}/trim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, value }),
    });
    if (!response.ok) {
      throw new Error('Failed to set trim');
    }
  }

  /**
   * トリム値を設定（複数）
   */
  async setTrims(deviceUrl: string, trims: number[]): Promise<void> {
    const response = await fetch(`${deviceUrl}/trim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trims }),
    });
    if (!response.ok) {
      throw new Error('Failed to set trims');
    }
  }

  /**
   * NVSに保存
   */
  async saveTrims(deviceUrl: string): Promise<void> {
    const response = await fetch(`${deviceUrl}/trim/save`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Failed to save trims');
    }
  }

  /**
   * テスト動作
   */
  async testServo(
    deviceUrl: string,
    action: 'home' | 'sweep' | 'walk',
    index?: number
  ): Promise<void> {
    const body: { action: string; index?: number } = { action };
    if (index !== undefined) {
      body.index = index;
    }

    const response = await fetch(`${deviceUrl}/trim/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error('Failed to test servo');
    }
  }

  /**
   * サーボ構成を設定
   */
  async setConfig(
    deviceUrl: string,
    count: number
  ): Promise<void> {
    const response = await fetch(`${deviceUrl}/trim/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    if (!response.ok) {
      throw new Error('Failed to set config');
    }
  }
}

export const trimService = new TrimService();
