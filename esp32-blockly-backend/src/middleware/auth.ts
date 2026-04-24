import type { MiddlewareHandler } from 'hono';
import { verifyToken } from '../utils/jwt';
import { errorJson } from '../utils/errorJson';

type Bindings = {
  JWT_SECRET: string;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
};

// 認証ミドルウェア
export const authMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return errorJson(c, 'auth.required', 401);
  }

  // Bearer トークン形式チェック
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return errorJson(c, 'auth.invalidAuthFormat', 401);
  }

  const token = parts[1];
  const secret = c.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET is not configured');
    return errorJson(c, 'common.serverConfigError', 500);
  }

  // トークン検証
  const payload = await verifyToken(token, secret);

  if (!payload) {
    return errorJson(c, 'auth.tokenInvalidOrExpired', 401);
  }

  // ユーザー情報をコンテキストにセット
  c.set('user', {
    userId: payload.userId,
    email: payload.email,
  });

  await next();
};
