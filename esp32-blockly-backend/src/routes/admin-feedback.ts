/**
 * 管理者向け要望フォーム API (41.md Wave 3 新規 2 機能 A)
 *
 * - GET    /api/admin/feedback           リスト (filter + pagination)
 * - GET    /api/admin/feedback/export    CSV エクスポート (全件、UTF-8 BOM 付き)
 * - GET    /api/admin/feedback/:id       詳細
 * - PATCH  /api/admin/feedback/:id       status / admin_note 更新
 *
 * 認可: authMiddleware + adminMiddleware (users.is_admin = 1)
 *
 * 関連:
 *   - prompt/maintenance/41_2026-04-27_要望フォーム計画_Wave3-新規2機能A.md §4
 *   - migrations/0023_create_feedback_table.sql
 */
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { errorJson } from '../utils/errorJson';
import type { Bindings } from '../index';

const adminFeedback = new Hono<{ Bindings: Bindings }>();

const VALID_CATEGORIES = ['bug', 'feature', 'ui', 'block', 'docs', 'other'] as const;
const VALID_STATUSES = ['new', 'triaged', 'planned', 'closed'] as const;
type FeedbackStatus = (typeof VALID_STATUSES)[number];

const ALLOWED_SORTS = {
  created_desc: 'f.created_at DESC',
  created_asc: 'f.created_at ASC',
  status: 'f.status ASC, f.created_at DESC',
} as const;
type SortKey = keyof typeof ALLOWED_SORTS;

