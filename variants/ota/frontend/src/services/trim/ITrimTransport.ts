/**
 * ITrimTransport — サーボトリム設定の transport 抽象 (Phase D-1、Session 148、E2)
 *
 * Why: ServoTrimDialog の trim 操作を HTTP / USB Serial / BLE GATT NUS の
 *      3 経路に対応させ、 接続方式によらず統一 API を提供する。
 *      case 23 incident B (orphan storage) + incident F (PIDTuningPanel orphan)
 *      transport-side 完全解消 cluster の trim 側。
 *
 * 経路別 backend:
 *   - http   : DigiCodeOTA.ino /trim, /trim/save, /trim/test endpoint
 *   - serial : DigiCodeUSB.ino processCommand SET_TRIM/SET_TRIMS/GET_TRIMS/SAVE_TRIMS/TEST_TRIM line command
 *   - ble    : DigiCodeBLE.ino 同 line command (NUS GATT)
 */

export interface TrimData {
  count: number;
  trims: number[];
}

export type TrimTransportKind = 'http' | 'serial' | 'ble';

export type TrimTestAction = 'home' | 'sweep' | 'walk';

export interface ITrimTransport {
  /** Transport kind for UI display + diagnostics */
  readonly kind: TrimTransportKind;

  /**
   * デバイスから現在のトリム値を読み出す。
   * Serial/BLE は best-effort: device 側応答取得に request/response 相関が必要なため、
   * 本 Phase D-1 では未実装 = `{count: 0, trims: []}` を返す。
   * UI 側は trims が空なら localStorage の値を使い続ける既存挙動が active。
   */
  getTrims(): Promise<TrimData>;

  /** 単一 channel index の trim 値を書込 */
  setTrim(index: number, value: number): Promise<void>;

  /** 全 channel の trim 値を一括書込 */
  setTrims(trims: number[]): Promise<void>;

  /** デバイス NVS に persist */
  saveTrims(): Promise<void>;

  /** テスト動作 (home / sweep / walk) を発火 */
  testServo(action: TrimTestAction, index?: number): Promise<void>;
}
