/**
 * compile-client.ts (BUG-078 fix layer 3/3、commit #4、第84回、57.md §2.4)
 *
 * SSE 経由で `POST /api/compile/sse` を呼び、CompileResult を返却。
 * Cloudflare Free/Pro/Business plan の edge proxy_read_timeout = 100s + ±5s
 * 制約 (BUG-078) を回避するため、long-running compile (cold 100-200s) は
 * heartbeat 15s 間隔の SSE comment line で edge timer をリセット。
 *
 * Frontend (`compileService.ts`) は `@microsoft/fetch-event-source` を採用するが、
 * orchestrator は **Node 18+ native fetch + 自前 WHATWG-spec compliant SSE parser**
 * を採用 (要請 4 確定、auto reconnect 概念で重複 compile job リスク回避)。
 * ~30 LOC の inline 実装、frontend 別 implementation との dual は YAGNI 範囲内。
 *
 * Adds (commit #4):
 *   - 自前 SSE parser (`parseSseEvents` async generator、WHATWG spec compliant:
 *     `\n\n` delimiter / `:` comment line / `event:` / `id:` / `data:` 全件処理)
 *   - stuck detection: 30s 無音 (heartbeat 15s × 2 safety margin) で AbortError
 *   - 524 retry を `shouldRetry()` から削除 (SSE で原理発生せず、保守上 dead branch)
 *   - `retryUsed` 意味再定義: 「initial connection retry 1 回使用」(network /
 *     non-524 5xx 限定)
 *
 * `CompileResult` interface は完全不変 (jsonl format 互換、Phase 4-3/4-4 で既存
 * jq filter 全件動作可能)。`CaseResult` mapping (orchestrator.ts → result-store.ts)
 * も変更不要。
 */

import type { CompileFragments } from './cpp-generator';

export interface CompileResult {
  ok: boolean;
  /** Total elapsed time including retries. */
  durationMs: number;
  /** HTTP status of the (last) attempt; undefined for network errors. */
  status?: number;
  /** Short error label (e.g. `"timeout after 60000ms"` or `"HTTP 502"`). */
  error?: string;
  /** Compiler stderr from the server (if provided via `event: error`). */
  stderr?: string;
  /** Free-form details (server response body or generator details). */
  details?: string;
  /**
   * True when the second attempt was used. SSE 文脈再定義 (commit #4):
   * 「initial connection retry 1 回使用」(network error / non-524 5xx 限定)。
   * 524 は SSE で原理発生せず、`event: error` (compile fail) は retry なし。
   */
  retryUsed?: boolean;
  /**
   * amendment 9 (2026-05-07): `true` when the server served the result from
   * its result-blob cache (cache.ts), `false` for a fresh compile, `undefined`
   * when the server response did not carry the field (older servers / errors).
   * The orchestrator aggregates this for the per-run cache HIT/MISS report.
   * When `noCache: true` is set, this should always be `false` from a
   * compliant server.
   */
  cached?: boolean;
}

export interface CompileClientOptions {
  serverUrl: string;
  board: string;
  connectionType?: 'ota' | 'usb' | 'ble';
  /** Per-attempt timeout. Default 180s (cold compile + buffer). */
  timeoutMs?: number;
  /** Override the global `fetch` (test seam、既存 pattern 維持)。 */
  fetchImpl?: typeof fetch;
  /**
   * Stuck detection threshold (ms). Default 30s = heartbeat 15s × 2 safety
   * margin。production smoke (commit #5) で false positive 観測時に 60s 化検討。
   */
  stuckMs?: number;
  /**
   * amendment 9 (2026-05-07): pass `?no-cache=true` to the server so the
   * result-blob cache (cache.ts) is bypassed for both lookup and store. Used
   * by the orchestrator's `--no-cache` flag for cold-compile measurement and
   * to keep the production cache untouched during test runs. Production
   * clients (frontend) MUST NOT set this. Default false.
   */
  noCache?: boolean;
}

// amendment 8 (2026-05-07): per-attempt compile timeout default.
// History:
//   ~9.6s warm, ~52s cold (45.md Phase 1 baseline) → 180s default with 3.5×
//     headroom seemed safe.
//   BUG-078 (Stage D v2 第84回): heavy lib lottery (NimBLE + ArduinoHA +
//     deep registry chain) ranged 360-509s. 180s default + missing CLI
//     `--timeout-ms` flag failed 11/77 spot cases.
//   amendment 8 raises default to 1000s (16.7 min) to cover the worst
//     observed cold compile + buffer. SSE heartbeat (15s) + stuck detection
//     (30s of silence) catches genuinely-hung compiles long before this
//     timeout fires; 1000s exists only for "first compile after volume
//     eviction with the heaviest lib set" outlier. Pair with server-side
//     COMPILE_TIMEOUT_MS=900s (Dockerfile baked, amendment 7) — server kills
//     before client times out, so the client never reports a false timeout
//     when the server has already errored.
const DEFAULT_TIMEOUT_MS = 1_000_000;

// Stuck detection: heartbeat 15s 間隔に対し 2× safety margin。
const DEFAULT_STUCK_MS = 30_000;

