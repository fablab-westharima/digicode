/**
 * Arduino C++コンパイルサービス
 * バックエンドのコンパイルサーバーと SSE 経由で通信。
 *
 * BUG-078 fix layer 2/3 (commit #3、57.md §2.3、第84回):
 * Cloudflare Free/Pro/Business plan の edge proxy_read_timeout = 100s + ±5s
 * 制約に対し、long-running compile (cold 100-200s) を SSE streaming で回避。
 * 内部実装は SSE only に統一 (要請 3 確定、heuristic 廃止、cache key 同等
 * 計算が frontend で原理不可能 = libDepsHash 不在 + 判定誤り非対称性根拠)、
 * interface `Promise<CompileResult>` は完全不変で 4 caller 影響ゼロ。
 *
 * server 側 dual endpoint (要請 5 確定):
 *   - POST /api/compile (JSON 同期) — CI smoke / automated test / orchestrator
 *     backward compat 用に残置 (削除しない)
 *   - POST /api/compile/sse (SSE) — frontend default、本 file が呼ぶ唯一の path
 *
 * Defensive coding (補足 2、Pattern B 警戒):
 *   - response.ok + Content-Type 検証 (onopen)
 *   - chunk count mismatch + 欠番 detection
 *   - stream early termination detection (complete event なし)
 *   - auto reconnect 抑制 (onerror throw、重複 compile job リスク回避)
 */

import { fetchEventSource } from '@microsoft/fetch-event-source';

import { api } from '@/lib/api';
import { useBoardStore } from '@/stores/boardStore';
import i18n from '@/i18n';
import {
  COMPILE_SERVERS,
  getCompileServerMode,
  setCompileServerMode,
  getCompileServerUrl,
  getCompileServerLocalUrl,
  setCompileServerLocalUrl,
  type CompileServerMode
} from '@/config/servers';

/**
 * 接続方式タイプ
 * - ota: OTA書き込み（DigiCodeOTA.inoテンプレート）
 * - usb: USB書き込み（DigiCodeUSB.inoテンプレート、WiFi/OTA機能なし）
 * - ble: Bluetooth書き込み（DigiCodeBLE.inoテンプレート）
 */
export type ConnectionType = 'ota' | 'usb' | 'ble';

export interface CompileRequest {
  includes: string;
  globals: string;
  setupCode: string;
  loopCode: string;
  board?: string; // FQBN (e.g., 'esp32:esp32:esp32')
  connectionType?: ConnectionType; // 接続方式（テンプレート選択に使用）
}

export interface FullPackage {
  firmware: Blob;
  bootloader: Blob;
  partitions: Blob;
  bootApp0: Blob;
}

export interface CompileResult {
  success: boolean;
  binary?: Blob;
  fullPackage?: FullPackage;
  error?: string;
  details?: string;
  stderr?: string;     // server 側 compile stderr (defensive passthrough、SSE event:error から)
  version?: string;    // ファームウェアバージョン（サーバーから取得）
  template?: string;   // 使用したテンプレート名
  // Session 129: surfaced when local mode aborts because the local image is
  // older than the latest DockerHub publish. Callers (EditorPage) open the
  // OutdatedCompileServerDialog when present; `error` + `details` continue
  // to carry the same text so the compile log still shows the failure
  // (dialog + log are intentionally redundant per user requirement).
  outdated?: {
    localSha: string | undefined;
    remoteSha: string | undefined;
    reason: 'sha-mismatch' | 'legacy-image';
  };
}

export type { CompileServerMode };

// SSE handler 内で throw して reconnect を完全停止させるためのマーカー型。
// fetchEventSource の onerror が throw を再投げるため、catch 側で識別する。
class FatalSseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalSseError';
  }
}

