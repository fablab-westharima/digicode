/**
 * SerialTrimTransport — USB Serial 経由のトリム transport (Phase D-1、Session 148)
 *
 * Protocol (59.md §1-4.3 verbatim、 DigiCodeUSB.ino + DigiCodeBLE.ino processCommand 拡張):
 *   SET_TRIM:index,value        -> OK:TRIM_SET / ERROR:INVALID_TRIM
 *   SET_TRIMS:v0,v1,v2,...      -> OK:TRIMS_SET
 *   GET_TRIMS                   -> OK:TRIMS=v0,v1,v2,...
 *   SAVE_TRIMS                  -> OK:TRIMS_SAVED
 *   TEST_TRIM:action[,index]    -> OK:TEST_OK
 *
 * 本 Phase D-1 では fire-and-forget (writeLine の boolean 戻り値で成功判定)。
 * getTrims は request/response correlation 未実装 = `{count: 0, trims: []}` を返す
 * (UI 側は trims 空なら local state 維持の既存挙動)。 Phase E 拡張候補。
 */

import { serialService } from '@/services/serialService';
import type { ITrimTransport, TrimData, TrimTestAction } from './ITrimTransport';

interface SerialLike {
  writeLine(data: string): Promise<boolean>;
}

export class SerialTrimTransport implements ITrimTransport {
  readonly kind = 'serial' as const;

  constructor(private readonly serial: SerialLike = serialService) {}

  async getTrims(): Promise<TrimData> {
    // best-effort: 本 Phase は request/response correlation 未実装。
    // UI 側は trims 空なら local state を維持する既存挙動が機能する。
    await this.serial.writeLine('GET_TRIMS');
    return { count: 0, trims: [] };
  }

  async setTrim(index: number, value: number): Promise<void> {
    const ok = await this.serial.writeLine(`SET_TRIM:${index},${value}`);
    if (!ok) throw new Error('Failed to send SET_TRIM via serial');
  }

  async setTrims(trims: number[]): Promise<void> {
    const ok = await this.serial.writeLine(`SET_TRIMS:${trims.join(',')}`);
    if (!ok) throw new Error('Failed to send SET_TRIMS via serial');
  }

  async saveTrims(): Promise<void> {
    const ok = await this.serial.writeLine('SAVE_TRIMS');
    if (!ok) throw new Error('Failed to send SAVE_TRIMS via serial');
  }

  async testServo(action: TrimTestAction, index?: number): Promise<void> {
    const cmd = index !== undefined ? `TEST_TRIM:${action},${index}` : `TEST_TRIM:${action}`;
    const ok = await this.serial.writeLine(cmd);
    if (!ok) throw new Error('Failed to send TEST_TRIM via serial');
  }
}
