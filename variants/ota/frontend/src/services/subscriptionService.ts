/**
 * Stripe サブスクリプション関連 API クライアント
 *
 * Phase 4 (plan 58 §6a, §7): hybrid Stripe + Polar.sh.
 *
 *  - `createCheckoutSession(priceId)` ... legacy backward-compat. Still
 *    used by code paths that haven't been migrated. Backend stamps the
 *    new {priceId} body to the same active-sub guard, so this call may
 *    now reject with 409 alreadyActive for users with an existing sub.
 *  - `createCheckoutByPlan(planId)`   ... new, provider-agnostic. The
 *    backend factory picks Stripe (JP / fallback) or Polar (rest of
 *    the world) based on CF-IPCountry, and the request body never names
 *    a provider — the frontend stays provider-blind on purpose.
 *
 * `getSubscriptionStatus()` returns the response in two pieces:
 *  - `subscription`        — the same shape as before plus 3 new
 *                            fields (provider, hasActiveSubscription,
 *                            periodEndAt) that the new PlanPage state
 *                            machine consumes.
 *  - top-level `country` + `expectedProvider`
 *                          — needed to drive the §6a.3 state A/B/C
 *                            decision. `expectedProvider` is what the
 *                            backend's `decideProviderByCountry` would
 *                            route a fresh checkout to right now.
 */
import { fetchWithAuth } from '@/lib/api';
import i18n from '@/i18n';

export type ProviderId = 'stripe' | 'polar';

export interface PlanInfo {
  id: string;
  name: string;
  compileLimit: number;
  features: string[];
}

export interface SubscriptionStatus {
  status: string;
  planType: string;
  plan: PlanInfo;
  // ── Pre-Phase-4 fields (backward-compat) ─────────────────────────
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  hasStripeSubscription: boolean;
  // ── Phase 4 additions (§6a.3 state machine inputs) ────────────────
  /** Which MoR owns the subscription row (or null for never-paid users). */
  provider: ProviderId | null;
  /** True while the user is consuming a paid slot (active / past_due / canceling). */
  hasActiveSubscription: boolean;
  /** ISO 8601 timestamp for the period end (subscriptions.expires_at). */
  periodEndAt: string | null;
}

export interface SubscriptionStatusResponse {
  subscription: SubscriptionStatus;
  /** ISO 3166-1 alpha-2 from CF-IPCountry, or null when unknown / Tor. */
  country: string | null;
  /**
   * Which provider the backend would route a NEW checkout to right
   * now, given this request's `country`. Frontend compares against
   * `subscription.provider` to detect a mismatch (state C).
   */
  expectedProvider: ProviderId;
  /**
   * Whether the Polar.sh integration is wired up in the current
   * backend env (POLAR_ACCESS_TOKEN set). When false and
   * `expectedProvider === 'polar'`, the frontend swaps the subscribe
   * button for a "coming soon" message rather than starting a
   * checkout against an unconfigured provider.
   */
  polarAvailable: boolean;
}

/**
 * §6a.3 state machine. Exported as a pure function so tests can sweep
 * the matrix without rendering PlanPage.
 *
 *   A — no active subscription. Free to subscribe; CF-IPCountry picks
 *       the provider.
 *   B — active subscription on the same provider the current request's
 *       country would route to. Plan changes happen via Customer Portal.
 *   C — active subscription on a DIFFERENT provider from what the
 *       country says. PlanPage renders MismatchDialog instead of
 *       starting a checkout.
 */
export type PlanState = 'A' | 'B' | 'C';

export function derivePlanState(
  hasActiveSubscription: boolean,
  currentProvider: ProviderId | null,
  expectedProvider: ProviderId,
): PlanState {
  if (!hasActiveSubscription) return 'A';
  if (currentProvider === expectedProvider) return 'B';
  return 'C';
}

/**
 * Effective state for rendering when Polar is not yet wired up in this
 * environment. The §6a.3 mismatch path requires the user to cancel
 * their existing provider and resubscribe via the recommended one — but
 * if the recommended one is Polar and Polar is unavailable, walking the
 * user through cancellation leaves them stranded. The conservative
 * collapse is:
 *
 *   - state A with expected=polar + !polarAvailable → comingSoon (UI
 *     shows the "international payment coming soon" notice instead of
 *     subscribe buttons)
 *   - state C with expected=polar + !polarAvailable → behave as state B
 *     (let the user manage their existing Stripe sub via portal; do
 *     NOT push them to cancel into an unavailable destination)
 *   - all other combinations → raw state unchanged
 */
