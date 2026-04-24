import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { errorMessages, getMessage, type ErrorKey, type Locale } from '../i18n/messages';

/**
 * 多言語対応の error response helper.
 *
 * `c.set('locale', ...)` (locale middleware) で注入された locale を参照し、
 * errorMessages の resource map から訳文を解決して JSON レスポンスを返す。
 *
 * 使用例:
 *   return errorJson(c, 'auth.required', 401);
 *   return errorJson(c, 'class.nameTooLong', 400);
 *   return errorJson(c, 'subscription.noStripeCustomer', 400, { extras: { needsCheckout: true } });
 *
 * - `error` フィールド = ローカライズ済の訳文（既存 frontend の data.error 直表示と互換）
 * - `errorCode` フィールド = key 名（frontend での systematic 判定に使える）
 * - `extras` で他フィールド (details / hint 等) を追加可能
 *
 * 設計理由 (memory util_i18n_labels_injection の逆パターン):
 *   util 関数の i18n 化は呼出側 (React component) から labels を注入する正パターン
 *   その逆で、middleware で context に locale を inject し、helper で resource map を引く
 */
export function errorJson(
  c: Context,
  key: ErrorKey,
  status: ContentfulStatusCode,
  extras?: Record<string, unknown>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- c.get('locale') は middleware が必ず set するため non-null だが Variables 型推論なしで参照
  const locale = ((c as any).get?.('locale') as Locale) ?? 'ja';
  const message = getMessage(locale, key);
  return c.json({ error: message, errorCode: key, ...extras }, status);
}

// ErrorKey を再 export（呼出側の type-import を簡潔化）
export type { ErrorKey };

// errorMessages を re-export（test 用途で便利、circular import 回避のため直接 export）
export { errorMessages };