export async function compileCpp(
  fragments: CompileFragments,
  opts: CompileClientOptions,
): Promise<CompileResult> {
  const start = Date.now();
  const first = await attempt(fragments, opts);
  if (first.ok || !shouldRetry(first)) {
    return { ...first, durationMs: Date.now() - start };
  }
  const second = await attempt(fragments, opts);
  return { ...second, retryUsed: true, durationMs: Date.now() - start };
}

export function shouldRetry(r: CompileResult): boolean {
  if (r.ok) return false;
  // Network/timeout failures (no status field) — transient、retry once.
  if (r.status === undefined) return true;
  // 524 explicitly excluded: SSE で原理発生せず、保守上 dead branch
  // (要請 4 確定、第84回)。CF Free 100s edge timer は SSE heartbeat で
  // reset されるため、524 は heartbeat 不発時のみ発生 = persistent error。
  if (r.status === 524) return false;
  // Server-side transient errors (502/503 等)。
  if (r.status >= 500) return true;
  return false;
}

/**
 * WHATWG SSE spec compliant parser (~30 LOC inline、要請 4 確定方針):
 *   - `\n\n` event delimiter
 *   - `:` line = SSE comment (heartbeat) → ignore
 *   - `event:` / `id:` / `data:` 行 parse
 *   - `data:` multi-line は `\n` join (spec 通り)
 *   - partial buffer (chunk 境界をまたぐ event) は次 read で結合
 *
 * `onActivity` は受信 byte ごとに呼ばれ、stuck detection timer reset 用。
 * `signal` は abort 時に reader.cancel() で pending read() を中断 (mock fetch
 * 環境で AbortController.signal が body stream に伝搬しない場合の defensive、
 * production Node 18+ undici fetch では signal が body にも伝搬するが double safety)。
 */
async function* parseSseEvents(
  stream: ReadableStream<Uint8Array>,
  onActivity?: () => void,
  signal?: AbortSignal,
): AsyncIterable<{ event?: string; data: string; id?: string }> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const onAbort = (): void => {
    reader.cancel().catch(() => {
      // already cancelled or error during cancel — ignore
    });
  };
  if (signal) {
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  try {
    while (true) {
      let readResult: ReadableStreamReadResult<Uint8Array>;
      try {
        readResult = await reader.read();
      } catch (readErr) {
        // reader cancelled or stream errored. signal-driven cancel は通常
        // read() を `{done:true}` で resolve させるため、ここに来るのは rare な
        // stream error 起因のみ。signal.aborted なら abort reason を伝搬、
        // そうでなければ raw error を伝搬。
        if (signal?.aborted) {
          throw signal.reason ?? new DOMException('aborted', 'AbortError');
        }
        throw readErr;
      }
      if (readResult.done) break;
      const { value } = readResult;
      onActivity?.();
      buffer += decoder.decode(value, { stream: true });
      const eventBlocks = buffer.split('\n\n');
      buffer = eventBlocks.pop() ?? ''; // last partial event re-buffer
      for (const block of eventBlocks) {
        const lines = block.split('\n');
        let event: string | undefined;
        let id: string | undefined;
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith(':')) continue; // SSE comment line (heartbeat) → ignore
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('id:')) id = line.slice(3).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length > 0) yield { event, data: dataLines.join('\n'), id };
      }
    }
  } finally {
    if (signal) signal.removeEventListener('abort', onAbort);
    try {
      reader.releaseLock();
    } catch {
      // already released — ignore
    }
  }
}

