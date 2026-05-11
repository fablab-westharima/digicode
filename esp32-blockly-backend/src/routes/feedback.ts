/**
 * 要望フォーム API (41.md Wave 3 新規 2 機能 A)
 *
 * POST /api/feedback — 2 段認可:
 *   - 通常時: 課金ユーザー (Lite / Pro / Enterprise admin) 限定。
 *     Enterprise student と Free user は backend で 403 を返す
 *     (frontend の widget 非表示と二重防御)。
 *   - プレリリース期間中 (`pin_assign_pro` flag が isFreeNow=true):
 *     未ログイン送信を許可、認証 user は plan gate skip。
 *     anonymous row は user_id=NULL、admin-feedback の LEFT JOIN users で
 *     email/plan は NULL fallback (admin-feedback.ts L77/82)。
 *
 * 第103回 Task 1 (2026-05-12): プレリリース期間中の未ログイン送信を許可
 *   (memory:feedback_form_design は不変、callsite OR layer で局所緩和)。
 *   migration 0025 で feedback.user_id を NULL 許可。
 *
 * 関連:
 *   - prompt/maintenance/41_2026-04-27_要望フォーム計画_Wave3-新規2機能A.md §4.2
 *   - migrations/0023_create_feedback_table.sql
 *   - migrations/0025_allow_nullable_feedback_user_id.sql
 */
import { Hono } from 'hono';
import { verifyToken } from '../utils/jwt';
import { errorJson } from '../utils/errorJson';
import { getUserPlan } from '../utils/plan';
import { isFlagFreeNow } from '../utils/featureFlag';
import type { Bindings } from '../types/env';

const feedback = new Hono<{ Bindings: Bindings }>();

const VALID_CATEGORIES = ['bug', 'feature', 'ui', 'block', 'docs', 'other'] as const;
type FeedbackCategory = (typeof VALID_CATEGORIES)[number];

const TITLE_MAX = 80;
const BODY_MAX = 2000;
const PRERELEASE_FLAG_KEY = 'pin_assign_pro';

interface PostFeedbackBody {
  category?: string;
  title?: string;
  body?: string;
}

/**
 * Optional Bearer-token auth: extract userId if a valid JWT is present.
 * Returns null on missing header / malformed format / expired or invalid token.
 * Used by 2-stage feedback authz; never throws.
 */
async function tryGetUserId(authHeader: string | undefined, secret: string | undefined): Promise<number | null> {
  if (!authHeader || !secret) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  const payload = await verifyToken(parts[1], secret);
  return payload?.userId ?? null;
}

// POST /api/feedback — 要望投稿
feedback.post('/', async (c) => {
  try {
    const isPrerelease = await isFlagFreeNow(c.env.DB, PRERELEASE_FLAG_KEY);
    const authHeader = c.req.header('Authorization');
    const userId = await tryGetUserId(authHeader, c.env.JWT_SECRET);

    if (!isPrerelease) {
      // 通常認可: 認証 + plan gate
      if (userId === null) {
        return errorJson(c, 'auth.required', 401);
      }
      const accountRow = await c.env.DB
        .prepare('SELECT account_type FROM users WHERE id = ?')
        .bind(userId)
        .first<{ account_type: string | null }>();
      if (accountRow?.account_type === 'student') {
        return errorJson(c, 'feedback.unauthorized', 403);
      }
      const plan = await getUserPlan(c.env.DB, userId);
      if (plan === 'free') {
        return errorJson(c, 'feedback.unauthorized', 403);
      }
    }
    // プレリリース期間中は userId=null も許可、plan gate も skip

    // request body parse + validation
    const input = (await c.req.json().catch(() => null)) as PostFeedbackBody | null;
    if (!input) {
      return errorJson(c, 'feedback.invalidCategory', 400);
    }

    const category = input.category;
    if (!category || !VALID_CATEGORIES.includes(category as FeedbackCategory)) {
      return errorJson(c, 'feedback.invalidCategory', 400);
    }

    const title = (input.title ?? '').trim();
    if (title.length === 0) {
      return errorJson(c, 'feedback.titleEmpty', 400);
    }
    if (title.length > TITLE_MAX) {
      return errorJson(c, 'feedback.titleTooLong', 400);
    }

    const body = (input.body ?? '').trim();
    if (body.length === 0) {
      return errorJson(c, 'feedback.bodyEmpty', 400);
    }
    if (body.length > BODY_MAX) {
      return errorJson(c, 'feedback.bodyTooLong', 400);
    }

    // 自動付与: locale (middleware) / app_version (X-App-Version header) / user_agent
    // (anonymous でも継続、debug 補助、PII リスクなし、D-3 (a))
    const locale = (c.get('locale' as never) as string | undefined) ?? null;
    const appVersion = c.req.header('X-App-Version') ?? null;
    const userAgent = c.req.header('User-Agent') ?? null;

    const result = await c.env.DB.prepare(`
      INSERT INTO feedback (user_id, category, title, body, locale, app_version, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id, created_at
    `).bind(userId, category, title, body, locale, appVersion, userAgent)
      .first<{ id: number; created_at: string }>();

    if (!result) {
      return errorJson(c, 'common.serverConfigError', 500);
    }

    return c.json({ id: result.id, createdAt: result.created_at }, 201);
  } catch (error) {
    console.error('Feedback create error:', error);
    return errorJson(c, 'common.serverConfigError', 500);
  }
});

export default feedback;
