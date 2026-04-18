import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createPortalSession,
  type SubscriptionStatus,
  type PlanInfo,
} from '@/services/subscriptionService';

const PLAN_ORDER = ['free', 'lite', 'pro', 'enterprise'] as const;

const PLAN_DISPLAY: Record<string, { badge: string; color: string; description: string }> = {
  free: { badge: 'Free', color: 'text-muted-foreground', description: 'お試し・ローカルコンパイル向け' },
  lite: { badge: 'Lite', color: 'text-blue-400', description: '個人ホビイスト向け' },
  pro: { badge: 'Pro', color: 'text-orange-400', description: '開発者・Maker 向け' },
  enterprise: { badge: 'Enterprise', color: 'text-purple-400', description: '教育機関・チーム向け' },
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
          setSuccessMessage('プランの変更が完了しました。反映まで数秒かかる場合があります。');
          await checkAuth();
        }
        const s = await getSubscriptionStatus();
        setStatus(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'エラーが発生しました');
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, checkAuth]);

  const currentPlan = user?.plan || status?.planType || 'free';
  const isAdmin = !!user?.isAdmin;
  const isInvited = user?.planSource === 'admin_granted';
  const hideCheckout = isAdmin || isInvited;

  const handleCheckout = async (planId: string) => {
    const priceId = PRICE_IDS[planId];
    if (!priceId) {
      setError('このプランの Price ID が未設定です。管理者に連絡してください。');
      return;
    }
    setActionLoading(planId);
    setError(null);
    try {
      const url = await createCheckoutSession(priceId);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
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
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
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
            エディタに戻る
          </button>
          <h1 className="text-2xl font-bold">プラン・お支払い</h1>
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
          <p className="text-sm text-muted-foreground">現在のプラン</p>
          {hideCheckout ? (
            <>
              <p className="text-xl font-bold mt-1 text-foreground">招待アカウント</p>
              <p className="mt-2 text-sm text-destructive">
                ファブラボ西播磨から招待され、{PLAN_DISPLAY[currentPlan]?.badge || currentPlan} プラン相当の権限が付与されています
              </p>
            </>
          ) : (
            <p className={`text-xl font-bold mt-1 ${PLAN_DISPLAY[currentPlan]?.color || ''}`}>
              {PLAN_DISPLAY[currentPlan]?.badge || currentPlan}
            </p>
          )}
          {!hideCheckout && status?.hasStripeSubscription && (
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
              請求情報・プラン変更・解約
            </button>
          )}
        </div>

        {/* プラン一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PLAN_ORDER.map((planId) => {
            const display = PLAN_DISPLAY[planId];
            const planInfo = status?.plan?.id === planId ? status.plan : null;
            const isCurrent = currentPlan === planId;
            const priceId = PRICE_IDS[planId as keyof typeof PRICE_IDS];
            const canCheckout = planId !== 'free' && !isCurrent && !!priceId;

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
                      現在のプラン
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{display.description}</p>

                {/* 機能リスト */}
                <ul className="space-y-1.5 mb-4">
                  {(planInfo?.features || getFallbackFeatures(planId)).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* アクションボタン（招待・管理者には表示しない） */}
                {canCheckout && !hideCheckout && !status?.hasStripeSubscription && (
                  <button
                    onClick={() => handleCheckout(planId)}
                    disabled={!!actionLoading}
                    className="w-full py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === planId && <Loader2 className="w-3 h-3 animate-spin" />}
                    このプランにする
                  </button>
                )}
                {canCheckout && !hideCheckout && status?.hasStripeSubscription && (
                  <button
                    onClick={handlePortal}
                    disabled={!!actionLoading}
                    className="w-full py-2 text-sm rounded border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'portal' && <Loader2 className="w-3 h-3 animate-spin" />}
                    <ExternalLink className="w-3 h-3" />
                    プランを変更する
                  </button>
                )}
                {planId !== 'free' && !priceId && !isCurrent && (
                  <p className="text-xs text-muted-foreground text-center">準備中</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getFallbackFeatures(planId: string): string[] {
  const map: Record<string, string[]> = {
    free: ['月50回クラウドコンパイル', '基本ブロック'],
    lite: ['月250回クラウドコンパイル', '基本ブロック'],
    pro: ['月500回クラウドコンパイル', '全ブロック', 'ピンアサイン機能'],
    enterprise: ['無制限クラウドコンパイル', '全機能', 'クラス機能'],
  };
  return map[planId] || [];
}
