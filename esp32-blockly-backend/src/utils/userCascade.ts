/**
 * User cascade-delete helper — single source of truth for the 14 tables
 * that depend on `users.id`.
 *
 * Used from three callsites:
 *   - auth.ts DELETE /account (self-delete)
 *   - admin.ts DELETE /users/:id (admin-delete)
 *   - classes.ts student cleanup (when a student loses all class memberships
 *     and the disposable account convention kicks in)
 *
 * Session 119 T7: previously the classes.ts student-cleanup path did
 *   `DELETE FROM users WHERE id = ? AND account_type = 'student'` only,
 * leaving the 14 dependent tables (authenticators, refresh_tokens, 2fa
 * settings, recovery_codes, feedback, projects, compile_usage,
 * subscriptions, etc.) as orphan rows. auth.ts and admin.ts both
 * already had the full table list inlined; consolidating into one
 * helper removes the copy-paste drift that allowed the classes.ts
 * scope omission to persist.
 *
 * Owner-class cascade (ML30 + D1 classes table) is intentionally NOT
 * included here: it depends on caller context (which userId triggered
 * the delete, audit log shape) and stays in each callsite using
 * `deleteClassCascade` directly.
 */
// env subset — only DB is needed; declared as a structural type so callers
// from both Hono routes (full Bindings) and ML30 helpers (ClassApiEnv subset)
// can pass through without an explicit cast.
interface CascadeEnv {
  DB: D1Database;
}

/**
 * Tables that hold per-user data and must be cleared before the
 * `users` row is removed. Order matters only for crash recovery
 * (clear leaf-data tables first so a mid-flight crash doesn't
 * leave a half-deleted user with credentials still active).
 */
const DEPENDENT_TABLES = [
  'authenticators',
  'refresh_tokens',
  'password_reset_tokens',
  'email_verification_tokens',
  'recovery_tokens',
  'class_members',
  'login_otp_codes',
  'trusted_devices',
  'user_2fa_settings',
  'recovery_codes',
  'feedback',
  'projects',
  'compile_usage',
  'subscriptions',
] as const;

/**
 * Delete the per-user rows from all dependent tables and finally the
 * users row itself. Caller handles owner-class cascade (ML30 + D1
 * classes table) separately if applicable.
 */
export async function deleteUserCascade(
  env: CascadeEnv,
  userId: number
): Promise<void> {
  for (const table of DEPENDENT_TABLES) {
    await env.DB.prepare(
      `DELETE FROM ${table} WHERE user_id = ?`
    ).bind(userId).run();
  }
  await env.DB.prepare(
    'DELETE FROM users WHERE id = ?'
  ).bind(userId).run();
}

/**
 * Variant for the classes.ts student-cleanup path: only removes the
 * user if the row is still tagged `account_type = 'student'`. The
 * caller has already verified the student has no remaining class
 * memberships.
 *
 * Returns `true` if a user was deleted, `false` if no row matched the
 * student filter (e.g. account_type was upgraded to 'regular' mid-flight,
 * or the row was already deleted by another path).
 */
export async function deleteStudentCascade(
  env: CascadeEnv,
  userId: number
): Promise<boolean> {
  // Verify the user is still a student before triggering the cascade.
  // Required because the disposable-account convention only applies to
  // `account_type = 'student'`; an upgraded user should never be cascade-
  // deleted from the classes-cleanup path.
  const row = await env.DB.prepare(
    "SELECT id FROM users WHERE id = ? AND account_type = 'student'"
  ).bind(userId).first<{ id: number }>();

  if (!row) return false;

  for (const table of DEPENDENT_TABLES) {
    await env.DB.prepare(
      `DELETE FROM ${table} WHERE user_id = ?`
    ).bind(userId).run();
  }
  // Final users-row delete keeps the explicit student filter so a race
  // (account_type upgrade between the check above and here) does not
  // accidentally remove a non-student user.
  const result = await env.DB.prepare(
    "DELETE FROM users WHERE id = ? AND account_type = 'student'"
  ).bind(userId).run();

  return (result.meta?.changes ?? 0) > 0;
}
