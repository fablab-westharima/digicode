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
import { hashPassword } from '../utils/password';
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

    // 削除前に所属 student を取得（CASCADE 後は取得できない）
    const students = await c.env.DB.prepare(
      `SELECT user_id FROM class_members WHERE class_id = ? AND role = 'student'`
    ).bind(id).all<{ user_id: number }>();

    // D1 CASCADE will auto-delete class_members.
    // TODO (Step 6-7): also delete assignments/submissions on ML30 via proxyClassApi
    await c.env.DB.prepare(`DELETE FROM classes WHERE id = ?`).bind(id).run();

    // 他クラスにも未所属の student users を連動削除（使い捨てアカウント方針）
    for (const s of students.results || []) {
      const other = await c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM class_members WHERE user_id = ?`
      ).bind(s.user_id).first<{ n: number }>();
      if (!other || other.n === 0) {
        await c.env.DB.prepare(
          `DELETE FROM users WHERE id = ? AND account_type = 'student'`
        ).bind(s.user_id).run();
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete class error:', error);
    return c.json({ error: 'クラスの削除に失敗しました' }, 500);
  }
});

// ============================================================
// Student management (Phase C Step 2)
// ============================================================

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// Verify that the caller owns the specified class. Returns the class row or an error response.
async function verifyClassOwner(c: any, classId: number, userId: number) {
  const cls = await c.env.DB.prepare(
    `SELECT owner_id, invite_code FROM classes WHERE id = ?`
  ).bind(classId).first<{ owner_id: number; invite_code: string }>();

  if (!cls) return { error: c.json({ error: 'クラスが見つかりません' }, 404) };
  if (cls.owner_id !== userId) return { error: c.json({ error: '権限がありません' }, 403) };
  return { cls };
}

type StudentRow = {
  user_id: number;
  email: string;
  account_type: string;
  role: string;
  joined_at: string;
};

// POST /api/classes/:classId/students — bulk create student accounts
classes.post('/:classId/students', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    if (isNaN(classId)) return c.json({ error: '無効なクラスIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;
    const { cls } = result;

    const body = await c.req.json<{ students?: { name: string }[] }>();
    const names = body.students;
    if (!Array.isArray(names) || names.length === 0) {
      return c.json({ error: '生徒名のリストが必要です' }, 400);
    }
    if (names.length > 40) {
      return c.json({ error: '1回の作成は40名までです' }, 400);
    }

    // 40人/クラス上限チェック
    const memberCount = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM class_members WHERE class_id = ? AND role = 'student'`
    ).bind(classId).first<{ n: number }>();
    const currentStudents = memberCount?.n ?? 0;
    if (currentStudents + names.length > 40) {
      return c.json({
        error: `1クラスの生徒上限は40名です（現在${currentStudents}名）`,
      }, 409);
    }

    // 既存の連番最大値を取得（invite_code-NN パターン）
    const maxSeq = await c.env.DB.prepare(
      `SELECT email FROM users
       WHERE email LIKE ? AND account_type = 'student'
       ORDER BY email DESC LIMIT 1`
    ).bind(`${cls.invite_code}-%`).first<{ email: string }>();

    let nextSeq = 1;
    if (maxSeq) {
      const parts = maxSeq.email.split('-');
      const last = parseInt(parts[parts.length - 1]);
      if (!isNaN(last)) nextSeq = last + 1;
    }

    const created: { name: string; loginId: string; password: string }[] = [];

    for (const entry of names) {
      const name = typeof entry.name === 'string' ? entry.name.trim() : '';
      if (!name) continue;

      const loginId = `${cls.invite_code}-${String(nextSeq).padStart(2, '0')}`;
      const password = generatePassword();
      const passwordHash = await hashPassword(password);

      // users テーブルに INSERT（email_verified=1: 管理者代理作成のため確認不要）
      const user = await c.env.DB.prepare(
        `INSERT INTO users (email, password_hash, account_type, email_verified)
         VALUES (?, ?, 'student', 1)
         RETURNING id`
      ).bind(loginId, passwordHash).first<{ id: number }>();

      if (!user) continue;

      // 3クラス上限チェック（生徒側）
      const studentClassCount = await c.env.DB.prepare(
        `SELECT COUNT(*) AS n FROM class_members WHERE user_id = ? AND role = 'student'`
      ).bind(user.id).first<{ n: number }>();

      if (studentClassCount && studentClassCount.n >= 3) {
        // 超えた場合は作成した user を削除してスキップ
        await c.env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(user.id).run();
        continue;
      }

      // class_members に追加
      await c.env.DB.prepare(
        `INSERT INTO class_members (class_id, user_id, role) VALUES (?, ?, 'student')`
      ).bind(classId, user.id).run();

      created.push({ name, loginId, password });
      nextSeq++;
    }

    return c.json({ students: created, count: created.length }, 201);
  } catch (error) {
    console.error('Create students error:', error);
    return c.json({ error: '生徒アカウントの作成に失敗しました' }, 500);
  }
});

