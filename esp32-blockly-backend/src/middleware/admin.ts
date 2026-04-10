import type { MiddlewareHandler } from 'hono';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
};

// 管理者権限ミドルウェア（authMiddlewareの後に使用すること）
export const adminMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const { userId } = c.get('user');

  const user = await c.env.DB.prepare(
    'SELECT is_admin FROM users WHERE id = ?'
  ).bind(userId).first<{ is_admin: number }>();

  if (!user || user.is_admin !== 1) {
    return c.json({ error: '管理者権限が必要です' }, 403);
  }

  await next();
};