interface FeedbackRow {
  id: number;
  user_id: number;
  user_email: string | null;
  user_plan: string | null;
  category: string;
  title: string;
  body: string;
  status: string;
  admin_note: string | null;
  locale: string | null;
  app_version: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

function rowToCamel(r: FeedbackRow) {
  return {
    id: r.id,
    userId: r.user_id,
    userEmail: r.user_email,
    userPlan: r.user_plan,
    category: r.category,
    title: r.title,
    body: r.body,
    status: r.status,
    adminNote: r.admin_note,
    locale: r.locale,
    appVersion: r.app_version,
    userAgent: r.user_agent,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─────────────────────────────────────────
// GET /api/admin/feedback/export — CSV
// 注意: /:id より前に登録 (Hono は登録順マッチ)
// ─────────────────────────────────────────
adminFeedback.get('/export', authMiddleware, adminMiddleware, async (c) => {
  try {
    const rows = await c.env.DB.prepare(`
      SELECT f.id, f.user_id, u.email AS user_email, u.plan AS user_plan,
             f.category, f.title, f.body, f.status, f.admin_note,
             f.locale, f.app_version, f.user_agent,
             f.created_at, f.updated_at
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
    `).all<FeedbackRow>();

    const items = rows.results ?? [];
    const csv = buildCsv(items);

    // UTF-8 BOM (Excel 互換) + filename: feedback_YYYYMMDD.csv
    const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return new Response('﻿' + csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="feedback_${yyyymmdd}.csv"`,
      },
    });
  } catch (error) {
    console.error('Feedback CSV export error:', error);
    return errorJson(c, 'common.serverConfigError', 500);
  }
});

// ─────────────────────────────────────────
// GET /api/admin/feedback — リスト
// ─────────────────────────────────────────
adminFeedback.get('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const status = c.req.query('status');
    const category = c.req.query('category');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const sortParam = c.req.query('sort') || 'created_desc';
    const orderBy = ALLOWED_SORTS[sortParam as SortKey] ?? ALLOWED_SORTS.created_desc;

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      whereClause += ' AND f.status = ?';
      params.push(status);
    }
    if (category && (VALID_CATEGORIES as readonly string[]).includes(category)) {
      whereClause += ' AND f.category = ?';
      params.push(category);
    }

    const countRow = await c.env.DB
      .prepare(`SELECT COUNT(*) AS c FROM feedback f WHERE ${whereClause}`)
      .bind(...params)
      .first<{ c: number }>();
    const total = countRow?.c ?? 0;

    const rows = await c.env.DB
      .prepare(`
        SELECT f.id, f.user_id, u.email AS user_email, u.plan AS user_plan,
               f.category, f.title, f.body, f.status, f.admin_note,
               f.locale, f.app_version, f.user_agent,
               f.created_at, f.updated_at
        FROM feedback f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `)
      .bind(...params, limit, offset)
      .all<FeedbackRow>();

    return c.json({
      items: (rows.results ?? []).map(rowToCamel),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Feedback list error:', error);
    return errorJson(c, 'common.serverConfigError', 500);
  }
});

// ─────────────────────────────────────────
// GET /api/admin/feedback/:id — 詳細
// ─────────────────────────────────────────
adminFeedback.get('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (!Number.isFinite(id) || id <= 0) {
      return errorJson(c, 'feedback.notFound', 404);
    }

    const row = await c.env.DB.prepare(`
      SELECT f.id, f.user_id, u.email AS user_email, u.plan AS user_plan,
             f.category, f.title, f.body, f.status, f.admin_note,
             f.locale, f.app_version, f.user_agent,
             f.created_at, f.updated_at
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `).bind(id).first<FeedbackRow>();

    if (!row) return errorJson(c, 'feedback.notFound', 404);
    return c.json(rowToCamel(row));
  } catch (error) {
    console.error('Feedback detail error:', error);
    return errorJson(c, 'common.serverConfigError', 500);
  }
});

// ─────────────────────────────────────────
// PATCH /api/admin/feedback/:id — status / admin_note 更新
// ─────────────────────────────────────────
interface PatchBody {
  status?: string;
  adminNote?: string | null;
}

adminFeedback.patch('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'), 10);
    if (!Number.isFinite(id) || id <= 0) {
      return errorJson(c, 'feedback.notFound', 404);
    }

    const body = (await c.req.json().catch(() => null)) as PatchBody | null;
    if (!body) return errorJson(c, 'validation.noFieldsToUpdate', 400);

    const updates: string[] = [];
    const params: unknown[] = [];

    if (body.status !== undefined) {
      if (!(VALID_STATUSES as readonly string[]).includes(body.status)) {
        return errorJson(c, 'feedback.invalidStatus', 400);
      }
      updates.push('status = ?');
      params.push(body.status as FeedbackStatus);
    }

    if (body.adminNote !== undefined) {
      updates.push('admin_note = ?');
      params.push(body.adminNote ?? null);
    }

    if (updates.length === 0) {
      return errorJson(c, 'validation.noFieldsToUpdate', 400);
    }

    // 存在確認
    const existing = await c.env.DB
      .prepare('SELECT id FROM feedback WHERE id = ?')
      .bind(id)
      .first<{ id: number }>();
    if (!existing) return errorJson(c, 'feedback.notFound', 404);

    // updated_at は trigger で自動更新
    await c.env.DB
      .prepare(`UPDATE feedback SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params, id)
      .run();

    const updated = await c.env.DB.prepare(`
      SELECT f.id, f.user_id, u.email AS user_email, u.plan AS user_plan,
             f.category, f.title, f.body, f.status, f.admin_note,
             f.locale, f.app_version, f.user_agent,
             f.created_at, f.updated_at
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = ?
    `).bind(id).first<FeedbackRow>();

    if (!updated) return errorJson(c, 'feedback.notFound', 404);
    return c.json(rowToCamel(updated));
  } catch (error) {
    console.error('Feedback patch error:', error);
    return errorJson(c, 'common.serverConfigError', 500);
  }
});

// CSV builder: RFC 4180 ベース、" を "" にエスケープ、, または改行を含むなら quote
function buildCsv(rows: FeedbackRow[]): string {
  const headers = [
    'id', 'created_at', 'updated_at',
    'user_id', 'user_email', 'user_plan',
    'category', 'title', 'body',
    'status', 'admin_note',
    'locale', 'app_version', 'user_agent',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([
      r.id,
      r.created_at,
      r.updated_at,
      r.user_id,
      r.user_email ?? '',
      r.user_plan ?? '',
      r.category,
      r.title,
      r.body,
      r.status,
      r.admin_note ?? '',
      r.locale ?? '',
      r.app_version ?? '',
      r.user_agent ?? '',
    ].map(csvEscape).join(','));
  }
  return lines.join('\n');
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default adminFeedback;
