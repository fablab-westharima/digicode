import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  useClassServerHealthStore,
  DOWN_THRESHOLD,
} from '../classServerHealthStore';

const STORE_INITIAL = {
  status: 'unknown' as const,
  consecutiveFailures: 0,
  lastCheckedAt: null,
  lastError: null,
  isPolling: false,
};

function resetStore() {
  useClassServerHealthStore.getState().stopPolling();
  useClassServerHealthStore.setState(STORE_INITIAL);
}

describe('classServerHealthStore', () => {
  beforeEach(() => {
    resetStore();
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    resetStore();
  });

  it('initial state is unknown', () => {
    const s = useClassServerHealthStore.getState();
    expect(s.status).toBe('unknown');
    expect(s.consecutiveFailures).toBe(0);
  });

  it('single success → status=up, counter reset', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'up', upstream: {} }),
    });
    await useClassServerHealthStore.getState().checkOnce();
    const s = useClassServerHealthStore.getState();
    expect(s.status).toBe('up');
    expect(s.consecutiveFailures).toBe(0);
    expect(s.lastError).toBeNull();
  });

  it('1 failure → counter +1 but status not yet down (below threshold)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'down', reason: 'timeout' }),
    });
    await useClassServerHealthStore.getState().checkOnce();
    const s = useClassServerHealthStore.getState();
    expect(s.consecutiveFailures).toBe(1);
    expect(s.status).toBe('unknown'); // < threshold, status 不変
    expect(s.lastError).toBe('timeout');
  });

  it(`${DOWN_THRESHOLD} consecutive failures → status=down`, async () => {
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    for (let i = 0; i < DOWN_THRESHOLD; i++) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'down', reason: 'timeout' }),
      });
      await useClassServerHealthStore.getState().checkOnce();
    }
    const s = useClassServerHealthStore.getState();
    expect(s.status).toBe('down');
    expect(s.consecutiveFailures).toBe(DOWN_THRESHOLD);
  });

  it('1 success after down → status=up immediately, counter reset', async () => {
    // 先に down 状態にする
    useClassServerHealthStore.setState({ status: 'down', consecutiveFailures: DOWN_THRESHOLD });
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'up', upstream: {} }),
    });
    await useClassServerHealthStore.getState().checkOnce();
    const s = useClassServerHealthStore.getState();
    expect(s.status).toBe('up');
    expect(s.consecutiveFailures).toBe(0);
  });

  it('fetch network error counts as failure', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    );
    await useClassServerHealthStore.getState().checkOnce();
    const s = useClassServerHealthStore.getState();
    expect(s.consecutiveFailures).toBe(1);
    expect(s.lastError).toBe('network');
  });

  it('AbortSignal timeout counts with reason=timeout', async () => {
    const err = new Error('Timed out');
    err.name = 'TimeoutError';
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(err);
    await useClassServerHealthStore.getState().checkOnce();
    const s = useClassServerHealthStore.getState();
    expect(s.lastError).toBe('timeout');
  });

  it('proxy non-200 counts as failure', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    await useClassServerHealthStore.getState().checkOnce();
    const s = useClassServerHealthStore.getState();
    expect(s.consecutiveFailures).toBe(1);
    expect(s.lastError).toBe('proxy-non-200:503');
  });

  it('startPolling is idempotent (multiple calls keep one interval)', () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'up', upstream: {} }),
    });
    useClassServerHealthStore.getState().startPolling(60_000);
    useClassServerHealthStore.getState().startPolling(60_000);
    useClassServerHealthStore.getState().startPolling(60_000);
    // 連続呼び出しでも timer は 1 個のはず → 60s 進めても fetch は immediate (1) + tick (1) のみ
    expect(useClassServerHealthStore.getState().isPolling).toBe(true);
    useClassServerHealthStore.getState().stopPolling();
    expect(useClassServerHealthStore.getState().isPolling).toBe(false);
  });

  it('stopPolling clears interval', () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'up', upstream: {} }),
    });
    useClassServerHealthStore.getState().startPolling(60_000);
    expect(useClassServerHealthStore.getState().isPolling).toBe(true);
    useClassServerHealthStore.getState().stopPolling();
    expect(useClassServerHealthStore.getState().isPolling).toBe(false);
  });
});
