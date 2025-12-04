/**
 * レート制限ミドルウェア
 * Cloudflare Workers用の簡易レート制限
 *
 * Note: この実装はワーカーインスタンスごとのメモリ内で動作します。
 * 本番環境での厳密なレート制限にはCloudflare KVまたはDurable Objectsを使用してください。
 */
import { Context, Next } from 'hono';

// リクエスト記録の型
interface RequestRecord {
  count: number;
  resetTime: number;
}

// メモリ内ストレージ（ワーカーインスタンスごと）
const requestStore = new Map<string, RequestRecord>();

// 古いエントリをクリーンアップ
function cleanup() {
  const now = Date.now();
  for (const [key, record] of requestStore.entries()) {
    if (record.resetTime < now) {
      requestStore.delete(key);
    }
  }
}

// 定期的にクリーンアップ（100リクエストごと）
let requestCount = 0;

/**
 * レート制限オプション
 */
interface RateLimitOptions {
  windowMs: number;  // ウィンドウサイズ（ミリ秒）
  max: number;       // ウィンドウ内の最大リクエスト数
  keyGenerator?: (c: Context) => string;  // キー生成関数
  message?: string;  // エラーメッセージ
  skipFailedRequests?: boolean;  // 失敗したリクエストをカウントしない
}

/**
 * レート制限ミドルウェアを作成
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs = 60000, // デフォルト: 1分
    max = 100,        // デフォルト: 100リクエスト/分
    keyGenerator = defaultKeyGenerator,
    message = 'リクエスト数が制限を超えました。しばらくしてから再試行してください。',
  } = options;

  return async (c: Context, next: Next) => {
    // クリーンアップ
    requestCount++;
    if (requestCount % 100 === 0) {
      cleanup();
    }

    const key = keyGenerator(c);
    const now = Date.now();

    // 現在のレコードを取得または作成
    let record = requestStore.get(key);

    if (!record || record.resetTime < now) {
      // 新しいウィンドウを開始
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // リクエストをカウント
    record.count++;
    requestStore.set(key, record);

    // レスポンスヘッダーを設定
    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetSeconds.toString());

    // 制限を超えた場合
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
 * デフォルトのキー生成関数
 * IPアドレスを使用
 */
function defaultKeyGenerator(c: Context): string {
  // Cloudflare Workersでは cf-connecting-ip ヘッダーを使用
  const ip =
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0] ||
    c.req.header('x-real-ip') ||
    'unknown';

  return `ratelimit:${ip}`;
}

/**
 * 認証済みユーザー用のキー生成関数
 * ユーザーIDを使用
 */
export function userKeyGenerator(c: Context): string {
  const user = c.get('user') as { userId: number } | undefined;
  if (user?.userId) {
    return `ratelimit:user:${user.userId}`;
  }
  return defaultKeyGenerator(c);
}

/**
 * エンドポイント別のキー生成関数
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
// Note: 開発環境では wrangler dev が使用され、レート制限はワーカーインスタンスごとに動作
export const rateLimitPresets = {
  // 一般的なAPI（100リクエスト/分）
  standard: rateLimit({
    windowMs: 60000,
    max: 100,
  }),

  // 認証エンドポイント（60リクエスト/分 - E2Eテスト対応）
  // Note: 本番環境ではCloudflare WAFでより厳しい制限を設定することを推奨
  auth: rateLimit({
    windowMs: 60000,
    max: 60,
    message: 'ログイン試行回数が多すぎます。しばらくしてから再試行してください。',
  }),

  // コンパイルエンドポイント（30リクエスト/分）
  compile: rateLimit({
    windowMs: 60000,
    max: 30,
    message: 'コンパイルリクエストが多すぎます。しばらくしてから再試行してください。',
  }),

  // Webhook（制限緩め: 1000リクエスト/分）
  webhook: rateLimit({
    windowMs: 60000,
    max: 1000,
  }),
};
