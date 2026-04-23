// helperService.ts
// DigiCode-Helper との通信を担当するサービス

const HELPER_BASE_URL = 'http://localhost:31415';
const HELPER_TIMEOUT = 3000; // 3秒
const HELPER_LAUNCH_WAIT = 1000; // 1秒
const HELPER_LAUNCH_MAX_ATTEMPTS = 10; // 最大10回

/**
 * Helper デバイス型
 */
export interface HelperDevice {
  name: string;
  host: string;
  addresses: string[];
  port: number;
  txt: Record<string, string>;
  lastSeen: string;
}

interface DevicesResponse {
  success: boolean;
  devices: HelperDevice[];
  searchDuration: number;
  timestamp: string;
}

interface HealthResponse {
  status: string;
  version: string;
}

/**
 * Helper が起動しているか確認
 */
export async function checkHelperAvailable(): Promise<boolean> {
  try {
    console.log('[helperService] Checking Helper availability at:', `${HELPER_BASE_URL}/health`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HELPER_TIMEOUT);

    const response = await fetch(`${HELPER_BASE_URL}/health`, {
      signal: controller.signal,
      // @ts-expect-error - Chrome 138+ Private Network Access (remove when TypeScript adds targetAddressSpace to RequestInit)
      targetAddressSpace: 'local',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('[helperService] Helper health check failed, status:', response.status);
      return false;
    }

    const data: HealthResponse = await response.json();
    const isOk = data.status === 'ok';
    console.log('[helperService] Helper available:', isOk, 'version:', data.version);
    return isOk;
  } catch (error) {
    console.error('[helperService] Helper not available:', error);
    return false;
  }
}

/**
 * Helper から mDNS 検出デバイス一覧を取得
 */
export async function getHelperDevices(): Promise<HelperDevice[]> {
  try {
    console.log('[helperService] Fetching devices from:', `${HELPER_BASE_URL}/api/devices`);
    const response = await fetch(`${HELPER_BASE_URL}/api/devices`, {
      // @ts-expect-error - Chrome 138+ Private Network Access (remove when TypeScript adds targetAddressSpace to RequestInit)
      targetAddressSpace: 'local',
    });
    console.log('[helperService] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: DevicesResponse = await response.json();
    console.log('[helperService] Received devices:', data.devices.length, 'devices');
    console.log('[helperService] Devices data:', data.devices);
    return data.devices;
  } catch (error) {
    console.error('[helperService] Failed to get devices:', error);
    console.error('[helperService] Error type:', error instanceof TypeError ? 'TypeError (Network error)' : 'Other');
    if (error instanceof Error) {
      console.error('[helperService] Error message:', error.message);
      console.error('[helperService] Error stack:', error.stack);
    }
    return [];
  }
}

/**
 * Helper に検索再開を要求
 */
export async function triggerHelperSearch(): Promise<void> {
  try {
    await fetch(`${HELPER_BASE_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 5000 }),
      // @ts-expect-error - Chrome 138+ Private Network Access (remove when TypeScript adds targetAddressSpace to RequestInit)
      targetAddressSpace: 'local',
    });
  } catch (error) {
    console.error('[helperService] Failed to trigger search:', error);
  }
}

/**
 * カスタムURLスキームで Helper を起動
 * iframe を使ってページ離脱を避ける
 */
export function launchHelper(): void {
  console.log('[helperService] Launching Helper via deep link...');

  // iframe を使ってページ遷移を避ける
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = 'digicode-helper://start';
  document.body.appendChild(iframe);

  // 少し後に削除
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);
}

/**
 * Helper 起動を試み、起動完了を待機
 *
 * 【重要】この関数はユーザージェスチャー（クリック等）の直後に呼ぶこと。
 * Deep Link の自動発火にはユーザージェスチャーが必要。
 *
 * @param onProgress 進捗コールバック (attempt, maxAttempts)
 * @returns true: 起動成功, false: 起動失敗（未インストール等）
 */
export async function launchAndWaitHelper(
  onProgress?: (attempt: number, maxAttempts: number) => void
): Promise<boolean> {
  // まず起動確認
  if (await checkHelperAvailable()) {
    console.log('[helperService] Helper already running');
    return true;
  }

  // Deep Link で自動起動（ユーザージェスチャー継続中）
  console.log('[helperService] Auto-launching Helper via deep link...');
  launchHelper();

  // 起動待機（ポーリング）
  for (let i = 0; i < HELPER_LAUNCH_MAX_ATTEMPTS; i++) {
    await new Promise(r => setTimeout(r, HELPER_LAUNCH_WAIT));

    onProgress?.(i + 1, HELPER_LAUNCH_MAX_ATTEMPTS);

    if (await checkHelperAvailable()) {
      console.log(`[helperService] Helper started after ${i + 1} attempts`);
      return true;
    }

    console.log(`[helperService] Waiting for Helper... (${i + 1}/${HELPER_LAUNCH_MAX_ATTEMPTS})`);
  }

  console.log('[helperService] Helper launch failed (not installed or user denied)');
  return false;
}

/**
 * mDNS フルネームから表示名を抽出
 * 例: "UNKO-009._digicode._tcp.local." → "UNKO-009"
 */
function extractDisplayName(mdnsName: string): string {
  return mdnsName
    .replace(/\._digicode\._tcp\.local\.?$/, '')
    .replace(/^digicode-/, '');
}

/**
 * HelperDevice → DigiCode Device 型に変換
 */
export function convertToDevice(helperDevice: HelperDevice): {
  uuid: string;
  name: string;
  ipAddress: string;
  ssid: string;
  lastConnected: string;
} {
  return {
    uuid: helperDevice.txt.uuid || helperDevice.name,
    name: extractDisplayName(helperDevice.name),
    ipAddress: helperDevice.addresses[0] || '',
    ssid: '', // mDNS からは SSID 取得不可
    lastConnected: helperDevice.lastSeen,
  };
}

/**
 * Helper ダウンロードURL
 */
export const HELPER_DOWNLOAD_URL = 'https://github.com/fablab-westharima/DigiCode-Helper/releases/latest';