// base64 文字列を Uint8Array に変換 (chunk reassembly 用、最終的に Blob に concat)。
// base64ToBlob (旧 helper) は SSE 化で chunk reassembly に置換され不要 = 削除済。
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * SSE 経由で /api/compile/sse を呼び、CompileResult を構築して返す。
 *
 * Event 順序 (補足 3、commit #2 server.ts 実装と整合):
 *   start → firmware-meta → firmware-chunk × N → bootloader → partitions →
 *   boot_app0 → complete (or `error` 途中発火可)
 */
async function compileViaSse(url: string, requestBody: string): Promise<CompileResult> {
  const ctrl = new AbortController();
  let totalChunks: number | undefined;
  const firmwareChunks: Uint8Array[] = [];
  let bootloader: Uint8Array | undefined;
  let partitions: Uint8Array | undefined;
  let bootApp0: Uint8Array | undefined;
  let completeData:
    | { success: true; durationMs: number; template?: string; pioBoard?: string; cached?: boolean }
    | null = null;
  let errorData: { error: string; details?: string; stderr?: string } | null = null;
  let parseError: Error | null = null;

  try {
    await fetchEventSource(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': i18n.language || 'ja',
      },
      body: requestBody,
      signal: ctrl.signal,
      // tab hidden で connection close しない (cold compile 中の tab 切替 OK)。
      openWhenHidden: true,
      onopen: async (response) => {
        // Pattern B 警戒: response.ok + Content-Type 検証 (defensive、commit #2
        // で Hono c.header() override defect を smoke で発見した教訓)。
        if (!response.ok) {
          throw new FatalSseError(
            i18n.t('editor.compileLog.sse.httpError', {
              status: response.status,
              defaultValue: 'HTTP {{status}} エラー',
            }) as string,
          );
        }
        const ct = response.headers.get('content-type') ?? '';
        if (!ct.includes('text/event-stream')) {
          throw new FatalSseError(
            i18n.t('editor.compileLog.sse.invalidContentType', {
              type: ct,
              defaultValue: '予期しないレスポンス形式: {{type}}',
            }) as string,
          );
        }
      },
      onmessage: (msg) => {
        try {
          const data = msg.data ? JSON.parse(msg.data) : null;
          switch (msg.event) {
            case 'start':
              // TTFB 確認のみ、UI 進捗開始は MVP scope 外 (Q-A defer、既存
              // isCompiling spinner で十分)。
              break;
            case 'firmware-meta':
              totalChunks = data.totalChunks;
              break;
            case 'firmware-chunk':
              // 補足 1: in-order push by seq index、event 順序は HTTP 上保証。
              firmwareChunks[data.seq] = base64ToUint8Array(data.data);
              break;
            case 'bootloader':
              bootloader = base64ToUint8Array(data.data);
              break;
            case 'partitions':
              partitions = base64ToUint8Array(data.data);
              break;
            case 'boot_app0':
              bootApp0 = base64ToUint8Array(data.data);
              break;
            case 'complete':
              completeData = data;
              ctrl.abort(); // graceful close — 以降の event は無視
              break;
            case 'error':
              errorData = data;
              ctrl.abort();
              break;
          }
        } catch (e) {
          // JSON parse / base64 decode 失敗を記録、以降の event は無視
          parseError = e instanceof Error ? e : new Error(String(e));
          ctrl.abort();
        }
      },
      onerror: (err) => {
        // auto reconnect 抑制 (重複 compile job 起動回避、要請 4 確定)。
        // FatalSseError は onopen からの fatal、AbortError は ctrl.abort() の正常 close。
        throw err;
      },
    });
  } catch (e) {
    // ctrl.abort() による正常 close は AbortError、これは無視して result 構築へ。
    // FatalSseError や network error は false return。
    const err = e as Error;
    if (err?.name !== 'AbortError') {
      const msg = err?.message || i18n.t('editor.compileLog.sse.unknown', {
        defaultValue: '予期しない SSE ストリームエラー',
      }) as string;
      return { success: false, error: msg };
    }
  }

  if (parseError) {
    // closure 内代入のため TS narrowing 不能 (errorData / completeData と同 pattern)、
    // 明示型注釈で `never` 化を回避
    const err: Error = parseError;
    return {
      success: false,
      error: err.message,
    };
  }

  // 補足 2 chunk count mismatch / 欠番 detection (defensive)
  if (errorData) {
    const e: { error: string; details?: string; stderr?: string } = errorData;
    return { success: false, error: e.error, details: e.details, stderr: e.stderr };
  }
  if (!completeData) {
    return {
      success: false,
      error: i18n.t('editor.compileLog.sse.streamEndedNoComplete', {
        defaultValue: 'SSE ストリームが完了 event なしで終了しました',
      }) as string,
    };
  }
  if (totalChunks !== undefined) {
    if (firmwareChunks.length !== totalChunks) {
      return {
        success: false,
        error: i18n.t('editor.compileLog.sse.chunkMismatch', {
          received: firmwareChunks.length,
          expected: totalChunks,
          defaultValue: 'ファームウェア chunk 数不整合 ({{received}}/{{expected}}、再試行してください)',
        }) as string,
      };
    }
    for (let i = 0; i < totalChunks; i++) {
      if (!firmwareChunks[i]) {
        return {
          success: false,
          error: i18n.t('editor.compileLog.sse.chunkMissing', {
            seq: i,
            defaultValue: 'ファームウェア chunk {{seq}} が欠落しています',
          }) as string,
        };
      }
    }
  }

  // CompileResult 構築 (既存 fullPackage / binary 互換、4 caller の field 解釈不変)
  const meta: { template?: string; pioBoard?: string; cached?: boolean } = completeData;
  const firmwareBlob = new Blob(firmwareChunks as BlobPart[], { type: 'application/octet-stream' });
  if (bootloader && partitions && bootApp0) {
    return {
      success: true,
      fullPackage: {
        firmware: firmwareBlob,
        bootloader: new Blob([bootloader as BlobPart], { type: 'application/octet-stream' }),
        partitions: new Blob([partitions as BlobPart], { type: 'application/octet-stream' }),
        bootApp0: new Blob([bootApp0 as BlobPart], { type: 'application/octet-stream' }),
      },
      version: meta.template,
      template: meta.template,
    };
  }
  return {
    success: true,
    binary: firmwareBlob,
    version: meta.template,
    template: meta.template,
  };
}