export type EffectivePlanState = PlanState | 'A_COMING_SOON';

export function deriveEffectivePlanState(
  rawState: PlanState,
  expectedProvider: ProviderId,
  polarAvailable: boolean,
): EffectivePlanState {
  if (expectedProvider !== 'polar' || polarAvailable) {
    return rawState;
  }
  // expected=polar AND !polarAvailable
  switch (rawState) {
    case 'A':
      return 'A_COMING_SOON';
    case 'C':
      return 'B';
    case 'B':
      return 'B';
  }
}

export async function getPlans(): Promise<PlanInfo[]> {
  const res = await fetchWithAuth('/api/subscriptions/plans');
  if (!res.ok) throw new Error(i18n.t('errors.subscription.planFailed', { defaultValue: 'プラン情報の取得に失敗しました' }));
  const data = await res.json();
  return data.plans;
}

/**
 * Returns the full status payload (including country + expectedProvider).
 * Use this for the new PlanPage state machine; the existing
 * `getSubscriptionStatus()` retains the pre-Phase-4 shape for callers
 * that haven't been updated.
 */
export async function getSubscriptionStatusFull(): Promise<SubscriptionStatusResponse> {
  const res = await fetchWithAuth('/api/subscriptions/status');
  if (!res.ok) throw new Error(i18n.t('errors.subscription.infoFailed', { defaultValue: 'サブスクリプション情報の取得に失敗しました' }));
  const data = (await res.json()) as SubscriptionStatusResponse;
  return data;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  // Thin shim over the full response so legacy callers keep working
  // without learning about country / expectedProvider.
  const full = await getSubscriptionStatusFull();
  return full.subscription;
}

/**
 * AlreadyActive error: backend returned 409 because the user has an
 * active / past_due / canceling subscription. Carries the existing
 * provider + plan so the UI can render the §6a.4 mismatch dialog or
 * the §6a.3 state-B "manage your plan" path.
 */
export class AlreadyActiveError extends Error {
  // `erasableSyntaxOnly` is set on the frontend tsconfig, so we declare
  // these as explicit fields + assign in the constructor body instead of
  // using parameter properties.
  readonly currentProvider: ProviderId;
  readonly currentPlan: string;

  constructor(message: string, currentProvider: ProviderId, currentPlan: string) {
    super(message);
    this.name = 'AlreadyActiveError';
    this.currentProvider = currentProvider;
    this.currentPlan = currentPlan;
  }
}

/**
 * Legacy (pre-Phase-4) checkout call. Sends `{priceId}` and the backend
 * always routes the resulting Stripe checkout through the legacy code
 * path. Still subject to the §6a.2 active-sub guard, so a 409 here is
 * not a bug — it's the explicit double-charge prevention.
 */
export async function createCheckoutSession(priceId: string): Promise<string> {
  return postCheckout({ priceId });
}

/**
 * Phase 4 checkout call. Sends `{planId}` and lets the backend factory
 * decide Stripe or Polar based on CF-IPCountry + any existing sub.
 */
export async function createCheckoutByPlan(planId: 'lite' | 'pro' | 'enterprise'): Promise<string> {
  return postCheckout({ planId });
}

async function postCheckout(body: { planId?: string; priceId?: string }): Promise<string> {
  const res = await fetchWithAuth('/api/subscriptions/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 409 && data?.errorCode === 'subscription.alreadyActive') {
      throw new AlreadyActiveError(
        data.error || i18n.t('plan.alreadyActive.fallback', { defaultValue: 'You already have an active subscription.' }),
        data.currentProvider as ProviderId,
        String(data.currentPlan ?? ''),
      );
    }
    throw new Error(data.error || i18n.t('errors.subscription.checkoutFailed', { defaultValue: 'Checkout セッションの作成に失敗しました' }));
  }
  const data = await res.json();
  return data.url;
}

export async function createPortalSession(): Promise<string> {
  const res = await fetchWithAuth('/api/subscriptions/portal', {
    method: 'POST',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || i18n.t('errors.subscription.portalFailed', { defaultValue: 'ポータルセッションの作成に失敗しました' }));
  }
  const data = await res.json();
  return data.url;
}
