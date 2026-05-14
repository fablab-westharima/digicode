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

import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { authMiddleware } from '../middleware/auth';
import { proxyClassApi, type ClassApiEnv } from '../utils/classApi';
import { errorJson } from '../utils/errorJson';
import type { Bindings, Variables } from '../types/env';

const submissions = new Hono<{ Bindings: Bindings; Variables: Variables }>();

submissions.use('*', authMiddleware);

function getClassApiEnv(c: Context<{ Bindings: Bindings; Variables: Variables }>): ClassApiEnv {
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

    // NEW-5 (Session 121): ML30 internal error string を client に透過していた
    // c.json({ error: apiResult.error }) を errorJson 統一に置換。
    // proxyClassApi の error 文字列は将来内部 path / Tunnel / timeout を含む可能性、
    // rule 16 attacker-perspective-defense 整合で console.error のみ保持。
    if (!apiResult.ok) {
      console.error('[submissions] List my submissions ML30 error:', apiResult.error);
      return errorJson(c, 'submission.listFailed', apiResult.status);
    }
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('List my submissions error:', error);
    return errorJson(c, 'submission.listFailed', 500);
  }
});

// GET /api/submissions/:id/attachment — 課題PDFダウンロード（生徒・管理者共通）
//
// 認可:
//   - 生徒: 自分の submission のみ（studentUserId === userId）
//   - 管理者: 自クラスの submission のみ（classes.owner_id === userId）
//
// フロー:
//   1. ML30 GET /submissions/:id で assignmentId, classId, studentUserId を取得
//   2. 上記の認可判定
//   3. ML30 GET /assignments/:assignmentId/attachment で binary を proxy
//
// 注: :id より前に配置してルートマッチ順序を明確化
submissions.get('/:id/attachment', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return errorJson(c, 'validation.invalidId', 400);

    // 1. ML30 から submission メタデータを取得
    const metaResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/${id}`,
      userId,
    });

    if (!metaResult.ok) {
      // NEW-5 (Session 121): ML30 error 透過を errorJson 統一に置換。
      console.error('[submissions] Get attachment meta ML30 error:', metaResult.error);
      return errorJson(c, 'submission.getFailed', metaResult.status);
    }

    const sub = (metaResult.body as {
      submission: {
        assignmentId: number;
        classId: number;
        studentUserId: number;
        attachmentFilename: string | null;
      };
    }).submission;

    // 2. 認可: 生徒本人 or クラス owner
    if (sub.studentUserId !== userId) {
      const cls = await c.env.DB.prepare(
        `SELECT owner_id FROM classes WHERE id = ?`
      ).bind(sub.classId).first<{ owner_id: number }>();

      if (!cls || cls.owner_id !== userId) {
        return errorJson(c, 'auth.forbidden', 403);
      }
    }

    // 添付ファイルが無い場合は 404 を早期返却
    if (!sub.attachmentFilename) {
      return errorJson(c, 'submission.noAttachment', 404);
    }

    // 3. ML30 から binary を proxy（classes.ts の管理者用ルートと同じパターン）
    const env = getClassApiEnv(c);
    const url = new URL(
      `/assignments/${sub.assignmentId}/attachment`,
      env.CLASS_API_URL
    ).toString();

    const res = await fetch(url, {
      headers: {
        'X-Internal-Secret': env.CLASS_API_SECRET,
        'X-User-Id': String(userId),
      },
    });

    if (!res.ok) {
      const data = await res
        .json()
        .catch(() => ({ error: 'ダウンロードに失敗しました' }));
      return c.json(data, res.status as ContentfulStatusCode);
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition':
          res.headers.get('Content-Disposition') || 'attachment',
        'Content-Length': res.headers.get('Content-Length') || '',
      },
    });
  } catch (error) {
    console.error('Download submission attachment error:', error);
    return errorJson(c, 'submission.downloadFailed', 500);
  }
});

// GET /api/submissions/:id — submission 詳細
submissions.get('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return errorJson(c, 'validation.invalidId', 400);

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/${id}`,
      userId,
    });

    if (!apiResult.ok) {
      // NEW-5 (Session 121): ML30 error 透過を errorJson 統一に置換。
      console.error('[submissions] Get submission ML30 error:', apiResult.error);
      return errorJson(c, 'submission.getFailed', apiResult.status);
    }

    // 認可: 生徒は自分の submission のみ、enterprise owner は自クラスの submission
    const body = apiResult.body as { submission: { studentUserId: number; classId: number } };
    const sub = body.submission;

    if (sub.studentUserId !== userId) {
      const cls = await c.env.DB.prepare(
        `SELECT owner_id FROM classes WHERE id = ?`
      ).bind(sub.classId).first<{ owner_id: number }>();

      if (!cls || cls.owner_id !== userId) {
        return errorJson(c, 'auth.forbidden', 403);
      }
    }

    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Get submission error:', error);
    return errorJson(c, 'submission.getFailed', 500);
  }
});