// 接続テスト (既存ロジック、SSE 化不要、GET /health のため short timeout で OK)
const testCompileServerConnection = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3秒タイムアウト
    });
    return response.ok;
  } catch (error) {
    console.debug(`[Compile] Server connection test failed for ${url}:`, error);
    return false;
  }
};

// ── Local compile-server version check (DigiCode Session 129) ─────────────
// Compares the local image's bake-in git sha (returned by /health) against
// the latest DockerHub `main-<sha>` tag for digicollc/digicode-compile-server.
// Only invoked in local mode — cloud is auto-deployed via CF LB, never stale
// from the user's perspective.
//
// Strategy:
//   1. GET <local>/health → { gitSha, builtAt, ... }
//   2. If local has no gitSha → outdated/legacy-image (no remote fetch needed:
//      we already know this image predates Session 129 and is missing the
//      bake-in identifier the CI started emitting from commit 96175ff).
//   3. GET <backend>/api/health/compile-server-latest → { latestSha }
//      (Workers-side proxy for DockerHub Hub API, since `hub.docker.com`
//      does not return Access-Control-Allow-Origin headers — direct browser
//      fetch always trips CORS.)
//   4. Compare localSha vs latestSha.
//
// Failure mode = fail-soft (Session 129 C-1 案A): proxy outage must not
// block compile entirely — log a warning, continue. Legacy-image detection
// is *unconditional* (does not depend on the remote fetch) so a Hub outage
// never lets a pre-Session-129 image slip through.

export type LocalVersionCheckOutcome =
  | { outcome: 'ok'; localSha: string; remoteSha: string }
  | {
      outcome: 'outdated';
      localSha: string | undefined;
      remoteSha: string | undefined;
      reason: 'sha-mismatch' | 'legacy-image';
    }
  | {
      outcome: 'check-failed';
      reason: 'local-unreachable' | 'remote-unreachable' | 'remote-unexpected-shape';
      detail?: string;
    };

