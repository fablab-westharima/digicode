/**
 * コンパイル関連の型定義
 */

import type { FullPackage } from './flash';

/**
 * コンパイルリクエスト
 */
export interface CompileRequest {
  includes: string;   // インクルード文
  globals: string;    // グローバル変数・関数
  setupCode: string;  // setup()の中身
  loopCode: string;   // loop()の中身
  board?: string;     // FQBN (例: 'esp32:esp32:esp32')
}

/**
 * コンパイル結果
 */
export interface CompileResult {
  success: boolean;           // コンパイル成功フラグ
  fullPackage?: FullPackage;  // USB書き込み用4ファイルセット（ESP32）
  error?: string;             // エラーメッセージ
  details?: string;           // 詳細情報
}
