/**
 * /api/submissions routes — student submission access.
 *
 * This is a SEPARATE route file from classes.ts because:
 * - classes.ts has requirePlan('enterprise') on ALL routes
 * - Students don't have enterprise plan
 * - Students need to access their own submissions
 *
 * Auth: authMiddleware only (no plan requirement).
 * Authorization: enforced per-route (student = own submissions, owner = class submissions).
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { proxyClassApi, type ClassApiEnv } from '../utils/classApi';

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
};

const submissions = new Hono<{ Bindings: Bindings; Variables: Variables }>();

submissions.use('*', authMiddleware);

function getClassApiEnv(c: any): ClassApiEnv {
  return {
    CLASS_API_URL: c.env.CLASS_API_URL,
    CLASS_API_SECRET: c.env.CLASS_API_SECRET,
  };
}

// GET /api/submissions/my — 生徒自身の submission 一覧
submissions.get('/my', async (c) => {
  try {
    const { userId } = c.get('user');

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions?student_user_id=${userId}`,
      userId,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('List my submissions error:', error);
    return c.json({ error: '答案一覧の取得に失敗しました' }, 500);
  }
});

// GET /api/submissions/:id — submission 詳細
submissions.get('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: '無効なIDです' }, 400);

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/${id}`,
      userId,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);

    // 認可: 生徒は自分の submission のみ、enterprise owner は自クラスの submission
    const body = apiResult.body as { submission: { studentUserId: number; classId: number } };
    const sub = body.submission;

    if (sub.studentUserId !== userId) {
      const cls = await c.env.DB.prepare(
        `SELECT owner_id FROM classes WHERE id = ?`
      ).bind(sub.classId).first<{ owner_id: number }>();

      if (!cls || cls.owner_id !== userId) {
        return c.json({ error: '権限がありません' }, 403);
      }
    }

    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Get submission error:', error);
    return c.json({ error: '答案の取得に失敗しました' }, 500);
  }
});

// PUT /api/submissions/:id — 答案保存
submissions.put('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: '無効なIDです' }, 400);

    // 自分の submission かチェック
    const check = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/${id}`,
      userId,
    });

    if (!check.ok) return c.json({ error: (check as any).error || '答案が見つかりません' }, check.status);

    const sub = (check.body as { submission: { studentUserId: number } }).submission;
    if (sub.studentUserId !== userId) {
      return c.json({ error: '権限がありません' }, 403);
    }

    const body = await c.req.json();

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'PUT',
      path: `/submissions/${id}`,
      userId,
      body,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Save submission error:', error);
    return c.json({ error: '答案の保存に失敗しました' }, 500);
  }
});

// POST /api/submissions/:id/submit — 提出
submissions.post('/:id/submit', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: '無効なIDです' }, 400);

    // 自分の submission かチェック
    const check = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/${id}`,
      userId,
    });

    if (!check.ok) return c.json({ error: (check as any).error || '答案が見つかりません' }, check.status);

    const sub = (check.body as { submission: { studentUserId: number } }).submission;
    if (sub.studentUserId !== userId) {
      return c.json({ error: '権限がありません' }, 403);
    }

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'POST',
      path: `/submissions/${id}/submit`,
      userId,
    });

    if (!apiResult.ok) return c.json({ error: apiResult.error }, apiResult.status);
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Submit submission error:', error);
    return c.json({ error: '答案の提出に失敗しました' }, 500);
  }
});

export default submissions;
