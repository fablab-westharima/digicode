import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Loader2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
  type SubscriptionStatus,
} from '@/services/subscriptionService';

const PLAN_ORDER = ['free', 'lite', 'pro', 'enterprise'] as const;

const PLAN_DISPLAY_STATIC: Record<string, { badge: string; color: string }> = {
  free: { badge: 'Free', color: 'text-muted-foreground' },
  lite: { badge: 'Lite', color: 'text-blue-400' },
  pro: { badge: 'Pro', color: 'text-orange-400' },
  enterprise: { badge: 'Enterprise', color: 'text-purple-400' },
};

// Price ID は Stripe Dashboard で Product/Price 作成後に設定する。
// 本番運用開始までに環境変数化 or DB 管理に移行予定。
// 現時点では空文字（Checkout ボタンは Price ID 未設定時に無効化）。
const PRICE_IDS: Record<string, string> = {
  lite: 'price_1TNRCMKt2XofKR981nzCU58p',
  pro: 'price_1TNRCyKt2XofKR98eQVV1WlL',
  enterprise: 'price_1TNRDPKt2XofKR9885ZZcEzR',
};

export default function PlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user, checkAuth } = useAuthStore();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        const s = await getSubscriptionStatus();
        setStatus(s);
      } catch (e) {
        // status 取得失敗でもページは表示する（user.plan で代替）
        console.warn('getSubscriptionStatus failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, checkAuth, t]);

  const currentPlan = user?.plan || status?.planType || 'free';
  const isAdmin = !!user?.isAdmin;
  const isInvited = user?.planSource === 'admin_granted';
  const [inviteConfirmPlan, setInviteConfirmPlan] = useState<string | null>(null);

  const planRank = (p: string) => (PLAN_ORDER as readonly string[]).indexOf(p);
  const isHigherPlan = (planId: string) => planRank(planId) > planRank(currentPlan);

  const handleCheckout = async (planId: string) => {
    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      setError(t('plan.priceNotSet'));
      return;
    }
    setActionLoading(planId);
    setError(null);
    try {
      const url = await createCheckoutSession(priceId);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('plan.error'));
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
          {!isAdmin && !isInvited && status?.hasStripeSubscription && (
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
            const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS];

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
                  if (isAdmin || isCurrent || planId === 'free' || !priceId) {
                    // 管理者 / 現在のプラン / Free / Price未設定 → ボタンなし
                    if (planId !== 'free' && !priceId && !isCurrent) {
                      return <p className="text-xs text-muted-foreground text-center">{t('plan.preparing')}</p>;
                    }
                    return null;
                  }

                  if (isInvited && isHigherPlan(planId)) {
                    // 招待ユーザー: 上位プランのみ表示（確認ダイアログ付き）
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
                    // 招待ユーザー: 下位プランはボタンなし
                    return null;
                  }

                  // 通常ユーザー
                  if (status?.hasStripeSubscription) {
                    return (
                      <button
                        onClick={handlePortal}
                        disabled={!!actionLoading}
                        className="w-full py-2 text-sm rounded border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {actionLoading === 'portal' && <Loader2 className="w-3 h-3 animate-spin" />}
                        <ExternalLink className="w-3 h-3" />
                        {t('plan.changePlan')}
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => handleCheckout(planId)}
                      disabled={!!actionLoading}
                      className="w-full py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === planId && <Loader2 className="w-3 h-3 animate-spin" />}
                      {t('plan.subscribe')}
                    </button>
                  );
                })()}
              </div>
            );
          })}
        </div>

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
                    handleCheckout(planId);
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

function getFallbackFeatures(planId: string, t: (key: string) => string): string[] {
  const map: Record<string, string[]> = {
    free: [t('plan.features.cloudCompile50'), t('plan.features.basicBlocks')],
    lite: [t('plan.features.cloudCompile250'), t('plan.features.basicBlocks'), t('plan.features.aiBlockGeneration'), t('plan.features.aiChat')],
    pro: [t('plan.features.cloudCompile500'), t('plan.features.allBlocks'), t('plan.features.pinAssign'), t('plan.features.aiBlockGeneration'), t('plan.features.aiChat')],
    enterprise: [t('plan.features.cloudCompileUnlimited'), t('plan.features.allFeatures'), t('plan.features.classFeature')],
  };
  return map[planId] || [];
}
