/**
 * PolarProvider — native-fetch wrapper over Polar.sh REST API.
 *
 * The @polar-sh/sdk package was rejected during lib-adoption-protocol
 * verify (no LICENSE file in repo or npm tarball, `license: null` in
 * GitHub API; see Phase 3 P3-1 task). This class talks to the REST API
 * directly using `fetch` + `Authorization: Bearer` to side-step the
 * license question and the SDK's lack of explicit Cloudflare Workers
 * support claim.
 *
 * Endpoints covered:
 *   POST {base}/checkouts/         — checkout session creation
 *   POST {base}/customer-sessions/ — customer portal session creation
 *
 * Where {base} =
 *   https://api.polar.sh/v1          (POLAR_SERVER_MODE='production')
 *   https://sandbox-api.polar.sh/v1  (POLAR_SERVER_MODE='sandbox', default)
 *
 * Auth model: a single Organization Access Token (`polar_oat_…`) issued
 * from the Polar dashboard. We never see Customer Access Tokens — those
 * are returned by `/v1/customer-sessions/` and consumed client-side by
 * the customer portal page.
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

const PROD_BASE = 'https://api.polar.sh/v1';
const SANDBOX_BASE = 'https://sandbox-api.polar.sh/v1';

interface PolarCheckoutResponse {
  id: string;
  url: string;
  status: 'open' | 'expired' | 'confirmed' | 'succeeded' | 'failed';
}

interface PolarCustomerSessionResponse {
  id: string;
  customer_portal_url: string;
  customer_id: string;
  expires_at: string;
}

export class PolarProvider implements PaymentProvider {
  readonly id = 'polar' as const;
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly env: Bindings;

  constructor(env: Bindings) {
    if (!env.POLAR_ACCESS_TOKEN) {
      throw new PaymentProviderError(
        'subscription.providerError',
        'POLAR_ACCESS_TOKEN is not configured',
      );
    }
    this.accessToken = env.POLAR_ACCESS_TOKEN;
    this.baseUrl = env.POLAR_SERVER_MODE === 'production' ? PROD_BASE : SANDBOX_BASE;
    this.env = env;
  }

  async createCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
    const productId = resolvePolarProductId(this.env, opts.planId);
    if (!productId) {
      throw new PaymentProviderError(
        'subscription.priceNotConfigured',
        `POLAR_PRODUCT_${opts.planId.toUpperCase()} is not set`,
      );
    }

    const response = await this.post<PolarCheckoutResponse>(
      '/checkouts/',
      {
        products: [productId],
        customer_email: opts.email,
        external_customer_id: String(opts.userId),
        success_url: `${opts.origin}/plan?result=success`,
        metadata: {
          digicode_user_id: String(opts.userId),
          plan_id: opts.planId,
        },
      },
      'subscription.checkoutFailed',
    );

    return { url: response.url, sessionId: response.id, provider: 'polar' };
  }

  async createPortalSession(opts: PortalOptions): Promise<PortalResult> {
    const response = await this.post<PolarCustomerSessionResponse>(
      '/customer-sessions/',
      {
        customer_id: opts.customerId,
        return_url: opts.returnUrl,
      },
      'subscription.portalSessionFailed',
    );

    return { url: response.customer_portal_url };
  }

  /**
   * Centralized POST with auth header + error mapping. Polar returns
   * 4xx/5xx with a JSON body; we log it via PaymentProviderError.cause
   * (server-side log only) and surface a stable i18n code to the route.
   */
  private async post<T>(
    path: string,
    body: unknown,
    errorCode: string,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new PaymentProviderError(
        errorCode,
        `Polar ${path} request failed (network)`,
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
        `Polar ${path} returned HTTP ${res.status}`,
        detail,
      );
    }

    try {
      return (await res.json()) as T;
    } catch (err) {
      throw new PaymentProviderError(
        errorCode,
        `Polar ${path} response was not valid JSON`,
        err,
      );
    }
  }
}

/**
 * Resolve a DigiCode planId to the Polar product UUID configured via
 * Workers env vars. Plan owners set these once per environment with
 * `wrangler secret put POLAR_PRODUCT_LITE` etc.
 *
 * Exported as a free function so the unit test can verify the env →
 * UUID mapping without instantiating the whole provider.
 */
export function resolvePolarProductId(env: Bindings, planId: PlanId): string | undefined {
  switch (planId) {
    case 'lite':
      return env.POLAR_PRODUCT_LITE;
    case 'pro':
      return env.POLAR_PRODUCT_PRO;
    case 'enterprise':
      return env.POLAR_PRODUCT_ENTERPRISE;
    case 'free':
    default:
      return undefined;
  }
}

/**
 * Reverse map: Polar product UUID → DigiCode planId. Used by the
 * webhook normalizer to derive `planId` from `subscription.product_id`.
 * Returns null if the UUID is not configured (event for a product we
 * do not own → log + ignore).
 */
export function resolvePlanFromPolarProductId(
  env: Bindings,
  productId: string | null,
): PlanId | null {
  if (!productId) return null;
  if (productId === env.POLAR_PRODUCT_LITE) return 'lite';
  if (productId === env.POLAR_PRODUCT_PRO) return 'pro';
  if (productId === env.POLAR_PRODUCT_ENTERPRISE) return 'enterprise';
  return null;
}
