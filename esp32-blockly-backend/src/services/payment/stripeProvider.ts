/**
 * StripeProvider — thin wrapper over the existing Stripe Checkout +
 * Customer Portal API calls.
 *
 * Phase 3 scope is intentionally narrow: only the two surfaces the Hono
 * route layer needs go through this class. The Stripe webhook handler
 * in `routes/webhooks.ts` is NOT touched (see plan 58 §2.1 — "既存
 * Stripe を壊さない" is the top priority). Refactoring the webhook path
 * to the same Provider pattern is a Phase 6 polish task.
 *
 * The customer-record-or-create logic (find existing stripe_customer_id
 * in D1, create on Stripe if missing, upsert into subscriptions) is
 * lifted verbatim from `routes/subscriptions.ts` so behavior matches the
 * pre-refactor flow on a per-row level. The post-refactor route file
 * delegates to this class instead of inlining Stripe SDK calls.
 */

import Stripe from 'stripe';
import type {
  PaymentProvider,
  CheckoutOptions,
  CheckoutResult,
  PortalOptions,
  PortalResult,
  PlanId,
} from './types';
import { PaymentProviderError } from './types';
import type { Bindings } from '../../types/env';

const STRIPE_API_VERSION = '2026-03-25.dahlia';

export class StripeProvider implements PaymentProvider {
  readonly id = 'stripe' as const;
  private readonly client: Stripe;
  private readonly env: Bindings;

  constructor(env: Bindings) {
    this.client = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
    this.env = env;
  }

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
    const priceId = lookupStripePriceId(this.env, opts.planId);
    if (!priceId) {
      throw new PaymentProviderError(
        'subscription.priceNotConfigured',
        `STRIPE_PRICE_${opts.planId.toUpperCase()} is not set`,
      );
    }

    const customerId = await this.findOrCreateCustomer(opts.userId, opts.email);

    let session: Stripe.Checkout.Session;
    try {
      session = await this.client.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${opts.origin}/plan?result=success`,
        cancel_url: `${opts.origin}/plan?result=cancel`,
        metadata: { digicode_user_id: String(opts.userId) },
      });
    } catch (err) {
      throw new PaymentProviderError(
        'subscription.checkoutFailed',
        'Stripe checkout.sessions.create failed',
        err,
      );
    }

    if (!session.url) {
      throw new PaymentProviderError(
        'subscription.checkoutFailed',
        'Stripe returned a checkout session without a url',
      );
    }

    return { url: session.url, sessionId: session.id, provider: 'stripe' };
  }

  async createPortalSession(opts: PortalOptions): Promise<PortalResult> {
    try {
      const session = await this.client.billingPortal.sessions.create({
        customer: opts.customerId,
        return_url: opts.returnUrl,
      });
      return { url: session.url };
    } catch (err) {
      throw new PaymentProviderError(
        'subscription.portalSessionFailed',
        'Stripe billingPortal.sessions.create failed',
        err,
      );
    }
  }

  /**
   * Reuse the user's existing Stripe customer if we have one in D1;
   * otherwise create a fresh customer and upsert the subscriptions row.
   *
   * Behavior matches the pre-Phase-3 inline implementation in
   * `routes/subscriptions.ts` exactly — including writing `provider='stripe'`
   * on the INSERT path so migration 0027's new column is populated
   * meaningfully for stripe-created subscriptions.
   */
  private async findOrCreateCustomer(userId: number, email: string): Promise<string> {
    const sub = await this.env.DB
      .prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?')
      .bind(userId)
      .first<{ stripe_customer_id: string | null }>();

    if (sub?.stripe_customer_id) {
      return sub.stripe_customer_id;
    }

    const customer = await this.client.customers.create({
      email,
      metadata: { digicode_user_id: String(userId) },
    });

    await this.env.DB
      .prepare(
        `INSERT INTO subscriptions (user_id, status, plan_type, stripe_customer_id, provider)
         VALUES (?, 'free', 'free', ?, 'stripe')
         ON CONFLICT(user_id) DO UPDATE SET
           stripe_customer_id = excluded.stripe_customer_id,
           provider = COALESCE(subscriptions.provider, 'stripe'),
           updated_at = datetime('now')`,
      )
      .bind(userId, customer.id)
      .run();

    return customer.id;
  }
}

function lookupStripePriceId(env: Bindings, planId: PlanId): string | undefined {
  switch (planId) {
    case 'lite':
      return env.STRIPE_PRICE_LITE;
    case 'pro':
      return env.STRIPE_PRICE_PRO;
    case 'enterprise':
      return env.STRIPE_PRICE_ENTERPRISE;
    case 'free':
    default:
      return undefined;
  }
}
