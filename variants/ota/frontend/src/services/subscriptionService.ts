/**
 * Stripe サブスクリプション関連 API クライアント
 */
import { fetchWithAuth } from '@/lib/api';

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
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  hasStripeSubscription: boolean;
}

export async function getPlans(): Promise<PlanInfo[]> {
  const res = await fetchWithAuth('/api/subscriptions/plans');
  if (!res.ok) throw new Error('プラン情報の取得に失敗しました');
  const data = await res.json();
  return data.plans;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await fetchWithAuth('/api/subscriptions/status');
  if (!res.ok) throw new Error('サブスクリプション情報の取得に失敗しました');
  const data = await res.json();
  return data.subscription;
}

export async function createCheckoutSession(priceId: string): Promise<string> {
  const res = await fetchWithAuth('/api/subscriptions/checkout', {
    method: 'POST',
    body: JSON.stringify({ priceId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Checkout セッションの作成に失敗しました');
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
    throw new Error(data.error || 'ポータルセッションの作成に失敗しました');
  }
  const data = await res.json();
  return data.url;
}
