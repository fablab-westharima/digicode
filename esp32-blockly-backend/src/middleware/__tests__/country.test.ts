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
  // Explicit param types let the SQL/bind capture assertions read
  // `prepare.mock.calls[0][0]` and `bind.mock.calls[0]` with proper types
  // instead of `never[]`.
  const bind = vi.fn((..._args: unknown[]) => ({ run }));
  const prepare = vi.fn((_sql: string) => ({ bind }));

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
        prepare,
      },
    },
    executionCtx: {
      waitUntil: vi.fn((p: Promise<unknown>) => {
        waitedPromises.push(p);
      }),
    },
  };

  return { ctx, store, waitedPromises, run, prepare, bind };
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

describe('countryMiddleware — first-observed sticky guard (Phase 5 R-2)', () => {
  // Regression cluster: an earlier `IS NULL OR != ?` guard overwrote any
  // existing country_code whenever CF-IPCountry differed from the stored
  // value. That destroyed admin overrides (e.g. seeding 'US' on the Polar
  // overseas test account, then losing it when the user logged in from
  // JP) and broke the §6a.1 #5 "no automatic cross-provider switch"
  // contract. The fix is a NULL-only guard.
  //
  // These tests inspect the prepared SQL + bound arguments directly,
  // because the in-process mock cannot enforce a real D1 WHERE clause —
  // we have to verify the SQL the middleware would send is the one that
  // makes SQLite skip the UPDATE for non-NULL rows.
  it('prepares SQL with `country_code IS NULL` only (no inequality OR branch)', async () => {
    const { ctx, waitedPromises, prepare } = buildCtx({
      header: 'US',
      user: { userId: 7, email: 'a@example.com' },
    });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    await Promise.all(waitedPromises);

    expect(prepare).toHaveBeenCalledOnce();
    const sql = prepare.mock.calls[0][0];
    expect(sql).toMatch(/country_code IS NULL/);
    // The old broken form wrote `IS NULL OR country_code != ?`. Assert
    // the second branch is gone so the test fails fast on regression.
    expect(sql).not.toMatch(/!=/);
    expect(sql).not.toMatch(/<>/);
  });

  it('binds exactly two arguments (new country + userId, no inequality value)', async () => {
    const { ctx, waitedPromises, bind } = buildCtx({
      header: 'US',
      user: { userId: 42, email: 'b@example.com' },
    });
    // @ts-expect-error
    await countryMiddleware(ctx, async () => {});
    await Promise.all(waitedPromises);

    expect(bind).toHaveBeenCalledOnce();
    // The old broken form was .bind(country, userId, country) — three args.
    // The fixed form is .bind(country, userId) — two args.
    const args = bind.mock.calls[0];
    expect(args).toEqual(['US', 42]);
  });
});
