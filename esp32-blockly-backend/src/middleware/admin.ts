import type { MiddlewareHandler } from 'hono';
import { errorJson } from '../utils/errorJson';
import type { Bindings, Variables } from '../types/env';

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
    return errorJson(c, 'auth.adminRequired', 403);
  }

  await next();
};
