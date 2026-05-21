import { describe, it, expect, vi } from 'vitest';
import { countryMiddleware } from '../country';

/**
 * Build a minimal Hono-shaped context for the middleware. We avoid
 * spinning a real Hono app — that would require pulling in the whole
 * route tree just to set a single header.
 */
function buildCtx(opts: {
  header?: string;
  user?: { userId: number; email: string };
  dbRunSpy?: ReturnType<typeof vi.fn>;
}) {
  const store: Record<string, unknown> = {};
  const waitedPromises: Promise<unknown>[] = [];

  const run = opts.dbRunSpy ?? vi.fn().mockResolvedValue({ meta: { changes: 1 } });

  const ctx = {
    req: {
      header: vi.fn((name: string) => (name === 'CF-IPCountry' ? opts.header : undefined)),
    },
    set: vi.fn((k: string, v: unknown) => {
      store[k] = v;
    }),
    get: vi.fn((k: string) => {
      if (k === 'user') return opts.user;
      return store[k];
    }),
    env: {
      DB: {
        prepare: vi.fn(() => ({
          bind: vi.fn(() => ({ run })),
        })),
      },
    },
    executionCtx: {
      waitUntil: vi.fn((p: Promise<unknown>) => {
        waitedPromises.push(p);
      }),
    },
  };

  return { ctx, store, waitedPromises, run };
}

describe('countryMiddleware — header → context', () => {
  it('sets country to uppercase JP', async () => {
    const { ctx, store } = buildCtx({ header: 'jp' });
    // @ts-expect-error — minimal-shape Context is fine for the middleware contract
    await countryMiddleware(ctx, async () => {});
    expect(store.country).toBe('JP');
  });

  it('sets country to null when header absent', async () => {
    const { ctx, store } = buildCtx({});
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    expect(store.country).toBeNull();
  });

  it('sets XX through unchanged (factory will fallback)', async () => {
    const { ctx, store } = buildCtx({ header: 'XX' });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    expect(store.country).toBe('XX');
  });

  it('sets T1 through unchanged (factory will fallback)', async () => {
    const { ctx, store } = buildCtx({ header: 'T1' });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    expect(store.country).toBe('T1');
  });

  it('rejects malformed header values', async () => {
    for (const bad of ['', 'X', 'XXX', '!!', 'jp!', '日本']) {
      const { ctx, store } = buildCtx({ header: bad });
      // @ts-expect-error
      await countryMiddleware(ctx, async () => {});
      expect(store.country).toBeNull();
    }
  });
});

describe('countryMiddleware — observability D1 write', () => {
  it('schedules D1 update for an authenticated user with real country', async () => {
    const dbRun = vi.fn().mockResolvedValue({ meta: { changes: 1 } });
    const { ctx, waitedPromises } = buildCtx({
      header: 'US',
      user: { userId: 7, email: 'a@example.com' },
      dbRunSpy: dbRun,
    });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    expect(ctx.executionCtx.waitUntil).toHaveBeenCalledOnce();
    await Promise.all(waitedPromises);
    expect(dbRun).toHaveBeenCalledOnce();
  });

  it('does NOT schedule a write when there is no authenticated user', async () => {
    const dbRun = vi.fn();
    const { ctx } = buildCtx({ header: 'US', dbRunSpy: dbRun });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    expect(ctx.executionCtx.waitUntil).not.toHaveBeenCalled();
    expect(dbRun).not.toHaveBeenCalled();
  });

  it('does NOT write for XX', async () => {
    const dbRun = vi.fn();
    const { ctx } = buildCtx({
      header: 'XX',
      user: { userId: 7, email: 'a@example.com' },
      dbRunSpy: dbRun,
    });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    expect(ctx.executionCtx.waitUntil).not.toHaveBeenCalled();
  });

  it('does NOT write for T1', async () => {
    const dbRun = vi.fn();
    const { ctx } = buildCtx({
      header: 'T1',
      user: { userId: 7, email: 'a@example.com' },
      dbRunSpy: dbRun,
    });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    expect(ctx.executionCtx.waitUntil).not.toHaveBeenCalled();
  });
});
