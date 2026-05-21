import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Loader2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  getSubscriptionStatusFull,
  createCheckoutByPlan,
  createPortalSession,
  AlreadyActiveError,
  derivePlanState,
  deriveEffectivePlanState,
  type SubscriptionStatusResponse,
  type ProviderId,
  type EffectivePlanState,
} from '@/services/subscriptionService';
import { MismatchDialog } from '@/components/plan/MismatchDialog';

const PLAN_ORDER = ['free', 'lite', 'pro', 'enterprise'] as const;

const PLAN_DISPLAY_STATIC: Record<string, { badge: string; color: string }> = {
  free: { badge: 'Free', color: 'text-muted-foreground' },
  lite: { badge: 'Lite', color: 'text-blue-400' },
  pro: { badge: 'Pro', color: 'text-orange-400' },
  enterprise: { badge: 'Enterprise', color: 'text-purple-400' },
};

type PaidPlanId = 'lite' | 'pro' | 'enterprise';
const PAID_PLANS: readonly PaidPlanId[] = ['lite', 'pro', 'enterprise'] as const;
function isPaidPlanId(value: string): value is PaidPlanId {
  return (PAID_PLANS as readonly string[]).includes(value);
}

export default function PlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user, checkAuth } = useAuthStore();
  const [statusResponse, setStatusResponse] = useState<SubscriptionStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [mismatchDialogOpen, setMismatchDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = searchParams.get('result');
        if (result === 'success') {
          setSuccessMessage(t('plan.changeSuccess'));
          await checkAuth();
        }
      } catch {
        // checkAuth 失敗は無視（ProtectedRoute が処理）
      }
      try {
        const s = await getSubscriptionStatusFull();
        setStatusResponse(s);
      } catch (e) {
        // status 取得失敗でもページは表示する（user.plan で代替）
        console.warn('getSubscriptionStatusFull failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, checkAuth, t]);

  const status = statusResponse?.subscription ?? null;
  const expectedProvider: ProviderId = statusResponse?.expectedProvider ?? 'stripe';
  const polarAvailable: boolean = statusResponse?.polarAvailable ?? false;

  const currentPlan = user?.plan || status?.planType || 'free';
  const isAdmin = !!user?.isAdmin;
  const isInvited = user?.planSource === 'admin_granted';
  const [inviteConfirmPlan, setInviteConfirmPlan] = useState<string | null>(null);

  const planRank = (p: string) => (PLAN_ORDER as readonly string[]).indexOf(p);
  const isHigherPlan = (planId: string) => planRank(planId) > planRank(currentPlan);

  const planState: EffectivePlanState = useMemo(() => {
    const raw = derivePlanState(
      !!status?.hasActiveSubscription,
      status?.provider ?? null,
      expectedProvider,
    );
    return deriveEffectivePlanState(raw, expectedProvider, polarAvailable);
  }, [status?.hasActiveSubscription, status?.provider, expectedProvider, polarAvailable]);

  const isComingSoon = planState === 'A_COMING_SOON';
  const isCanceling = status?.status === 'canceling';

  // §6a guard: regular users in state C clicking subscribe show the
  // mismatch dialog instead of starting a checkout that the backend
  // would reject with 409 anyway.
  const handlePaidPlanClick = async (planId: PaidPlanId) => {
    if (planState === 'A_COMING_SOON') {
      // Defensive: the button should be disabled, but if it gets
      // clicked anyway (e.g. accessibility tools bypassing the
      // disabled attribute), no-op rather than fire a doomed checkout.
      return;
    }
    if (planState === 'C') {
      setMismatchDialogOpen(true);
      return;
    }
    if (planState === 'B') {
      // For users already subscribed, the cards' primary action is to
      // open Customer Portal so they can upgrade/downgrade inside the
      // existing provider. The button label below already says
      // "Manage subscription"; we route through portal here.
      await handlePortal();
      return;
    }
    setActionLoading(planId);
    setError(null);
    try {
      const url = await createCheckoutByPlan(planId);
      if (url) window.location.href = url;
    } catch (e) {
      if (e instanceof AlreadyActiveError) {
        // Defense in depth: the backend may have changed state between
        // our last /status fetch and this checkout (e.g. another tab
        // started a sub). Refresh and re-render.
        setMismatchDialogOpen(true);
        try {
          const refreshed = await getSubscriptionStatusFull();
          setStatusResponse(refreshed);
        } catch (refetchErr) {
          console.warn('status refetch after AlreadyActive failed:', refetchErr);
        }
      } else {
        setError(e instanceof Error ? e.message : t('plan.error'));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading('portal');
    setError(null);
    try {
      const url = await createPortalSession();
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('plan.error'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('plan.backToEditor')}
          </button>
          <h1 className="text-2xl font-bold">{t('plan.title')}</h1>
        </div>

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-md bg-primary/10 border border-primary/30">
            <p className="text-sm text-foreground">{successMessage}</p>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-foreground">{error}</p>
          </div>
        )}

        {/* §6a 追補: 海外決済 (Polar) 未開通時の案内バナー */}
        {isComingSoon && (
          <div className="mb-6 p-4 rounded-md bg-primary/10 border border-primary/30">
            <p className="text-sm text-foreground">
              {t('plan.internationalPaymentComingSoon')}
            </p>
          </div>
        )}

        {/* 現在のプラン */}
        <div className="mb-8 p-4 rounded-md bg-card border border-border">
          <p className="text-sm text-muted-foreground">{t('plan.currentPlan')}</p>
          {(isAdmin || isInvited) ? (
            <>
              <p className="text-xl font-bold mt-1 text-foreground">{t('plan.invitedAccount')}</p>
              <p className="mt-2 text-sm text-destructive">
                {t('plan.invitedFrom', { plan: PLAN_DISPLAY_STATIC[currentPlan]?.badge || currentPlan })}
              </p>
            </>
          ) : (
            <p className={`text-xl font-bold mt-1 ${PLAN_DISPLAY_STATIC[currentPlan]?.color || ''}`}>
              {PLAN_DISPLAY_STATIC[currentPlan]?.badge || currentPlan}
            </p>
          )}
          {/* §6a.4 grace period note — shown while status='canceling' (期間末まで access あり) */}
          {!isAdmin && !isInvited && isCanceling && (
            <p className="mt-2 text-sm text-muted-foreground">{t('plan.gracePeriodNote')}</p>
          )}
          {!isAdmin && !isInvited && status?.hasActiveSubscription && (
            <button
              onClick={handlePortal}
              disabled={actionLoading === 'portal'}
              className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50"
            >
              {actionLoading === 'portal' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ExternalLink className="w-3 h-3" />
              )}
              {t('plan.portalLink')}
            </button>
          )}
        </div>

        {/* プラン一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLAN_ORDER.map((planId) => {
            const display = PLAN_DISPLAY_STATIC[planId];
            const description = t(`plan.${planId}.description`);
            const isCurrent = currentPlan === planId;

            return (
              <div
                key={planId}
                className={`p-5 rounded-lg border ${
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-lg font-bold ${display.color}`}>
                    {display.badge}
                  </span>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                      {t('plan.currentBadge')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{description}</p>

                {/* 機能リスト */}
                <ul className="space-y-1.5 mb-4">
                  {getFallbackFeatures(planId, t).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* アクションボタン */}
                {(() => {
                  if (isAdmin || isCurrent || planId === 'free') {
                    return null;
                  }

                  if (!isPaidPlanId(planId)) {
                    return null;
                  }

                  if (isInvited && isHigherPlan(planId)) {
                    return (
                      <button
                        onClick={() => setInviteConfirmPlan(planId)}
                        disabled={!!actionLoading}
                        className="w-full py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {t('plan.selfContract')}
                      </button>
                    );
                  }

                  if (isInvited) {
                    return null;
                  }

                  // Regular user: button label + handler driven by §6a state.
                  const isStateB = planState === 'B';
                  const label = isComingSoon
                    ? t('plan.preparingButton')
                    : isStateB
                      ? t('plan.manageSubscription')
                      : t('plan.subscribe');
                  const isLoading =
                    !isComingSoon &&
                    ((isStateB && actionLoading === 'portal') || actionLoading === planId);
                  const styleClasses = isStateB
                    ? 'w-full py-2 text-sm rounded border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-2'
                    : 'w-full py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2';
                  return (
                    <button
                      onClick={() => handlePaidPlanClick(planId)}
                      disabled={!!actionLoading || isComingSoon}
                      className={styleClasses}
                    >
                      {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {isStateB && <ExternalLink className="w-3 h-3" />}
                      {label}
                    </button>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* §6a.4 Mismatch dialog (state C) */}
        {mismatchDialogOpen && status?.provider && (
          <MismatchDialog
            currentProvider={status.provider}
            expectedProvider={expectedProvider}
            onCancellationRedirect={() => {
              setMismatchDialogOpen(false);
              handlePortal();
            }}
            onDismiss={() => setMismatchDialogOpen(false)}
            redirecting={actionLoading === 'portal'}
          />
        )}

        {/* 招待ユーザーの上位プラン契約確認ダイアログ */}
        {inviteConfirmPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-lg p-6 max-w-md mx-4">
              <h2 className="text-lg font-bold text-foreground mb-3">
                {t('plan.confirmTitle', { plan: PLAN_DISPLAY_STATIC[inviteConfirmPlan]?.badge })}
              </h2>
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 mb-4">
                <p className="text-sm text-foreground">
                  {t('plan.confirmWarning', { currentPlan: PLAN_DISPLAY_STATIC[currentPlan]?.badge, newPlan: PLAN_DISPLAY_STATIC[inviteConfirmPlan]?.badge })}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('plan.confirmNote')}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setInviteConfirmPlan(null)}
                  disabled={!!actionLoading}
                  className="px-4 py-2 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                >
                  {t('plan.confirmCancel')}
                </button>
                <button
                  onClick={() => {
                    const planId = inviteConfirmPlan;
                    setInviteConfirmPlan(null);
                    if (isPaidPlanId(planId)) {
                      handlePaidPlanClick(planId);
                    }
                  }}
                  disabled={!!actionLoading}
                  className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  {t('plan.confirmSubmit')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 第107回 Task 2: プラン差別化 = Pro/Enterprise narrow に整合する features list。
// - Lite = AI 3 機能 (Block / Chat / UICustomize)
// - Pro = サーボパルス + Lite
// - Enterprise = ピンアサイン + クラス + Pro
function getFallbackFeatures(planId: string, t: (key: string) => string): string[] {
  const map: Record<string, string[]> = {
    free: [
      t('plan.features.cloudCompile50'),
    ],
    lite: [
      t('plan.features.cloudCompile250'),
      t('plan.features.aiBlockGeneration'),
      t('plan.features.aiChat'),
      t('plan.features.aiUiCustomize'),
    ],
    pro: [
      t('plan.features.cloudCompile500'),
      t('plan.features.servoPulse'),
      t('plan.features.aiBlockGeneration'),
      t('plan.features.aiChat'),
      t('plan.features.aiUiCustomize'),
    ],
    enterprise: [
      t('plan.features.cloudCompileUnlimited'),
      t('plan.features.pinAssign'),
      t('plan.features.classFeature'),
      t('plan.features.servoPulse'),
      t('plan.features.aiBlockGeneration'),
      t('plan.features.aiChat'),
      t('plan.features.aiUiCustomize'),
    ],
  };
  return map[planId] || [];
}
