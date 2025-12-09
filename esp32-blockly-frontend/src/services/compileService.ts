/**
 * Arduino C++コンパイルサービス
 * バックエンドのコンパイルサーバーと通信
 */

import { api } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';

export interface CompileRequest {
  includes: string;
  globals: string;
  setupCode: string;
  loopCode: string;
  board?: string; // FQBN (e.g., 'esp32:esp32:esp32')
}

export interface CompileResult {
  success: boolean;
  binary?: Blob;
  fullPackage?: {
    firmware: Blob;
    bootloader: Blob;
    partitions: Blob;
    bootApp0: Blob;
  };
  error?: string;
  details?: string;
}

export type CompileServerMode = 'cloud' | 'local';

// サーバーURL設定
const SERVERS = {
  ubuntu: 'https://compile.digital-fab.jp',      // Primary: 自宅Ubuntuサーバー
  railway: 'https://amiable-patience-production-1d47.up.railway.app', // Backup: Railway
  local: 'http://localhost:3001'
};

// サーバーモード取得
const getCompileServerMode = (): CompileServerMode => {
  return (localStorage.getItem('compileServerMode') as CompileServerMode) || 'cloud';
};

// サーバーURL取得（cloudモードの場合はUbuntuを返す）
const getCompileServerUrl = (): string => {
  const mode = getCompileServerMode();
  if (mode === 'cloud') {
    return SERVERS.ubuntu; // デフォルトはUbuntuサーバー
  }
  return SERVERS.local;
};

// base64文字列をBlobに変換
const base64ToBlob = (base64: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/octet-stream' });
};

// サーバーモード設定
const setCompileServerMode = (mode: CompileServerMode): void => {
  localStorage.setItem('compileServerMode', mode);
};

// 接続テスト
const testCompileServerConnection = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3秒タイムアウト
    });
    return response.ok;
  } catch (error) {
    console.debug(`[Compile] Server connection test failed for ${url}:`, error);
    return false;
  }
};

