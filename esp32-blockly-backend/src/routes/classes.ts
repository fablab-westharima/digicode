/**
 * /api/classes routes — enterprise class management.
 *
 * Step 2 redesign (2026-04-12):
 *   classes and class_members are now stored in D1 (not ML30) because they
 *   are lightweight metadata. This file operates on D1 directly, following
 *   the same patterns as projects.ts.
 *
 *   ML30 (digicode-class-server) is only used for assignments and
 *   assignment_submissions which contain large Blockly XML data.
 *
 * Design principle:
 *   "D1 = 基幹データ、ML30 = 大きいファイルの逃がし先"
 *   ML30 ダウン時もクラス一覧・メンバー管理は動き続ける。
 *
 * Related:
 *   - prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md
 *     section "DB 配置原則"
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePlan } from '../middleware/plan';
import type { PlanType } from '../utils/plan';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
  userPlan: PlanType;
};

const classes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

classes.use('*', authMiddleware);
classes.use('*', requirePlan('enterprise'));

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

type ClassRow = {
  id: number;
  name: string;
  owner_id: number;
  invite_code: string;
  compile_server_target: string;
  expires_at: string | null;
  status: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToCamel(row: ClassRow) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    inviteCode: row.invite_code,
    compileServerTarget: row.compile_server_target,
    expiresAt: row.expires_at,
    status: row.status,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/classes
classes.get('/', async (c) => {
  try {
    const { userId } = c.get('user');

    const result = await c.env.DB.prepare(
      `SELECT * FROM classes WHERE owner_id = ? ORDER BY created_at DESC`
    ).bind(userId).all<ClassRow>();

    return c.json({ classes: (result.results || []).map(rowToCamel) });
  } catch (error) {
    console.error('List classes error:', error);
    return c.json({ error: 'クラス一覧の取得に失敗しました' }, 500);
  }
});

// POST /api/classes
classes.post('/', async (c) => {
  try {
    const { userId } = c.get('user');

    const body = await c.req.json<{
      name?: string;
      compileServerTarget?: string;
      expiresAt?: string;
    }>();

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return c.json({ error: 'クラス名は必須です' }, 400);
    if (name.length > 100) return c.json({ error: 'クラス名は100文字以内にしてください' }, 400);

    const compileServerTarget = body.compileServerTarget === 'local' ? 'local' : 'cloud';
    const expiresAt = typeof body.expiresAt === 'string' && body.expiresAt ? body.expiresAt : null;

    // 3 クラス上限チェック
    const count = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM classes WHERE owner_id = ? AND status = 'active'`
    ).bind(userId).first<{ n: number }>();

    if (count && count.n >= 3) {
      return c.json({ error: '同時に開講できるクラスは3つまでです' }, 409);
    }

    // invite_code 生成（衝突時 1 回リトライ）
    let created: ClassRow | null = null;
    for (let attempt = 0; attempt < 2 && !created; attempt++) {
      try {
        created = await c.env.DB.prepare(
          `INSERT INTO classes (name, owner_id, invite_code, compile_server_target, expires_at)
           VALUES (?, ?, ?, ?, ?)
           RETURNING *`
        ).bind(name, userId, generateInviteCode(), compileServerTarget, expiresAt)
          .first<ClassRow>();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === 0 && msg.includes('UNIQUE') && msg.includes('invite_code')) {
          continue;
        }
        throw err;
      }
    }

    if (!created) {
      return c.json({ error: '招待コードの生成に失敗しました' }, 500);
    }

    // owner を class_members に自動追加
    await c.env.DB.prepare(
      `INSERT OR IGNORE INTO class_members (class_id, user_id, role) VALUES (?, ?, 'owner')`
    ).bind(created.id, userId).run();

    return c.json({ class: rowToCamel(created) }, 201);
  } catch (error) {
    console.error('Create class error:', error);
    return c.json({ error: 'クラスの作成に失敗しました' }, 500);
  }
});

// GET /api/classes/:id
classes.get('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: '無効なIDです' }, 400);

    const row = await c.env.DB.prepare(
      `SELECT * FROM classes WHERE id = ?`
    ).bind(id).first<ClassRow>();

    if (!row) return c.json({ error: 'クラスが見つかりません' }, 404);
    if (row.owner_id !== userId) return c.json({ error: '権限がありません' }, 403);

    return c.json({ class: rowToCamel(row) });
  } catch (error) {
    console.error('Get class error:', error);
    return c.json({ error: 'クラスの取得に失敗しました' }, 500);
  }
});

// DELETE /api/classes/:id
classes.delete('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: '無効なIDです' }, 400);

    const row = await c.env.DB.prepare(
      `SELECT owner_id FROM classes WHERE id = ?`
    ).bind(id).first<{ owner_id: number }>();

    if (!row) return c.json({ error: 'クラスが見つかりません' }, 404);
    if (row.owner_id !== userId) return c.json({ error: '権限がありません' }, 403);

    // D1 CASCADE will auto-delete class_members.
    // TODO (Step 6-7): also delete assignments/submissions on ML30 via proxyClassApi
    await c.env.DB.prepare(`DELETE FROM classes WHERE id = ?`).bind(id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete class error:', error);
    return c.json({ error: 'クラスの削除に失敗しました' }, 500);
  }
});

export default classes;
