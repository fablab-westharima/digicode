/**
 * USB書き込み用の型定義
 */

/**
 * 完全パッケージ（ESP32用4ファイルセット）
 * - bootloader: ブートローダー（0x1000番地）
 * - partitions: パーティションテーブル（0x8000番地）
 * - bootApp0: ブートアプリケーション0（0xE000番地）
 * - firmware: アプリケーションファームウェア（0x10000番地）
 */
export interface FullPackage {
  firmware: Blob;
  bootloader: Blob;
  partitions: Blob;
  bootApp0: Blob;
}

/**
 * フラッシュ書き込みステージ
 */
export type FlashStage =
  | 'connecting'  // デバイスに接続中
  | 'erasing'     // フラッシュ消去中
  | 'flashing'    // 書き込み中
  | 'verifying'   // 検証中
  | 'complete'    // 完了
  | 'error';      // エラー

/**
 * フラッシュ書き込み進捗情報
 */
export interface FlashProgress {
  stage: FlashStage;
  file?: string;      // 現在処理中のファイル名
  percent: number;    // 進捗率（0-100）
  message: string;    // 進捗メッセージ
}

/**
 * ESP32チップ情報
 */
export interface ChipInfo {
  name: string;       // チップ名（例: "ESP32"）
  mac: string;        // MACアドレス
  features: string[]; // チップ機能
}

/**
 * シリアルポート情報
 */
export interface SerialPortInfo {
  usbVendorId?: number;   // USBベンダーID
  usbProductId?: number;  // USBプロダクトID
}

/**
 * USB書き込み設定
 */
export interface UsbFlashConfig {
  baudRate: number;       // ボーレート（デフォルト: 115200）
  debugLogging?: boolean; // デバッグログ有効化
}
