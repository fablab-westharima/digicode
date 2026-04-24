/**
 * レート制限ミドルウェア (Cloudflare KV ベース)
 *
 * 以前のインメモリ実装はワーカーインスタンスごとにカウンタが分離し、
 * Cloudflare のロードバランサがリクエストを複数インスタンスに分散すると
 * 実質的なレート制限として機能しなかった。
 * 現行実装は RATE_LIMIT_KV namespace にカウンタを保存し、
 * インスタンス間で共有する。KV 自体の eventual consistency により
 * 厳密な atomic カウンタではない（±数件の誤差あり）が、
 * レート制限用途では許容範囲。
 */
import { Context, Next } from 'hono';

interface RequestRecord {
  count: number;
  resetTime: number;
}

interface RateLimitBindings {
  RATE_LIMIT_KV: KVNamespace;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (c: Context) => string;
  message?: string;
  skipFailedRequests?: boolean;
}

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs = 60000,
    max = 100,
    keyGenerator = defaultKeyGenerator,
    message = 'リクエスト数が制限を超えました。しばらくしてから再試行してください。',
  } = options;

  return async (c: Context<{ Bindings: RateLimitBindings }>, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    const stored = await c.env.RATE_LIMIT_KV.get<RequestRecord>(key, 'json');

    let record: RequestRecord;
    if (!stored || stored.resetTime < now) {
      record = { count: 1, resetTime: now + windowMs };
    } else {
      record = { count: stored.count + 1, resetTime: stored.resetTime };
    }

    // KV の TTL で自動 cleanup（旧実装の cleanup 関数は削除）
    // window 経過後 + 60 秒の余裕をもって expire
    const ttlSeconds = Math.max(60, Math.ceil((record.resetTime - now) / 1000) + 60);
    await c.env.RATE_LIMIT_KV.put(key, JSON.stringify(record), {
      expirationTtl: ttlSeconds,
    });

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetSeconds.toString());

    if (record.count > max) {
      c.header('Retry-After', resetSeconds.toString());
      return c.json(
        {
          error: 'Too Many Requests',
          message,
          retryAfter: resetSeconds,
        },
        429
      );
    }

    await next();
  };
}

/**
 * デフォルトのキー生成関数 (IP ベース)
 */
function defaultKeyGenerator(c: Context): string {
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0] ||
    c.req.header('x-real-ip') ||
    'unknown';

  return `ratelimit:${ip}`;
}

/**
 * 認証済みユーザー用のキー生成関数 (user ID ベース)
 */
export function userKeyGenerator(c: Context): string {
  const user = c.get('user') as { userId: number } | undefined;
  if (user?.userId) {
    return `ratelimit:user:${user.userId}`;
  }
  return defaultKeyGenerator(c);
}

/**
 * エンドポイント別のキー生成関数 (IP + path)
 */
export function endpointKeyGenerator(c: Context): string {
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0] ||
    'unknown';
  const path = c.req.path;

  return `ratelimit:${ip}:${path}`;
}

// プリセット設定
export const rateLimitPresets = {
  // 一般 API: 100 req/min
  standard: rateLimit({
    windowMs: 60000,
    max: 100,
  }),

  // 認証エンドポイント: 60 req/min
  auth: rateLimit({
    windowMs: 60000,
    max: 60,
    message: 'ログイン試行回数が多すぎます。しばらくしてから再試行してください。',
  }),

  // コンパイルエンドポイント: 30 req/min
  compile: rateLimit({
    windowMs: 60000,
    max: 30,
    message: 'コンパイルリクエストが多すぎます。しばらくしてから再試行してください。',
  }),

  // Webhook: 1000 req/min
  webhook: rateLimit({
    windowMs: 60000,
    max: 1000,
  }),
};
