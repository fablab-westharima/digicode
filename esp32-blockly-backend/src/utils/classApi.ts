/**
 * ML30 class API proxy helper.
 *
 * Forwards requests from Cloudflare Workers to the digicode-class-server
 * running on ML30 behind a Cloudflare Tunnel.
 *
 * 認証レベル2:
 *   - X-Internal-Secret: CLASS_API_SECRET (Workers Secret) をヘッダーに注入
 *   - X-User-Id: authMiddleware で検証済みの userId を渡す
 *   - X-Request-Id: 相関用 (Workers ログと ML30 ログを紐付け)
 *
 * 設計:
 *   - タイムアウト 10 秒 (軽量 CRUD を想定、それ以上かかるのは異常)
 *   - ML30 からのレスポンスはそのまま透過 (ML30 側で日本語エラーメッセージ
 *     を組み立てる前提)
 *   - 通信エラー時は 503 (ML30 ダウン or Cloudflare Tunnel 切断)
 *
 * 関連: prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md (プレ調査E)
 */

import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ClassApiEnv = {
  CLASS_API_URL: string; // e.g. "https://class.digital-fab.jp"
  CLASS_API_SECRET: string; // Workers Secret
};

export type ClassApiResult =
  | { ok: true; status: ContentfulStatusCode; body: unknown }
  | { ok: false; status: ContentfulStatusCode; error: string };

type ProxyOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string; // e.g. "/classes" or "/classes/42"
  userId: number;
  body?: unknown;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Forward a request to the ML30 class API.
 *
 * Returns a discriminated union so callers can branch on `ok` without
 * having to try/catch network errors at the route layer.
 */
export async function proxyClassApi(
  env: ClassApiEnv,
  opts: ProxyOptions
): Promise<ClassApiResult> {
  if (!env.CLASS_API_URL) {
    return {
      ok: false,
      status: 500,
      error: 'CLASS_API_URL が設定されていません',
    };
  }
  if (!env.CLASS_API_SECRET) {
    return {
      ok: false,
      status: 500,
      error: 'CLASS_API_SECRET が設定されていません',
    };
  }

  const url = new URL(opts.path, env.CLASS_API_URL).toString();
  const requestId = crypto.randomUUID();

  const headers: Record<string, string> = {
    'X-Internal-Secret': env.CLASS_API_SECRET,
    'X-User-Id': String(opts.userId),
    'X-Request-Id': requestId,
    Accept: 'application/json',
  };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Combine caller signal (if any) with our timeout.
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    DEFAULT_TIMEOUT_MS
  );
  const signal = opts.signal
    ? anySignal([opts.signal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const res = await fetch(url, {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal,
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // ML30 returned non-JSON; treat as upstream error.
        return {
          ok: false,
          status: 502,
          error: 'クラス機能サーバーから不正な応答を受け取りました',
        };
      }
    }

    // F-11 (Session 123): ML30 が 4xx/5xx を返した場合も ok:false に flip。
    // 旧コードは status >= 400 でも ok:true で返却 = callsite (16 sites) の
    // success path `c.json(apiResult.body, apiResult.status)` に ML30 internal
    // error JSON が pass-through、attacker が crafted request で ML30 internal
    // field names / validation messages を leak 可能 (Session 121 NEW-5 fix の
    // 構造的続き、!apiResult.ok branch のみ closure していて status >= 400 with
    // ok:true は未 closure だった channel)。
    //
    // 本 fix で utility 層 1 箇所で structural closure、callsite 16 sites の
    // `if (!apiResult.ok)` パスに 4xx/5xx 全件 routes される。
    // error field は internal log 用に ML30 body の string 化 (callsite で
    // console.error 経由のみ消費、client に返却されない = NEW-5 整合)。
    if (res.status >= 400) {
      const errorText = typeof body === 'object' && body !== null
        ? JSON.stringify(body)
        : (text || `HTTP ${res.status}`);
      return {
        ok: false,
        status: res.status as ContentfulStatusCode,
        error: errorText,
      };
    }

    return { ok: true, status: res.status as ContentfulStatusCode, body };
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        error: 'クラス機能サーバーへの接続がタイムアウトしました',
      };
    }
    console.error('[classApi] fetch error:', err);
    return {
      ok: false,
      status: 503,
      error: 'クラス機能サーバーに接続できません',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Combine multiple AbortSignals into one. Aborted if any input is aborted.
 * (AbortSignal.any is not yet universally available in Workers runtime.)
 */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), {
      once: true,
    });
  }
  return controller.signal;
}
