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
import { proxyClassApi, type ClassApiEnv } from '../utils/classApi';
import type { PlanType } from '../utils/plan';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CLASS_API_URL: string;
  CLASS_API_SECRET: string;
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
  class_type: string;
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
    classType: row.class_type,
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
      classType?: string;
    }>();

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return c.json({ error: 'クラス名は必須です' }, 400);
    if (name.length > 100) return c.json({ error: 'クラス名は100文字以内にしてください' }, 400);

    const classType = body.classType === 'workshop' ? 'workshop' : 'classroom';

    // 種別に応じて有効期限を自動設定
    const now = new Date();
    if (classType === 'workshop') {
      now.setMonth(now.getMonth() + 1); // 1ヶ月
    } else {
      now.setMonth(now.getMonth() + 4); // 4ヶ月
    }
    const expiresAt = now.toISOString();

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
          `INSERT INTO classes (name, owner_id, invite_code, compile_server_target, class_type, expires_at)
           VALUES (?, ?, ?, 'cloud', ?, ?)
           RETURNING *`
        ).bind(name, userId, generateInviteCode(), classType, expiresAt)
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

    // Step 8: ML30 の assignments/assignment_submissions を先に削除
    // 失敗した場合は D1 側を触らず中断（孤児は残るが二次的被害なし、次回 cron で再挑戦）
    const ml30Result = await proxyClassApi(getClassApiEnv(c), {
      method: 'DELETE',
      path: `/assignments/by-class/${id}`,
      userId,
    });

    if (!ml30Result.ok && ml30Result.status !== 404) {
      console.error(`Delete class: ML30 cleanup failed for class#${id}:`, ml30Result.error);
      return c.json(
        { error: `クラス関連データの削除に失敗しました: ${ml30Result.error}` },
        ml30Result.status as any
      );
    }

    // D1 CASCADE で class_members も自動削除
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
  display_name: string | null;
  plain_password: string | null;
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
        `INSERT INTO users (email, password_hash, account_type, email_verified, display_name, plain_password)
         VALUES (?, ?, 'student', 1, ?, ?)
         RETURNING id`
      ).bind(loginId, passwordHash, name, password).first<{ id: number }>();

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
      `SELECT u.id AS user_id, u.email, u.display_name, u.plain_password, u.account_type, cm.role, cm.joined_at
       FROM class_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.class_id = ? AND cm.role = 'student'
       ORDER BY u.email`
    ).bind(classId).all<StudentRow>();

    const students = (rows.results || []).map((r) => ({
      userId: r.user_id,
      loginId: r.email,
      displayName: r.display_name,
      password: r.plain_password,
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
      `UPDATE users SET password_hash = ?, plain_password = ?, updated_at = datetime('now') WHERE id = ? AND account_type = 'student'`
    ).bind(newHash, newPassword, studentId).run();

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

// ============================================================
// Assignments proxy (ML30 digicode-class-server)
// ============================================================

function getClassApiEnv(c: any): ClassApiEnv {
  return {
    CLASS_API_URL: c.env.CLASS_API_URL,
    CLASS_API_SECRET: c.env.CLASS_API_SECRET,
  };
}

// GET /api/classes/:classId/assignments
classes.get('/:classId/assignments', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    if (isNaN(classId)) return c.json({ error: '無効なクラスIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/assignments?class_id=${classId}`,
      userId,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('List assignments error:', error);
    return c.json({ error: '課題一覧の取得に失敗しました' }, 500);
  }
});

// POST /api/classes/:classId/assignments
classes.post('/:classId/assignments', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    if (isNaN(classId)) return c.json({ error: '無効なクラスIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    const body = await c.req.json();

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'POST',
      path: '/assignments',
      userId,
      body: { ...body, classId },
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Create assignment error:', error);
    return c.json({ error: '課題の作成に失敗しました' }, 500);
  }
});

// GET /api/classes/:classId/assignments/:assignmentId
classes.get('/:classId/assignments/:assignmentId', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    const assignmentId = parseInt(c.req.param('assignmentId'));
    if (isNaN(classId) || isNaN(assignmentId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/assignments/${assignmentId}`,
      userId,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Get assignment error:', error);
    return c.json({ error: '課題の取得に失敗しました' }, 500);
  }
});

// GET /api/classes/:classId/assignments/:assignmentId/attachment
classes.get('/:classId/assignments/:assignmentId/attachment', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    const assignmentId = parseInt(c.req.param('assignmentId'));
    if (isNaN(classId) || isNaN(assignmentId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    // Attachment download: proxy raw response from ML30
    const env = getClassApiEnv(c);
    const url = new URL(`/assignments/${assignmentId}/attachment`, env.CLASS_API_URL).toString();

    const res = await fetch(url, {
      headers: {
        'X-Internal-Secret': env.CLASS_API_SECRET,
        'X-User-Id': String(userId),
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'ダウンロードに失敗しました' }));
      return c.json(data, res.status as any);
    }

    // Pass through the binary response
    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition': res.headers.get('Content-Disposition') || 'attachment',
        'Content-Length': res.headers.get('Content-Length') || '',
      },
    });
  } catch (error) {
    console.error('Download attachment error:', error);
    return c.json({ error: '添付ファイルのダウンロードに失敗しました' }, 500);
  }
});

// DELETE /api/classes/:classId/assignments/:assignmentId
classes.delete('/:classId/assignments/:assignmentId', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    const assignmentId = parseInt(c.req.param('assignmentId'));
    if (isNaN(classId) || isNaN(assignmentId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'DELETE',
      path: `/assignments/${assignmentId}`,
      userId,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Delete assignment error:', error);
    return c.json({ error: '課題の削除に失敗しました' }, 500);
  }
});

// POST /api/classes/:classId/assignments/:assignmentId/distribute
classes.post('/:classId/assignments/:assignmentId/distribute', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    const assignmentId = parseInt(c.req.param('assignmentId'));
    if (isNaN(classId) || isNaN(assignmentId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    // D1 から生徒一覧を取得（ML30 からは D1 にアクセスできないため Workers が渡す）
    const students = await c.env.DB.prepare(
      `SELECT user_id FROM class_members WHERE class_id = ? AND role = 'student'`
    ).bind(classId).all<{ user_id: number }>();

    const studentUserIds = (students.results || []).map((s) => s.user_id);

    if (studentUserIds.length === 0) {
      return c.json({ error: '配布対象の生徒がいません' }, 400);
    }

    // ML30 に student_user_ids をヘッダーで渡す
    const env = getClassApiEnv(c);
    const url = new URL(`/assignments/${assignmentId}/distribute`, env.CLASS_API_URL).toString();

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Internal-Secret': env.CLASS_API_SECRET,
        'X-User-Id': String(userId),
        'X-Student-User-Ids': JSON.stringify(studentUserIds),
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok) return c.json(data, res.status as any);
    return c.json(data);
  } catch (error) {
    console.error('Distribute assignment error:', error);
    return c.json({ error: '課題の配布に失敗しました' }, 500);
  }
});

// GET /api/classes/:classId/assignments/:assignmentId/submissions
// 課題別 submission 一覧（管理者用ダッシュボード）
// ML30 からの応答に D1 users の displayName/email をマージして返す
classes.get('/:classId/assignments/:assignmentId/submissions', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    const assignmentId = parseInt(c.req.param('assignmentId'));
    if (isNaN(classId) || isNaN(assignmentId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/by-assignment/${assignmentId}`,
      userId,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);

    // ML30 からの submissions に D1 users の情報（email, display_name）をマージ
    const body = apiResult.body as {
      submissions: Array<{ studentUserId: number; [k: string]: any }>;
    };

    if (body.submissions.length > 0) {
      const studentIds = [...new Set(body.submissions.map((s) => s.studentUserId))];
      const placeholders = studentIds.map(() => '?').join(',');
      const usersResult = await c.env.DB.prepare(
        `SELECT id, email, display_name FROM users WHERE id IN (${placeholders})`
      )
        .bind(...studentIds)
        .all<{ id: number; email: string; display_name: string | null }>();

      const userMap = new Map(
        (usersResult.results || []).map((u) => [u.id, u])
      );

      body.submissions = body.submissions.map((s) => {
        const u = userMap.get(s.studentUserId);
        return {
          ...s,
          studentEmail: u?.email || null,
          studentDisplayName: u?.display_name || null,
        };
      });
    }

    return c.json(body, 200);
  } catch (error) {
    console.error('List assignment submissions error:', error);
    return c.json({ error: '答案一覧の取得に失敗しました' }, 500);
  }
});

// PUT /api/classes/:classId/assignments/:assignmentId/submissions/:submissionId/grade
// 採点（管理者専用）
classes.put(
  '/:classId/assignments/:assignmentId/submissions/:submissionId/grade',
  async (c) => {
    try {
      const { userId } = c.get('user');
      const classId = parseInt(c.req.param('classId'));
      const submissionId = parseInt(c.req.param('submissionId'));
      if (isNaN(classId) || isNaN(submissionId)) {
        return c.json({ error: '無効なIDです' }, 400);
      }

      const result = await verifyClassOwner(c, classId, userId);
      if ('error' in result) return result.error;

      const body = await c.req.json<{
        score?: number | null;
        comment?: string | null;
      }>();

      const apiResult = await proxyClassApi(getClassApiEnv(c), {
        method: 'PUT',
        path: `/submissions/${submissionId}/grade`,
        userId,
        body,
      });

      if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
      return c.json(apiResult.body, apiResult.status);
    } catch (error) {
      console.error('Grade submission error:', error);
      return c.json({ error: '採点に失敗しました' }, 500);
    }
  }
);

// POST /api/classes/:classId/assignments/:assignmentId/submissions/:submissionId/return
// 差戻し（管理者専用）
classes.post(
  '/:classId/assignments/:assignmentId/submissions/:submissionId/return',
  async (c) => {
    try {
      const { userId } = c.get('user');
      const classId = parseInt(c.req.param('classId'));
      const submissionId = parseInt(c.req.param('submissionId'));
      if (isNaN(classId) || isNaN(submissionId)) {
        return c.json({ error: '無効なIDです' }, 400);
      }

      const result = await verifyClassOwner(c, classId, userId);
      if ('error' in result) return result.error;

      const apiResult = await proxyClassApi(getClassApiEnv(c), {
        method: 'POST',
        path: `/submissions/${submissionId}/return`,
        userId,
      });

      if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
      return c.json(apiResult.body, apiResult.status);
    } catch (error) {
      console.error('Return submission error:', error);
      return c.json({ error: '差戻しに失敗しました' }, 500);
    }
  }
);

// ============================================================
// T2: Class data export (ZIP download)
// ============================================================

// GET /api/classes/:classId/export
// クラスデータ(課題・答案・添付・採点結果)を ZIP で一括ダウンロード。
// 管理者(enterprise)専用、verifyClassOwner で認可。
// ML30 の /classes/:classId/export がアーカイブ生成を担当し、Workers は
// 以下のコンテキスト情報をヘッダーで渡した上で、binary ストリームを proxy する:
//   - X-Class-Name       : クラス名(URL エンコード、ファイル名・README に使用)
//   - X-Class-Type       : workshop / classroom
//   - X-Class-Expires-At : クラスの期限(ISO8601 or 空)
//   - X-Student-Info     : 生徒一覧 JSON [{userId, loginId, displayName, email}]
classes.get('/:classId/export', async (c) => {
  try {
    const { userId } = c.get('user');
    const classId = parseInt(c.req.param('classId'));
    if (isNaN(classId)) return c.json({ error: '無効なIDです' }, 400);

    const result = await verifyClassOwner(c, classId, userId);
    if ('error' in result) return result.error;

    // クラス情報を D1 から取得(クラス名・種別・期限)
    const cls = await c.env.DB.prepare(
      `SELECT id, name, class_type, expires_at FROM classes WHERE id = ?`
    )
      .bind(classId)
      .first<{
        id: number;
        name: string;
        class_type: string | null;
        expires_at: string | null;
      }>();

    if (!cls) return c.json({ error: 'クラスが見つかりません' }, 404);

    // 生徒一覧を D1 から取得(email と display_name を含める)
    const studentsResult = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.display_name
       FROM class_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.class_id = ? AND cm.role = 'student'
       ORDER BY u.id`
    )
      .bind(classId)
      .all<{ id: number; email: string; display_name: string | null }>();

    // 生徒情報を ML30 に渡す形式に整形
    // loginId は email の "@" 前部分(DigiCode の student アカウントは
    // "loginId@example.com" 形式で作られる)
    const students = (studentsResult.results || []).map((u) => ({
      userId: u.id,
      loginId: u.email.includes('@') ? u.email.split('@')[0] : u.email,
      displayName: u.display_name,
      email: u.email,
    }));

    // ML30 /classes/:classId/export にプロキシ
    const env = getClassApiEnv(c);
    const url = new URL(
      `/classes/${classId}/export`,
      env.CLASS_API_URL
    ).toString();

    const res = await fetch(url, {
      headers: {
        'X-Internal-Secret': env.CLASS_API_SECRET,
        'X-User-Id': String(userId),
        'X-Class-Name': encodeURIComponent(cls.name),
        'X-Class-Type': cls.class_type || '',
        'X-Class-Expires-At': cls.expires_at || '',
        'X-Student-Info': JSON.stringify(students),
      },
    });

    if (!res.ok) {
      const data = await res
        .json()
        .catch(() => ({ error: 'エクスポートに失敗しました' }));
      return c.json(data, res.status as any);
    }

    // Binary stream pass-through
    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/zip',
        'Content-Disposition':
          res.headers.get('Content-Disposition') ||
          `attachment; filename="class_${classId}_export.zip"`,
      },
    });
  } catch (error) {
    console.error('Export class error:', error);
    return c.json({ error: 'エクスポートに失敗しました' }, 500);
  }
});

// ============================================================
// Step 8: Scheduled cleanup (Cron Trigger から呼ばれる共通ロジック)
// ============================================================

/**
 * 単一クラスのカスケード削除（ML30 → D1 classes → 孤児 student）
 * Workers の scheduled handler と DELETE /api/classes/:id の両方から呼ばれる
 * 認可チェックは呼び出し元で実施済みの前提
 */
export async function deleteClassCascade(
  env: {
    DB: D1Database;
    CLASS_API_URL: string;
    CLASS_API_SECRET: string;
  },
  classId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  // 削除前に所属 student を取得
  const students = await env.DB.prepare(
    `SELECT user_id FROM class_members WHERE class_id = ? AND role = 'student'`
  )
    .bind(classId)
    .all<{ user_id: number }>();

  // ML30 の assignments/assignment_submissions を先に削除
  const ml30Env: ClassApiEnv = {
    CLASS_API_URL: env.CLASS_API_URL,
    CLASS_API_SECRET: env.CLASS_API_SECRET,
  };
  const ml30Result = await proxyClassApi(ml30Env, {
    method: 'DELETE',
    path: `/assignments/by-class/${classId}`,
    userId: 0, // scheduled からの呼び出しでは userId はシステム固定値
  });

  if (!ml30Result.ok && ml30Result.status !== 404) {
    return { ok: false, error: `ML30 cleanup failed: ${ml30Result.error}` };
  }

  // D1 classes を削除（CASCADE で class_members も削除）
  await env.DB.prepare(`DELETE FROM classes WHERE id = ?`).bind(classId).run();

  // 孤児 student を連動削除（使い捨てアカウント方針）
  for (const s of students.results || []) {
    const other = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM class_members WHERE user_id = ?`
    )
      .bind(s.user_id)
      .first<{ n: number }>();
    if (!other || other.n === 0) {
      await env.DB.prepare(
        `DELETE FROM users WHERE id = ? AND account_type = 'student'`
      )
        .bind(s.user_id)
        .run();
    }
  }

  return { ok: true };
}

export default classes;
