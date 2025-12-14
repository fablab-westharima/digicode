/**
 * USB専用コンパイルサービス
 * arduino-compile-serverと通信してUSB用ファームウェアをコンパイル
 *
 * 制約:
 * - fullPackageモード必須（bootloader, partitions, boot_app0, firmwareの4ファイル）
 * - connectionType: 'usb' パラメータを指定
 * - DigiCodeUSBテンプレートを使用（WiFi/mDNS/OTA機能なし）
 */

import type { CompileRequest, CompileResult } from '../types/compile';

// コンパイルサーバーURL設定
const COMPILE_SERVERS = {
  primary: 'https://arduino-compile.code.fablab-westharima.jp',  // Ubuntu本番サーバー
  fallback: 'https://arduino-compile-server.up.railway.app'      // Railwayバックアップサーバー
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

// 接続テスト
const testCompileServerConnection = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3秒タイムアウト
    });
    return response.ok;
  } catch (error) {
    console.debug(`[UsbCompile] Server connection test failed for ${url}:`, error);
    return false;
  }
};

export const usbCompileService = {
  /**
   * USB用ファームウェアをコンパイル
   * DigiCodeUSBテンプレートにコードを挿入してコンパイル
   *
   * @param request - コンパイルリクエスト
   * @returns CompileResult（fullPackageのみ）
   */
  async compile(request: CompileRequest): Promise<CompileResult> {
    const { includes, globals, setupCode, loopCode, board = 'esp32:esp32:esp32' } = request;

    // USB版は常にfullPackage + connectionType=usb
    const queryParams = '?fullPackage=true&connectionType=usb';

    const requestBody = JSON.stringify({
      includes,
      globals,
      setupCode,
      loopCode,
      board
    });

    // まずUbuntuサーバーで試行
    console.log('[UsbCompile] Trying Ubuntu server (primary)...');
    try {
      const response = await fetch(`${COMPILE_SERVERS.primary}/api/compile${queryParams}`, {
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
            console.log('[UsbCompile] ✓ Ubuntu server compilation successful (fullPackage)');

            const fullPackage = {
              firmware: base64ToBlob(json.firmware),
              bootloader: base64ToBlob(json.bootloader),
              partitions: base64ToBlob(json.partitions),
              bootApp0: base64ToBlob(json.bootApp0)
            };

            return { success: true, fullPackage };
          } else {
            console.warn('[UsbCompile] Ubuntu server compilation failed');
            // Railwayにフォールバックするため、ここではreturnしない
          }
        }
      }

      console.warn('[UsbCompile] Ubuntu server returned error, falling back to Railway...');
    } catch (error) {
      console.warn('[UsbCompile] Ubuntu server failed, falling back to Railway:', error);
    }

    // Ubuntuが失敗した場合はRailwayで試行（バックアップ）
    console.log('[UsbCompile] Trying Railway server (backup)...');
    try {
      const response = await fetch(`${COMPILE_SERVERS.fallback}/api/compile${queryParams}`, {
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
          console.log('[UsbCompile] ✓ Railway server compilation successful (fullPackage, fallback)');

          const fullPackage = {
            firmware: base64ToBlob(json.firmware),
            bootloader: base64ToBlob(json.bootloader),
            partitions: base64ToBlob(json.partitions),
            bootApp0: base64ToBlob(json.bootApp0)
          };

          return { success: true, fullPackage };
        } else {
          return {
            success: false,
            error: json.error || 'Compilation failed on Railway server',
            details: json.details || json.stderr,
          };
        }
      }

      return {
        success: false,
        error: 'Compilation failed on both servers',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Both Ubuntu and Railway servers are unavailable',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * コンパイルサーバーの状態チェック
   */
  async checkServers(): Promise<{
    primary: boolean;
    fallback: boolean;
  }> {
    const [primary, fallback] = await Promise.all([
      testCompileServerConnection(COMPILE_SERVERS.primary),
      testCompileServerConnection(COMPILE_SERVERS.fallback)
    ]);

    return { primary, fallback };
  }
};