// GET /api/classes/:classId/students — list students in a class
classes.get('/:classId/students', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    if (isNaN(classId)) return c.json({ error: '無効なクラスIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    const rows = await c.env.DB.prepare(
      `SELECT u.id AS user_id, u.email, u.account_type, cm.role, cm.joined_at
       FROM class_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.class_id = ? AND cm.role = 'student'
       ORDER BY u.email`
    ).bind(classId).all<StudentRow>();

    const students = (rows.results || []).map((r) => ({
      userId: r.user_id,
      loginId: r.email,
      accountType: r.account_type,
      role: r.role,
      joinedAt: r.joined_at,
    }));

    return c.json({ students });
  } catch (error) {
    console.error('List students error:', error);
    return c.json({ error: '生徒一覧の取得に失敗しました' }, 500);
  }
});

// DELETE /api/classes/:classId/students/:studentId — remove a student
classes.delete('/:classId/students/:studentId', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    const studentId = parseInt(c.req.param('studentId'));
    if (isNaN(classId) || isNaN(studentId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    // class_members から削除
    await c.env.DB.prepare(
      `DELETE FROM class_members WHERE class_id = ? AND user_id = ? AND role = 'student'`
    ).bind(classId, studentId).run();

    // 他のクラスにも所属していなければ user ごと削除（使い捨てアカウント）
    const otherMemberships = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM class_members WHERE user_id = ?`
    ).bind(studentId).first<{ n: number }>();

    if (!otherMemberships || otherMemberships.n === 0) {
      await c.env.DB.prepare(
        `DELETE FROM users WHERE id = ? AND account_type = 'student'`
      ).bind(studentId).run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete student error:', error);
    return c.json({ error: '生徒の削除に失敗しました' }, 500);
  }
});

// POST /api/classes/:classId/students/:studentId/reset-password
classes.post('/:classId/students/:studentId/reset-password', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    const studentId = parseInt(c.req.param('studentId'));
    if (isNaN(classId) || isNaN(studentId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    // student がこのクラスに所属していることを確認
    const member = await c.env.DB.prepare(
      `SELECT user_id FROM class_members WHERE class_id = ? AND user_id = ? AND role = 'student'`
    ).bind(classId, studentId).first();

    if (!member) return c.json({ error: 'この生徒はこのクラスに所属していません' }, 404);

    const newPassword = generatePassword();
    const newHash = await hashPassword(newPassword);

    await c.env.DB.prepare(
      `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ? AND account_type = 'student'`
    ).bind(newHash, studentId).run();

    // student の loginId を取得して返す
    const student = await c.env.DB.prepare(
      `SELECT email FROM users WHERE id = ?`
    ).bind(studentId).first<{ email: string }>();

    return c.json({
      loginId: student?.email,
      password: newPassword,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ error: 'パスワードリセットに失敗しました' }, 500);
  }
});

export default classes;
