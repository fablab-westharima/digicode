/**
 * IPidTransport — PID gain tuning の transport 抽象 (Phase D-2、Session 148、D-new-6 (B))
 *
 * Why: PIDTuningPanel の PID gain 送信を HTTP / USB Serial / BLE GATT NUS の
 *      3 経路に対応させ、 trim と同一設計 pattern で統一。
 *      case 23 incident F (PIDTuningPanel orphan 3 層 = store / generator / transport)
 *      の transport 層解消。 generator 層は Phase B-3 (Session 146 commit `56bf914`) で解消済、
 *      transport 層は本 D-2 commit (frontend) + D-3 commit (template consumer) で完成。
 *
 * 経路別 backend (D-3 で template processCommand 拡張):
 *   - http   : DigiCodeOTA.ino /pid endpoint (POST {name, kp, ki, kd})
 *   - serial : DigiCodeUSB.ino processCommand SET_PID:name,kp,ki,kd line command
 *   - ble    : DigiCodeBLE.ino 同 line command (NUS GATT)
 */

export type PidTransportKind = 'http' | 'serial' | 'ble';

export interface IPidTransport {
  /** Transport kind for UI display + diagnostics */
  readonly kind: PidTransportKind;

  /**
   * PID gain を device に送信。
   * name = PID instance 識別子 (PIDTuningPanel は単一 PID のため "default" 固定送信、
   * 将来 multi-PID UI 追加時に instance 名で分岐想定)。
   */
  setPid(name: string, kp: number, ki: number, kd: number): Promise<void>;
}
