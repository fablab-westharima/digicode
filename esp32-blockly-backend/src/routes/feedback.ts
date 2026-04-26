/**
 * 要望フォーム API (41.md Wave 3 新規 2 機能 A)
 *
 * POST /api/feedback — 課金ユーザー (Lite / Pro / Enterprise admin) 限定の要望投稿。
 * Enterprise student と Free user は backend で 403 を返す (frontend の widget 非表示と二重防御)。
 *
 * 関連:
 *   - prompt/maintenance/41_2026-04-27_要望フォーム計画_Wave3-新規2機能A.md §4.2
 *   - migrations/0023_create_feedback_table.sql
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { errorJson } from '../utils/errorJson';
import { getUserPlan } from '../utils/plan';
import type { Bindings } from '../index';

const feedback = new Hono<{ Bindings: Bindings }>();

const VALID_CATEGORIES = ['bug', 'feature', 'ui', 'block', 'docs', 'other'] as const;
type FeedbackCategory = (typeof VALID_CATEGORIES)[number];

const TITLE_MAX = 80;
const BODY_MAX = 2000;

interface PostFeedbackBody {
  category?: string;
  title?: string;
  body?: string;
}

// POST /api/feedback — 要望投稿
feedback.post('/', authMiddleware, async (c) => {
  try {
    const { userId } = c.get('user') as { userId: number; email: string };

    // 認可: account_type !== 'student' && plan ∈ {lite, pro, enterprise}
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
