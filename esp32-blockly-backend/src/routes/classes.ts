/**
 * /api/classes routes — enterprise class management.
 *
 * Thin proxy layer over the digicode-class-server on ML30. All of the
 * business logic (CRUD, ownership, cap enforcement) lives there. This
 * file is responsible for:
 *
 *   1. Authenticating the user via Workers' existing JWT system.
 *   2. Enforcing that the user has the 'enterprise' plan.
 *   3. Forwarding the request to ML30 with the shared secret and userId.
 *   4. Returning the ML30 response verbatim.
 *
 * Related:
 *   - prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md
 *   - Phase 1 digicode-class-server repo (routes/classes.ts)
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { requirePlan } from '../middleware/plan';
import { proxyClassApi, type ClassApiResult } from '../utils/classApi';
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

type Env = { Bindings: Bindings; Variables: Variables };

const classes = new Hono<Env>();

// All class endpoints require authentication + enterprise plan.
classes.use('*', authMiddleware);
classes.use('*', requirePlan('enterprise'));

// Hono's c.json() narrows status via StatusCode. The ML30 proxy can return
// any 2xx–5xx code at runtime, so we cast once through a wide union.
// Using a single `as` helper keeps call sites readable.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function forwardResponse(c: Context<Env>, result: ClassApiResult): Response {
  if (!result.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.json({ error: result.error }, result.status as any);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c.json(result.body as Record<string, unknown>, result.status as any);
}

// GET /api/classes — list classes owned by the authenticated user.
classes.get('/', async (c) => {
  const { userId } = c.get('user');
  const result = await proxyClassApi(c.env, {
    method: 'GET',
    path: '/classes',
    userId,
  });
  return forwardResponse(c, result);
});

// POST /api/classes — create a new class.
classes.post('/', async (c) => {
  const { userId } = c.get('user');

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'リクエストボディが不正です' }, 400);
  }

  const result = await proxyClassApi(c.env, {
    method: 'POST',
    path: '/classes',
    userId,
    body,
  });
  return forwardResponse(c, result);
});

// GET /api/classes/:id — fetch a single class.
classes.get('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = c.req.param('id');

  // Light-weight input check before burning an ML30 round-trip.
  const parsed = Number.parseInt(id, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return c.json({ error: '無効なIDです' }, 400);
  }

  const result = await proxyClassApi(c.env, {
    method: 'GET',
    path: `/classes/${parsed}`,
    userId,
  });
  return forwardResponse(c, result);
});

// DELETE /api/classes/:id — delete a class (cascades on ML30).
classes.delete('/:id', async (c) => {
  const { userId } = c.get('user');
  const id = c.req.param('id');

  const parsed = Number.parseInt(id, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return c.json({ error: '無効なIDです' }, 400);
  }

  const result = await proxyClassApi(c.env, {
    method: 'DELETE',
    path: `/classes/${parsed}`,
    userId,
  });
  return forwardResponse(c, result);
});

export default classes;
