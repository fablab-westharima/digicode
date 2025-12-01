import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
};

const projects = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// すべてのルートに認証を適用
projects.use('*', authMiddleware);

// プロジェクト一覧取得
projects.get('/', async (c) => {
  try {
    const { userId } = c.get('user');

    const results = await c.env.DB.prepare(`
      SELECT id, title, description, language, is_public, created_at, updated_at
      FROM projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).bind(userId).all();

    return c.json({
      projects: results.results || [],
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return c.json({ error: 'プロジェクト一覧の取得に失敗しました' }, 500);
  }
});

// プロジェクト詳細取得
projects.get('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const projectId = parseInt(c.req.param('id'));

    if (isNaN(projectId)) {
      return c.json({ error: '無効なプロジェクトIDです' }, 400);
    }

    const project = await c.env.DB.prepare(`
      SELECT id, user_id, title, description, blockly_xml, generated_code, language, is_public, created_at, updated_at
      FROM projects
      WHERE id = ?
    `).bind(projectId).first();

    if (!project) {
      return c.json({ error: 'プロジェクトが見つかりません' }, 404);
    }

    // 所有者チェック（公開プロジェクトは誰でも閲覧可能）
    if (project.user_id !== userId && !project.is_public) {
      return c.json({ error: 'このプロジェクトへのアクセス権がありません' }, 403);
    }

    return c.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return c.json({ error: 'プロジェクトの取得に失敗しました' }, 500);
  }
});

// 新規プロジェクト作成
projects.post('/', async (c) => {
  try {
    const { userId } = c.get('user');
    const body = await c.req.json();
    const { title, description, blocklyXml, language } = body;

    // バリデーション
    if (!title || title.length === 0) {
      return c.json({ error: 'タイトルは必須です' }, 400);
    }

    if (title.length > 100) {
      return c.json({ error: 'タイトルは100文字以内で入力してください' }, 400);
    }

    if (!blocklyXml) {
      return c.json({ error: 'blocklyXmlは必須です' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO projects (user_id, title, description, blockly_xml, language)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, user_id, title, description, blockly_xml, generated_code, language, is_public, created_at, updated_at
    `).bind(userId, title, description || null, blocklyXml, language || 'micropython').first();

    if (!result) {
      return c.json({ error: 'プロジェクトの作成に失敗しました' }, 500);
    }

    return c.json({ project: result }, 201);
  } catch (error) {
    console.error('Create project error:', error);
    return c.json({ error: 'プロジェクトの作成に失敗しました' }, 500);
  }
});

// プロジェクト更新
projects.put('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const projectId = parseInt(c.req.param('id'));

    if (isNaN(projectId)) {
      return c.json({ error: '無効なプロジェクトIDです' }, 400);
    }

    // 所有者チェック
    const existing = await c.env.DB.prepare(
      'SELECT user_id FROM projects WHERE id = ?'
    ).bind(projectId).first<{ user_id: number }>();

    if (!existing) {
      return c.json({ error: 'プロジェクトが見つかりません' }, 404);
    }

    if (existing.user_id !== userId) {
      return c.json({ error: 'このプロジェクトを編集する権限がありません' }, 403);
    }

    const body = await c.req.json();
    const { title, description, blocklyXml, generatedCode, language } = body;

    // 更新するフィールドを構築
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (title !== undefined) {
      if (title.length === 0) {
        return c.json({ error: 'タイトルは必須です' }, 400);
      }
      if (title.length > 100) {
        return c.json({ error: 'タイトルは100文字以内で入力してください' }, 400);
      }
      updates.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (blocklyXml !== undefined) {
      updates.push('blockly_xml = ?');
      values.push(blocklyXml);
    }

    if (generatedCode !== undefined) {
      updates.push('generated_code = ?');
      values.push(generatedCode);
    }

    if (language !== undefined) {
      updates.push('language = ?');
      values.push(language);
    }

    if (updates.length === 0) {
      return c.json({ error: '更新するフィールドがありません' }, 400);
    }

    values.push(projectId);

    const result = await c.env.DB.prepare(`
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING id, user_id, title, description, blockly_xml, generated_code, language, is_public, created_at, updated_at
    `).bind(...values).first();

    return c.json({ project: result });
  } catch (error) {
    console.error('Update project error:', error);
    return c.json({ error: 'プロジェクトの更新に失敗しました' }, 500);
  }
});

// プロジェクト削除
projects.delete('/:id', async (c) => {
  try {
    const { userId } = c.get('user');
    const projectId = parseInt(c.req.param('id'));

    if (isNaN(projectId)) {
      return c.json({ error: '無効なプロジェクトIDです' }, 400);
    }

    // 所有者チェック
    const existing = await c.env.DB.prepare(
      'SELECT user_id FROM projects WHERE id = ?'
    ).bind(projectId).first<{ user_id: number }>();

    if (!existing) {
      return c.json({ error: 'プロジェクトが見つかりません' }, 404);
    }

    if (existing.user_id !== userId) {
      return c.json({ error: 'このプロジェクトを削除する権限がありません' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM projects WHERE id = ?')
      .bind(projectId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return c.json({ error: 'プロジェクトの削除に失敗しました' }, 500);
  }
});

export default projects;
