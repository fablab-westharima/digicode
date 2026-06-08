/**
 * LemonSqueezyProvider — native-fetch wrapper over the LemonSqueezy REST API.
 *
 * Mirrors PolarProvider's design (plan 58 / Session 163 Phase ②): we talk to
 * the REST API directly with `fetch` + `Authorization: Bearer` rather than
 * adopting `@lemonsqueezy/lemonsqueezy.js`, sidestepping the lib-adoption-
 * protocol license verification and any Workers-compatibility uncertainty —
 * the same call made for Polar.
 *
 * LemonSqueezy uses the JSON:API media type (`application/vnd.api+json`) for
 * both request and response bodies.
 *
 * Endpoints covered:
 *   POST {base}/checkouts        — checkout session creation
 *   GET  {base}/customers/{id}   — portal URL read (urls.customer_portal)
 *
 * where {base} = https://api.lemonsqueezy.com/v1.
 *
 * Portal note: unlike Stripe/Polar there is NO "create portal session" call.
 * The customer portal URL is a property of the Customer object
 * (`attributes.urls.customer_portal`, ~24h validity). `createPortalSession`
 * therefore reads it via the customer id; `PortalOptions.returnUrl` has no
 * LemonSqueezy equivalent and is intentionally ignored.
 */

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

const BASE = 'https://api.lemonsqueezy.com/v1';
const JSON_API = 'application/vnd.api+json';

interface LsCheckoutResponse {
  data: { id: string; attributes: { url: string } };
}

interface LsCustomerResponse {
  data: { id: string; attributes: { urls?: { customer_portal?: string } } };
}

export class LemonSqueezyProvider implements PaymentProvider {
  readonly id = 'lemonsqueezy' as const;
  private readonly apiKey: string;
  private readonly storeId: string | undefined;
  private readonly testMode: boolean;
  private readonly env: Bindings;

  constructor(env: Bindings) {
    if (!env.LEMONSQUEEZY_API_KEY) {
      throw new PaymentProviderError(
        'subscription.providerError',
        'LEMONSQUEEZY_API_KEY is not configured',
      );
    }
    this.apiKey = env.LEMONSQUEEZY_API_KEY;
    this.storeId = env.LEMONSQUEEZY_STORE_ID;
    // test_mode is per-object on LemonSqueezy; we stamp every checkout we create.
    this.testMode = env.LEMONSQUEEZY_TEST_MODE === 'true';
    this.env = env;
  }

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
    const variantId = resolveLsVariantId(this.env, opts.planId);
    if (!variantId) {
      throw new PaymentProviderError(
        'subscription.priceNotConfigured',
        `LEMONSQUEEZY_VARIANT_${opts.planId.toUpperCase()} is not set`,
      );
    }
    if (!this.storeId) {
      throw new PaymentProviderError(
        'subscription.priceNotConfigured',
        'LEMONSQUEEZY_STORE_ID is not set',
      );
    }

    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          // `custom` round-trips back on the webhook as meta.custom_data.
          // NOTE: LemonSqueezy returns custom values as STRINGS, so we send
          // the user id as a string and parse it back on the webhook side.
          checkout_data: {
            email: opts.email,
            custom: { user_id: String(opts.userId) },
          },
          product_options: {
            redirect_url: `${opts.origin}/plan?result=success`,
          },
          test_mode: this.testMode,
        },
        relationships: {
          store: { data: { type: 'stores', id: this.storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    };

    const res = await this.request<LsCheckoutResponse>(
      'POST',
      '/checkouts',
      body,
      'subscription.checkoutFailed',
    );

    const url = res.data?.attributes?.url;
    if (!url) {
      throw new PaymentProviderError(
        'subscription.checkoutFailed',
        'LemonSqueezy returned a checkout without a url',
      );
    }
    return { url, sessionId: res.data.id, provider: 'lemonsqueezy' };
  }

  async createPortalSession(opts: PortalOptions): Promise<PortalResult> {
    // returnUrl intentionally unused — LS portal URL has no return concept.
    const res = await this.request<LsCustomerResponse>(
      'GET',
      `/customers/${opts.customerId}`,
      undefined,
      'subscription.portalSessionFailed',
    );
    const url = res.data?.attributes?.urls?.customer_portal;
    if (!url) {
      throw new PaymentProviderError(
        'subscription.portalSessionFailed',
        'LemonSqueezy customer has no customer_portal url',
      );
    }
    return { url };
  }

  /**
   * Centralized request with Bearer auth + JSON:API headers + error mapping.
   * Body is omitted for GET. LemonSqueezy returns 4xx/5xx with a JSON:API
   * error body; we log it via PaymentProviderError.cause (server-side only)
   * and surface a stable i18n code to the route (never the upstream body).
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    errorCode: string,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: JSON_API,
          ...(body !== undefined ? { 'Content-Type': JSON_API } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new PaymentProviderError(
        errorCode,
        `LemonSqueezy ${path} request failed (network)`,
        err,
      );
    }

    if (!res.ok) {
      let detail: unknown;
      try {
        detail = await res.json();
      } catch {
        detail = await res.text().catch(() => '<unreadable>');
      }
      throw new PaymentProviderError(
        errorCode,
        `LemonSqueezy ${path} returned HTTP ${res.status}`,
        detail,
      );
    }

    try {
      return (await res.json()) as T;
    } catch (err) {
      throw new PaymentProviderError(
        errorCode,
        `LemonSqueezy ${path} response was not valid JSON`,
        err,
      );
    }
  }
}

/**
 * Resolve a DigiCode planId to the LemonSqueezy variant id configured via
 * Workers secrets (`wrangler secret put LEMONSQUEEZY_VARIANT_LITE` etc.).
 * Exported so the unit test can verify the mapping without instantiating
 * the provider.
 */
export function resolveLsVariantId(env: Bindings, planId: PlanId): string | undefined {
  switch (planId) {
    case 'lite':
      return env.LEMONSQUEEZY_VARIANT_LITE;
    case 'pro':
      return env.LEMONSQUEEZY_VARIANT_PRO;
    case 'enterprise':
      return env.LEMONSQUEEZY_VARIANT_ENTERPRISE;
    case 'free':
    default:
      return undefined;
  }
}

/**
 * Reverse map: LemonSqueezy variant id → DigiCode planId. Used by the webhook
 * normalizer to derive `planId` from the event's variant_id. Returns null if
 * the variant is not one we own (event for a product we do not sell → ignore).
 */
export function resolvePlanFromLsVariantId(
  env: Bindings,
  variantId: string | null,
): PlanId | null {
  if (!variantId) return null;
  if (variantId === env.LEMONSQUEEZY_VARIANT_LITE) return 'lite';
  if (variantId === env.LEMONSQUEEZY_VARIANT_PRO) return 'pro';
  if (variantId === env.LEMONSQUEEZY_VARIANT_ENTERPRISE) return 'enterprise';
  return null;
}
