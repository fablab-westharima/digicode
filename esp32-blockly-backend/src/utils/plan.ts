/**
 * Plan resolution helper.
 *
 * Phase 0 教訓:
 *   2026-04-11 に compile-usage.ts が subscriptions.plan_type のみを見ていた
 *   ために Admin 画面で付与した users.plan を無視していたバグを発見した。
 *   再発防止のため、プラン判定は必ずこの関数を経由すること。
 *
 * 優先順位: users.plan > subscriptions.plan_type > 'free'
 *
 *   - users.plan:        Admin 画面で手動付与されたプラン (migration 0014)
 *   - subscriptions.plan_type: Stripe 決済連携用 (migration 0001 + 0020 で stripe_* に統一)
 *
 * Phase D（決済実装時）に二重管理の解消方針を決定する予定だが、それまでは
 * 両方を参照して統合する。
 *
 * 関連:
 *   - prompt/maintenance/13_2026-04-11_プラン管理バグ修正と計画再編.md
 *   - prompt/maintenance/15_2026-04-11_PhaseC_クラス機能実装進捗.md (プレ調査B)
 */

export type PlanType = 'free' | 'lite' | 'pro' | 'enterprise';

/**
 * ユーザーの有効なプランを取得する。
 * DB に存在しないユーザーや、両カラムとも NULL の場合は 'free' を返す。
 */
export async function getUserPlan(
  db: D1Database,
  userId: number
): Promise<PlanType> {
  const row = await db
    .prepare(
      `SELECT u.plan, s.plan_type
       FROM users u
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE u.id = ?`
    )
    .bind(userId)
    .first<{ plan: string | null; plan_type: string | null }>();

  const raw = row?.plan || row?.plan_type || 'free';
  return normalizePlan(raw);
}

/**
 * 任意の文字列を PlanType に正規化する。未知の値は 'free' にフォールバック。
 */
export function normalizePlan(value: string | null | undefined): PlanType {
  switch (value) {
    case 'lite':
    case 'pro':
    case 'enterprise':
      return value;
    case 'free':
    default:
      return 'free';
  }
}
