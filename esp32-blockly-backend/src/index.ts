import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import passkey from './routes/passkey';
import recoveryCodes from './routes/recovery-codes';
import projects from './routes/projects';
import compileUsage from './routes/compile-usage';
import subscriptions from './routes/subscriptions';
import webhooks from './routes/webhooks';
import { rateLimitPresets } from './middleware/rateLimit';

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  WEBAUTHN_CHALLENGES: KVNamespace;
  JWT_SECRET: string;
  CORS_ORIGINS?: string; // Optional: comma-separated list of additional origins
  SQUARE_ACCESS_TOKEN?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_WEBHOOK_SIGNATURE_KEY?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
// Default allowed origins (development + production)
const defaultOrigins = [
  // Development
  'http://localhost:5173',
  'http://localhost:3000',
  // Production (Cloudflare Pages)
  'https://esp32-blockly-frontend.pages.dev',
  'https://digicode.pages.dev',
  // Custom domain (if configured)
  'https://digicode.app',
  'https://www.digicode.app',
];

app.use('*', cors({
  origin: (origin, c) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return '*';

    // Check default origins
    if (defaultOrigins.includes(origin)) return origin;

    // Check additional origins from environment variable
    const additionalOrigins = c.env.CORS_ORIGINS?.split(',').map(o => o.trim()) || [];
    if (additionalOrigins.includes(origin)) return origin;

    // Allow Cloudflare Pages preview deployments
    if (origin.endsWith('.pages.dev')) return origin;

    // Reject unknown origins
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ルート
app.get('/', (c) => {
  return c.json({ message: 'DigiCode API' });
});

// レート制限を適用
// 認証エンドポイント（厳しめ: 10リクエスト/分）
app.use('/api/auth/*', rateLimitPresets.auth);

// コンパイル使用量（中程度: 30リクエスト/分）
app.use('/api/compile-usage/*', rateLimitPresets.compile);

// その他のAPIエンドポイント（標準: 100リクエスト/分）
app.use('/api/projects/*', rateLimitPresets.standard);
app.use('/api/subscriptions/*', rateLimitPresets.standard);

// Webhook（制限緩め: 1000リクエスト/分）
app.use('/api/webhooks/*', rateLimitPresets.webhook);

// 認証ルート
app.route('/api/auth', auth);

// パスキールート
app.route('/api/auth/passkey', passkey);

// リカバリーコードルート
app.route('/api/auth/recovery-codes', recoveryCodes);

// プロジェクトルート
app.route('/api/projects', projects);

// コンパイル使用量ルート
app.route('/api/compile-usage', compileUsage);

// サブスクリプションルート
app.route('/api/subscriptions', subscriptions);

// Webhookルート（Square決済連携）
app.route('/api/webhooks', webhooks);

// KVテストエンドポイント（Phase 1.6.2検証用、本番前に削除）
app.get('/api/test/kv', async (c) => {
  try {
    const testKey = 'test-key';
    const testValue = 'test-value-' + Date.now();

    // KVに書き込み
    await c.env.WEBAUTHN_CHALLENGES.put(testKey, testValue, { expirationTtl: 60 });

    // KVから読み込み
    const retrievedValue = await c.env.WEBAUTHN_CHALLENGES.get(testKey);

    // KVから削除
    await c.env.WEBAUTHN_CHALLENGES.delete(testKey);

    return c.json({
      success: true,
      message: 'KV access test successful',
      written: testValue,
      retrieved: retrievedValue,
      match: testValue === retrievedValue
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