export const compileService = {
  /**
   * Arduino C++コードをコンパイルして.binファイルを取得
   * サーバーはDigiCodeOTAテンプレートにコードを挿入してコンパイル
   * → WiFi/mDNS/OTA機能が保持される
   *
   * @param includes - インクルード文
   * @param globals - グローバル変数・関数
   * @param setupCode - setup()の中身
   * @param loopCode - loop()の中身
   * @param board - FQBN（省略時はストアから取得）
   * @param format - ファイルフォーマット ('bin' | 'uf2'、省略時は 'bin')
   */
  async compile(includes: string, globals: string, setupCode: string, loopCode: string, board?: string, format: 'bin' | 'uf2' = 'bin'): Promise<CompileResult> {
    const mode = getCompileServerMode();

    // ボードが指定されていない場合はストアから取得
    const targetBoard = board || useBoardStore.getState().getFqbn();

    // ESP32の場合はfullPackageモードを使用、それ以外はformatパラメータ
    const isEsp32 = targetBoard.startsWith('esp32:');
    const queryParams = isEsp32 ? '?fullPackage=true' : (format === 'uf2' ? '?format=uf2' : '');

    const requestBody = JSON.stringify({
      includes,
      globals,
      setupCode,
      loopCode,
      board: targetBoard
    });

    // cloudモードの場合はUbuntu→Railwayのフォールバック
    if (mode === 'cloud') {
      // まずUbuntuサーバーで試行
      console.log('[Compile] Trying Ubuntu server (primary)...');
      try {
        const response = await fetch(`${SERVERS.ubuntu}/api/compile${queryParams}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: AbortSignal.timeout(120000) // 120秒タイムアウト
        });

        if (response.ok) {
          const contentType = response.headers.get('Content-Type');

          // fullPackageモード（JSON）
          if (contentType?.includes('application/json')) {
            const json = await response.json();
            if (json.success) {
              console.log('[Compile] ✓ Ubuntu server compilation successful (fullPackage)');

              const fullPackage = {
                firmware: base64ToBlob(json.firmware),
                bootloader: base64ToBlob(json.bootloader),
                partitions: base64ToBlob(json.partitions),
                bootApp0: base64ToBlob(json.bootApp0)
              };

              // 使用量カウント
              const token = localStorage.getItem('accessToken');
              if (token) {
                api.compileUsage.increment().catch(console.error);
              }

              return { success: true, fullPackage };
            }
          } else {
            // 従来のバイナリモード
            const binary = await response.blob();
            console.log('[Compile] ✓ Ubuntu server compilation successful');

            // 使用量カウント
            const token = localStorage.getItem('accessToken');
            if (token) {
              api.compileUsage.increment().catch(console.error);
            }

            return { success: true, binary };
          }
        }

        console.warn('[Compile] Ubuntu server returned error, falling back to Railway...');
      } catch (error) {
        console.warn('[Compile] Ubuntu server failed, falling back to Railway:', error);
      }

      // Ubuntuが失敗した場合はRailwayで試行（バックアップ）
      console.log('[Compile] Trying Railway server (backup)...');
      try {
        const response = await fetch(`${SERVERS.railway}/api/compile${queryParams}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: AbortSignal.timeout(120000)
        });

        if (!response.ok) {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error || 'Compilation failed on both servers',
            details: errorData.details || errorData.stderr,
          };
        }

        const contentType = response.headers.get('Content-Type');

        // fullPackageモード（JSON）
        if (contentType?.includes('application/json')) {
          const json = await response.json();
          if (json.success) {
            console.log('[Compile] ✓ Railway server compilation successful (fullPackage, fallback)');

            const fullPackage = {
              firmware: base64ToBlob(json.firmware),
              bootloader: base64ToBlob(json.bootloader),
              partitions: base64ToBlob(json.partitions),
              bootApp0: base64ToBlob(json.bootApp0)
            };

            // 使用量カウント
            const token = localStorage.getItem('accessToken');
            if (token) {
              api.compileUsage.increment().catch(console.error);
            }

            return { success: true, fullPackage };
          }
        } else {
          // 従来のバイナリモード
          const binary = await response.blob();
          console.log('[Compile] ✓ Railway server compilation successful (fallback)');

          // 使用量カウント
          const token = localStorage.getItem('accessToken');
          if (token) {
            api.compileUsage.increment().catch(console.error);
          }

          return { success: true, binary };
        }

        return {
          success: false,
          error: 'Compilation failed on both servers',
        };
      } catch (error) {
        return {
          success: false,
          error: 'Both Ubuntu and Railway servers are unavailable',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // localモードの場合
    try {
      const serverUrl = getCompileServerUrl();
      const response = await fetch(`${serverUrl}/api/compile${queryParams}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Compilation failed',
          details: errorData.details || errorData.stderr,
        };
      }

      const contentType = response.headers.get('Content-Type');

      // fullPackageモード（JSON）
      if (contentType?.includes('application/json')) {
        const json = await response.json();
        if (json.success) {
          console.log('[Compile] ✓ Local server compilation successful (fullPackage)');

          const fullPackage = {
            firmware: base64ToBlob(json.firmware),
            bootloader: base64ToBlob(json.bootloader),
            partitions: base64ToBlob(json.partitions),
            bootApp0: base64ToBlob(json.bootApp0)
          };

          return { success: true, fullPackage };
        }
      }

      // 従来のバイナリモード
      const binary = await response.blob();
      return { success: true, binary };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * コンパイルサーバーのヘルスチェック
   */
  async checkHealth(): Promise<boolean> {
    try {
      const serverUrl = getCompileServerUrl();
      const response = await fetch(`${serverUrl}/health`);
      return response.ok;
    } catch (error) {
      console.debug('[Compile] Health check failed:', error);
      return false;
    }
  },

  /**
   * .binファイルをダウンロード
   */
  downloadBinary(binary: Blob, filename: string = 'firmware.bin'): void {
    const url = URL.createObjectURL(binary);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // サーバーモード関連のメソッド
  getMode: getCompileServerMode,
  setMode: setCompileServerMode,
  testConnection: testCompileServerConnection,
  getServerUrl: getCompileServerUrl,
  servers: SERVERS,
};