async function attempt(
  fragments: CompileFragments,
  opts: CompileClientOptions,
): Promise<CompileResult> {
  const start = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const stuckMs = opts.stuckMs ?? DEFAULT_STUCK_MS;
  const ctrl = new AbortController();
  const overallTimer = setTimeout(
    () => ctrl.abort(new DOMException(`overall timeout after ${timeoutMs}ms`, 'AbortError')),
    timeoutMs,
  );

  // Stuck detection: heartbeat 15s × 2 safety margin。受信 byte ごとに reset。
  let stuckTimer: ReturnType<typeof setTimeout> | undefined;
  const armStuck = (): void => {
    if (stuckTimer !== undefined) clearTimeout(stuckTimer);
    stuckTimer = setTimeout(
      () => ctrl.abort(new DOMException(`stuck: ${stuckMs}ms no event`, 'AbortError')),
      stuckMs,
    );
  };

  const isEsp32 = opts.board.startsWith('esp32:');
  // amendment 9: append `no-cache=true` when caller opts in. Combine with
  // `fullPackage` cleanly even though only one is currently expected on
  // ESP32 production traffic (the orchestrator's --no-cache also targets
  // ESP32-only board matrices today).
  const queryPairs: string[] = [];
  if (isEsp32) queryPairs.push('fullPackage=true');
  if (opts.noCache) queryPairs.push('no-cache=true');
  const queryParams = queryPairs.length > 0 ? `?${queryPairs.join('&')}` : '';
  const url = `${opts.serverUrl}/api/compile/sse${queryParams}`;

  const body = JSON.stringify({
    includes: fragments.includes,
    globals: fragments.globals,
    setupCode: fragments.setupCode,
    loopCode: fragments.loopCode,
    board: opts.board,
    connectionType: opts.connectionType,
  });

  const fetchFn = opts.fetchImpl ?? fetch;
  try {
    const response = await fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'ja',
        Accept: 'text/event-stream',
      },
      body,
      signal: ctrl.signal,
    });

    if (!response.ok) {
      const status = response.status;
      let errorBody: string | undefined;
      try {
        errorBody = await response.text();
      } catch {
        // body unreadable — ignore
      }
      return {
        ok: false,
        durationMs: Date.now() - start,
        status,
        error: `HTTP ${status}`,
        details: truncate(errorBody, 2000),
      };
    }

    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('text/event-stream')) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        status: response.status,
        error: `unexpected content-type: ${ct}`,
      };
    }
    if (!response.body) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        status: response.status,
        error: 'no response body',
      };
    }

    armStuck(); // first event 待ち中も stuck 監視

    let totalChunks: number | undefined;
    let firmwareChunkCount = 0;
    let completeReceived = false;
    let cached: boolean | undefined;
    let errorData: { error?: string; details?: string; stderr?: string } | null = null;
    let parseError: string | null = null;

    for await (const { event, data } of parseSseEvents(response.body, armStuck, ctrl.signal)) {
      try {
        const parsed: unknown = data ? JSON.parse(data) : null;
        const obj = (parsed && typeof parsed === 'object') ? (parsed as Record<string, unknown>) : null;
        switch (event) {
          case 'start':
            break; // TTFB 確認のみ
          case 'firmware-meta':
            if (obj && typeof obj.totalChunks === 'number') totalChunks = obj.totalChunks;
            break;
          case 'firmware-chunk':
            firmwareChunkCount++;
            break;
          case 'bootloader':
          case 'partitions':
          case 'boot_app0':
            break; // 単一 event 受信確認のみ (orchestrator は success/fail のみ判定)
          case 'complete':
            completeReceived = true;
            // amendment 9: propagate the server's cache HIT/MISS signal to
            // the orchestrator's per-run aggregation. `cached` is omitted
            // entirely from older servers, in which case we leave it as
            // undefined (CompileResult.cached === undefined → "unknown").
            if (obj && typeof obj.cached === 'boolean') cached = obj.cached;
            break;
          case 'error':
            errorData = (obj as { error?: string; details?: string; stderr?: string }) ?? { error: 'unknown error' };
            break;
        }
      } catch (e) {
        parseError = `SSE event parse error: ${(e as Error).message}`;
      }

      if (completeReceived || errorData || parseError) break; // 早期 exit、reader は parser finally で release
    }

    // signal.aborted post-loop check: reader.cancel() は read() を `{done:true}`
    // で resolve させる (reject せず) ため、parser は silent break で loop 抜ける。
    // ctrl.abort() が fired (stuck or external cancel) なら、完了 event 受信前
    // の break = abort 起因 = 「stuck」エラーとして報告。
    //
    // status を omit する意図: stuck は transport-level transient error (heartbeat
    // 未着で edge timer fire 想定相当)、HTTP response 自体は 200 OK だが body
    // stream が stuck したという state。shouldRetry() は status undefined を
    // network error 扱いで retry 一回するため、stuck も同経路で retry させる。
    if (ctrl.signal.aborted && !completeReceived && !errorData) {
      const reason = ctrl.signal.reason as Error | undefined;
      return {
        ok: false,
        durationMs: Date.now() - start,
        error: reason?.message ?? 'aborted',
      };
    }

    if (parseError) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        status: response.status,
        error: parseError,
      };
    }

    if (errorData) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        status: response.status,
        error: errorData.error ?? 'unknown error',
        details: truncate(errorData.details, 4000),
        stderr: truncate(errorData.stderr, 4000),
      };
    }

    if (!completeReceived) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        status: response.status,
        error: 'SSE stream ended without complete event',
      };
    }

    // 補足 2 chunk count mismatch detection (defensive、orchestrator 側 safety net)
    if (totalChunks !== undefined && firmwareChunkCount !== totalChunks) {
      return {
        ok: false,
        durationMs: Date.now() - start,
        status: response.status,
        error: `firmware chunk count mismatch: received ${firmwareChunkCount}, expected ${totalChunks}`,
      };
    }

    return { ok: true, durationMs: Date.now() - start, status: response.status, cached };
  } catch (e) {
    const err = e as Error;
    const durationMs = Date.now() - start;
    if (err.name === 'AbortError') {
      // overall timeout / stuck detection / external cancel
      return { ok: false, durationMs, error: err.message || 'aborted' };
    }
    return { ok: false, durationMs, error: err.message ?? 'fetch failed' };
  } finally {
    clearTimeout(overallTimer);
    if (stuckTimer !== undefined) clearTimeout(stuckTimer);
  }
}

function truncate(s: string | undefined, max: number): string | undefined {
  if (s === undefined) return undefined;
  if (s.length <= max) return s;
  return `${s.substring(0, max)}…(truncated ${s.length - max} chars)`;
}

// Internal helpers exported for tests only.
export const __testing__ = {
  parseSseEvents,
};