// Workers-side proxy for the DockerHub Hub API (CORS-safe; the Hub API
// itself does not advertise Access-Control-Allow-Origin, so a direct
// browser fetch always fails).
//
// Path is relative — same-origin in production CF Pages because
// frontend / Workers / Pages all live behind `code.fablab-westharima.jp`
// (and `esp32-blockly-backend.kazunari-takeda.workers.dev` allowlists
// that origin). For local Vite dev, callers should be on the same network
// path; falling back to `check-failed/remote-unreachable` if not.
const VERSION_PROXY_URL =
  'https://esp32-blockly-backend.kazunari-takeda.workers.dev/api/health/compile-server-latest';

// LocalStorage cache: remoteSha + fetch wall to avoid hammering the proxy
// on every compile click. 1 hour TTL (Session 129 C-3 案A) — long enough
// that the upstream rate-limit is a non-issue, short enough that a newly
// published image notifies users within a single dev session.
const REMOTE_CACHE_KEY = 'compileServerRemoteShaCache';
const REMOTE_CACHE_TTL_MS = 60 * 60 * 1000;

interface RemoteShaCache {
  remoteSha: string;
  fetchedAt: number;
}

function readRemoteShaCache(): RemoteShaCache | null {
  try {
    const raw = localStorage.getItem(REMOTE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RemoteShaCache>;
    if (typeof parsed.remoteSha !== 'string' || typeof parsed.fetchedAt !== 'number') {
      return null;
    }
    if (Date.now() - parsed.fetchedAt > REMOTE_CACHE_TTL_MS) return null;
    return { remoteSha: parsed.remoteSha, fetchedAt: parsed.fetchedAt };
  } catch {
    return null;
  }
}

function writeRemoteShaCache(remoteSha: string): void {
  try {
    localStorage.setItem(
      REMOTE_CACHE_KEY,
      JSON.stringify({ remoteSha, fetchedAt: Date.now() }),
    );
  } catch {
    // localStorage quota / disabled — ignore (cache is best-effort).
  }
}

// Extract the latestSha string from the Workers proxy response. The proxy
// normalises DockerHub's tag list down to `{ status: 'ok', latestSha,
// lastUpdated }` (or `{ status: 'unavailable', reason }`). This helper
// stays pure so the unit tests can exercise it directly.
function extractRemoteShaFromProxyResponse(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null;
  const status = (json as { status?: unknown }).status;
  if (status !== 'ok') return null;
  const sha = (json as { latestSha?: unknown }).latestSha;
  return typeof sha === 'string' && /^[0-9a-f]{7}$/.test(sha) ? sha : null;
}

async function fetchRemoteSha(): Promise<string | null> {
  const cached = readRemoteShaCache();
  if (cached) return cached.remoteSha;
  const response = await fetch(VERSION_PROXY_URL, {
    method: 'GET',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`proxy HTTP ${response.status}`);
  }
  const json: unknown = await response.json();
  const sha = extractRemoteShaFromProxyResponse(json);
  if (!sha) {
    throw new Error('proxy response missing latestSha');
  }
  writeRemoteShaCache(sha);
  return sha;
}

async function checkLocalVersion(): Promise<LocalVersionCheckOutcome> {
  // 1. Fetch local /health. AbortSignal 3s aligns with testConnection.
  let localHealth: { gitSha?: unknown } & Record<string, unknown>;
  try {
    const url = getCompileServerLocalUrl();
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return {
        outcome: 'check-failed',
        reason: 'local-unreachable',
        detail: `HTTP ${response.status}`,
      };
    }
    localHealth = (await response.json()) as { gitSha?: unknown } & Record<string, unknown>;
  } catch (e) {
    return {
      outcome: 'check-failed',
      reason: 'local-unreachable',
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  const localSha =
    typeof localHealth.gitSha === 'string' && localHealth.gitSha !== 'unknown'
      ? localHealth.gitSha
      : undefined;

  // 2. Legacy-image guard — unconditional, BEFORE the remote fetch.
  //
  // If the local image predates Session 129 it returns a /health body
  // without a gitSha field. We can flag it as outdated immediately, without
  // needing a remote comparison — that's the structural defense against the
  // CORS bug (Session 129 hotfix): even if the proxy is unreachable the
  // legacy image is still blocked.
  if (localSha === undefined) {
    return {
      outcome: 'outdated',
      localSha: undefined,
      remoteSha: undefined,
      reason: 'legacy-image',
    };
  }

  // 3. Fetch the latest published sha via the Workers proxy.
  let remoteSha: string;
  try {
    const fetched = await fetchRemoteSha();
    if (!fetched) {
      return {
        outcome: 'check-failed',
        reason: 'remote-unexpected-shape',
      };
    }
    remoteSha = fetched;
  } catch (e) {
    return {
      outcome: 'check-failed',
      reason: 'remote-unreachable',
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  // 4. Compare.
  if (localSha !== remoteSha) {
    return { outcome: 'outdated', localSha, remoteSha, reason: 'sha-mismatch' };
  }
  return { outcome: 'ok', localSha, remoteSha };
}

export const compileService = {
  /**
   * Arduino C++コードをコンパイルして.binファイルを取得。
   * 内部実装は SSE only (BUG-078 fix layer 2/3、要請 3 確定)、
   * interface `Promise<CompileResult>` は完全不変で 4 caller 影響ゼロ。
   * cloud mode は primary (Ubuntu/ML30) → fallback (Railway) の SSE chain、
   * local mode は user 設定 URL に SSE。
   *
   * @param includes - インクルード文
   * @param globals - グローバル変数・関数
   * @param setupCode - setup()の中身
   * @param loopCode - loop()の中身
   * @param board - FQBN（省略時はストアから取得）
   * @param format - ファイルフォーマット ('bin' | 'uf2'、省略時は 'bin')
   * @param connectionType - 接続方式（テンプレート選択: 'ota'=DigiCodeOTA.ino, 'usb'=DigiCodeUSB.ino, 'ble'=DigiCodeBLE.ino）
   */
  async compile(includes: string, globals: string, setupCode: string, loopCode: string, board?: string, format: 'bin' | 'uf2' = 'bin', connectionType?: ConnectionType): Promise<CompileResult> {
    const mode = getCompileServerMode();
    const targetBoard = board || useBoardStore.getState().getFqbn();

    // ESP32 は fullPackage モード (4-file bundle) を要求、それ以外は format パラメータ。
    const isEsp32 = targetBoard.startsWith('esp32:');
    const queryParams = isEsp32 ? '?fullPackage=true' : (format === 'uf2' ? '?format=uf2' : '');

    const requestBody = JSON.stringify({
      includes,
      globals,
      setupCode,
      loopCode,
      board: targetBoard,
      connectionType: connectionType || undefined, // 未指定の場合はサーバーのデフォルト（OTA）
    });

    console.log('[Compile] Request parameters:', {
      board: targetBoard,
      connectionType: connectionType || 'undefined (default: ota)',
      isEsp32,
      queryParams,
    });

    const incrementUsage = () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        api.compileUsage.increment().catch(console.error);
      }
    };

    if (mode === 'cloud') {
      // primary: Cloudflare Load Balancer (api-compile.digital-fab.jp、CF LB が ML30 ↔ Railway 内部 failover、第105回 Task 1)
      console.log('[Compile] Trying CF Load Balancer (primary, SSE)...');
      try {
        const result = await compileViaSse(
          `${COMPILE_SERVERS.primary}/api/compile/sse${queryParams}`,
          requestBody,
        );
        if (result.success) {
          console.log('[Compile] ✓ CF LB compilation successful (SSE)', {
            version: result.version,
            template: result.template,
          });
          incrementUsage();
          return result;
        }
        // primary (CF LB) 失敗 → layer 2 = Railway 直接にフォールバック。
        // 通常時は CF LB 内部の ML30 ↔ Railway failover で完結、ここに到達するのは
        // CF LB infrastructure 自体が down した場合のみ (defense-in-depth)。
        console.warn('[Compile] CF LB returned error, falling back to direct Railway:', result.error);
      } catch (error) {
        console.warn('[Compile] CF LB SSE failed, falling back to direct Railway:', error);
      }

      // fallback: Railway 直接 (CF LB infrastructure 障害時の最終避難)
      console.log('[Compile] Trying Railway direct (backup, SSE)...');
      try {
        const result = await compileViaSse(
          `${COMPILE_SERVERS.fallback}/api/compile/sse${queryParams}`,
          requestBody,
        );
        if (result.success) {
          console.log('[Compile] ✓ Railway direct compilation successful (SSE, fallback)', {
            version: result.version,
            template: result.template,
          });
          incrementUsage();
        }
        return result;
      } catch (error) {
        return {
          success: false,
          error: 'Both CF LB and Railway direct are unavailable',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // local mode (user 設定 URL に SSE)
    //
    // Session 129: bake-in gitSha vs DockerHub `main-<sha>` 比較で
    // 古い image 検出時に compile を中止 + 更新通知。fail-soft (C-1 案A):
    // DockerHub 障害時は警告 console.warn のみで compile 続行する。
    const versionCheck = await checkLocalVersion();
    if (versionCheck.outcome === 'outdated') {
      const unknownLabel = i18n.t('editor.compileLog.versionCheck.unknownLabel', {
        defaultValue: '不明',
      }) as string;
      const localLabel = versionCheck.localSha ?? unknownLabel;
      const remoteLabel = versionCheck.remoteSha ?? unknownLabel;
      return {
        success: false,
        error: i18n.t('editor.compileLog.versionCheck.outdated', {
          localSha: localLabel,
          remoteSha: remoteLabel,
          defaultValue:
            'ローカル compile-server が古いバージョンです (ローカル: {{localSha}} / 最新: {{remoteSha}})。Docker Desktop で image を更新してください。',
        }) as string,
        details: i18n.t('editor.compileLog.versionCheck.updateGuide', {
          defaultValue:
            '更新手順: Docker Desktop の Images タブから digicollc/digicode-compile-server を Pull、または terminal で `docker pull digicollc/digicode-compile-server:latest` を実行後、コンテナを再起動してください。',
        }) as string,
        outdated: {
          localSha: versionCheck.localSha,
          remoteSha: versionCheck.remoteSha,
          reason: versionCheck.reason,
        },
      };
    }
    if (versionCheck.outcome === 'check-failed') {
      console.warn(
        '[Compile] Local version check failed (fail-soft, continuing):',
        versionCheck.reason,
        versionCheck.detail,
      );
    }
    try {
      const serverUrl = getCompileServerUrl();
      const result = await compileViaSse(
        `${serverUrl}/api/compile/sse${queryParams}`,
        requestBody,
      );
      if (result.success) {
        console.log('[Compile] ✓ Local server compilation successful (SSE)', {
          version: result.version,
          template: result.template,
        });
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * コンパイルサーバーのヘルスチェック (GET、SSE 化不要、TTFB 即時で edge timer 内)
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

  // サーバーモード関連のメソッド (既存 export 維持、4 caller 互換)
  getMode: getCompileServerMode,
  setMode: setCompileServerMode,
  testConnection: testCompileServerConnection,
  getServerUrl: getCompileServerUrl,
  getLocalUrl: getCompileServerLocalUrl,
  setLocalUrl: setCompileServerLocalUrl,
  // Local image vs DockerHub `main-<sha>` 比較 (Session 129)
  checkLocalVersion,
  servers: COMPILE_SERVERS,
};

// Internal helpers exported for unit tests only (not part of the public API).
// (vitest test file から import 可能、production code は compileService.* を使用)
export const __testing__ = {
  compileViaSse,
  base64ToUint8Array,
  FatalSseError,
  checkLocalVersion,
  extractRemoteShaFromProxyResponse,
  REMOTE_CACHE_KEY,
};
