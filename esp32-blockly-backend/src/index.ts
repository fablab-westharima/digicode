import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import projects from './routes/projects';

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ルート
app.get('/', (c) => {
  return c.json({ message: 'ESP32 Block Editor API' });
});

// 認証ルート
app.route('/api/auth', auth);

// プロジェクトルート
app.route('/api/projects', projects);

export default app;
