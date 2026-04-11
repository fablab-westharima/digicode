/**
 * Plan-gate middleware.
 *
 * Usage: must be applied AFTER authMiddleware, because it reads `user`
 * from the context. Responds with 403 if the user's plan is not in the
 * allowed list.
 *
 *   classes.use('*', authMiddleware, requirePlan('enterprise'));
 *
 * Also sets `userPlan` on the context so downstream handlers can read
 * the resolved plan without querying the DB again.
 *
 * 関連: prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md (プレ調査B)
 */

import type { MiddlewareHandler } from 'hono';
import { getUserPlan, type PlanType } from '../utils/plan';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  user: {
    userId: number;
    email: string;
  };
  userPlan: PlanType;
};

export function requirePlan(
  ...allowedPlans: PlanType[]
): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      // Should never happen if authMiddleware ran first, but fail closed.
      return c.json({ error: '認証が必要です' }, 401);
    }

    const plan = await getUserPlan(c.env.DB, user.userId);
    if (!allowedPlans.includes(plan)) {
      return c.json(
        {
          error: 'このプランのユーザーのみ利用できます',
          requiredPlans: allowedPlans,
          currentPlan: plan,
        },
        403
      );
    }

    c.set('userPlan', plan);
    await next();
  };
}
