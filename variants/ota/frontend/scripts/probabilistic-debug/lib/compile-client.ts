/**
 * compile-client.ts
 *
 * POSTs the 4-fragment payload produced by `cpp-generator.ts` to
 * `arduino-compile-server` (`POST /api/compile`). Adds:
 *   - per-attempt timeout via AbortController
 *   - one retry on transient failures (timeout / 5xx)
 *   - structured `CompileResult` distinguishing transport errors,
 *     server errors, and compile failures
 *
 * The HTTP contract mirrors `src/services/compileService.ts`. When the board
 * is ESP32 we set `?fullPackage=true` so the server returns the firmware +
 * bootloader bundle (we ignore the binary itself; only success/failure
 * matters for compile-rate testing).
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
  /** Compiler stderr from the server (if provided). */
  stderr?: string;
  /** Free-form details (server response body or generator details). */
  details?: string;
  /** True when the second attempt was used (transient failure recovered or surfaced). */
  retryUsed?: boolean;
}

export interface CompileClientOptions {
  serverUrl: string;
  board: string;
  connectionType?: 'ota' | 'usb' | 'ble';
  /** Per-attempt timeout. Default 60s, matching 43.md §5.2. */
  timeoutMs?: number;
  /** Override the global `fetch` (test seam). */
  fetchImpl?: typeof fetch;
}

// PlatformIO Core: cold compile (first per board×template) ~52s, warm ~9.6s.
// 180s gives cold compiles ~3.5× headroom while cutting truly stuck runs.
const DEFAULT_TIMEOUT_MS = 180_000;

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
  // Network/timeout failures (no status field).
  if (r.status === undefined) return true;
  // Server-side transient errors.
  if (r.status >= 500) return true;
  return false;
}

async function attempt(
  fragments: CompileFragments,
  opts: CompileClientOptions,
): Promise<CompileResult> {
  const start = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const isEsp32 = opts.board.startsWith('esp32:');
  const queryParams = isEsp32 ? '?fullPackage=true' : '';
  const url = `${opts.serverUrl}/api/compile${queryParams}`;

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
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    const durationMs = Date.now() - start;
    const status = response.status;

    if (!response.ok) {
      let errorBody: string | undefined;
      try {
        errorBody = await response.text();
      } catch {
        // ignore — body unreadable
      }
      return {
        ok: false,
        durationMs,
        status,
        error: `HTTP ${status}`,
        details: truncate(errorBody, 2000),
      };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch (e) {
      return {
        ok: false,
        durationMs,
        status,
        error: 'invalid JSON response',
        details: (e as Error).message,
      };
    }

    const data = json as {
      success?: boolean;
      error?: string;
      details?: string;
      stderr?: string;
    };
    if (data.success) {
      return { ok: true, durationMs, status };
    }
    return {
      ok: false,
      durationMs,
      status,
      error: data.error ?? 'compile failed',
      details: truncate(data.details, 4000),
      stderr: truncate(data.stderr, 4000),
    };
  } catch (e) {
    clearTimeout(timer);
    const durationMs = Date.now() - start;
    const err = e as Error;
    if (err.name === 'AbortError') {
      return {
        ok: false,
        durationMs,
        error: `timeout after ${timeoutMs}ms`,
      };
    }
    return {
      ok: false,
      durationMs,
      error: err.message ?? 'fetch failed',
    };
  }
}

function truncate(s: string | undefined, max: number): string | undefined {
  if (s === undefined) return undefined;
  if (s.length <= max) return s;
  return `${s.substring(0, max)}…(truncated ${s.length - max} chars)`;
}