// PUT /api/submissions/:id — 答案保存
submissions.put('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return errorJson(c, 'validation.invalidId', 400);

    // 自分の submission かチェック
    const check = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/${id}`,
      userId,
    });

    if (!check.ok) {
      // NEW-5 (Session 121): ML30 error 透過を errorJson 統一に置換。
      // 旧コードは check.error の有無で 2 経路に分かれていたが、いずれも
      // submission.notFound に集約 (ownership check 失敗を user 視点で notFound 扱い)。
      console.error('[submissions] Save ownership-check ML30 error:', check.error);
      return errorJson(c, 'submission.notFound', check.status);
    }

    const sub = (check.body as { submission: { studentUserId: number } }).submission;
    if (sub.studentUserId !== userId) {
      return errorJson(c, 'auth.forbidden', 403);
    }

    const body = await c.req.json();

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'PUT',
      path: `/submissions/${id}`,
      userId,
      body,
    });

    if (!apiResult.ok) {
      // NEW-5 (Session 121): ML30 error 透過を errorJson 統一に置換。
      console.error('[submissions] Save submission ML30 error:', apiResult.error);
      return errorJson(c, 'submission.saveFailed', apiResult.status);
    }
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Save submission error:', error);
    return errorJson(c, 'submission.saveFailed', 500);
  }
});

// POST /api/submissions/:id/submit — 提出
submissions.post('/:id/submit', async (c) => {
  try {
    const { userId } = c.get('user');
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return errorJson(c, 'validation.invalidId', 400);

    // 自分の submission かチェック
    const check = await proxyClassApi(getClassApiEnv(c), {
      method: 'GET',
      path: `/submissions/${id}`,
      userId,
    });

    if (!check.ok) {
      // NEW-5 (Session 121): ML30 error 透過を errorJson 統一に置換。
      console.error('[submissions] Submit ownership-check ML30 error:', check.error);
      return errorJson(c, 'submission.notFound', check.status);
    }

    const sub = (check.body as { submission: { studentUserId: number } }).submission;
    if (sub.studentUserId !== userId) {
      return errorJson(c, 'auth.forbidden', 403);
    }

    const apiResult = await proxyClassApi(getClassApiEnv(c), {
      method: 'POST',
      path: `/submissions/${id}/submit`,
      userId,
    });

    if (!apiResult.ok) {
      // NEW-5 (Session 121): ML30 error 透過を errorJson 統一に置換。
      console.error('[submissions] Submit submission ML30 error:', apiResult.error);
      return errorJson(c, 'submission.submitFailed', apiResult.status);
    }
    return c.json(apiResult.body, apiResult.status);
  } catch (error) {
    console.error('Submit submission error:', error);
    return errorJson(c, 'submission.submitFailed', 500);
  }
});

export default submissions;
