import type { MiddlewareHandler } from 'hono';
import { resolveLocale } from '../i18n/messages';
import type { Variables } from '../types/env';

/**
 * Locale middleware: parse Accept-Language header → c.set('locale', ...)
 *
 * 設置位置: CORS 直後、認証/レート制限より前。全ルートで利用可能にする。
 *
 * 優先順位:
 * 1. Accept-Language header (frontend が i18n.language 連動で送信)
 * 2. なければ DEFAULT_LOCALE 'ja'
 */
export const localeMiddleware: MiddlewareHandler<{
  Variables: Variables;
}> = async (c, next) => {
  const accept = c.req.header('Accept-Language');
  const locale = resolveLocale(accept);
  c.set('locale', locale);
  await next();
};
