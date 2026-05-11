import { create } from 'zustand';

const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

export const DEFAULT_POLL_INTERVAL_MS = 60_000;

// 1 回失敗で即 down にすると network blip で誤検知頻発、3 回だと検知遅延 3 分。
// 2 連続失敗 = 60-120s 遅延、blip 許容と実 down 蓋然性のバランス点 (D-7 採択)。
export const DOWN_THRESHOLD = 2;

export type ClassServerStatus = 'unknown' | 'up' | 'down';

interface ClassServerHealthState {
  status: ClassServerStatus;
  consecutiveFailures: number;
  lastCheckedAt: number | null;
  lastError: string | null;
  isPolling: boolean;

  checkOnce: () => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
}

// 単一 interval を維持する module-level singleton。多重起動防止。
let intervalId: ReturnType<typeof setInterval> | null = null;

export const useClassServerHealthStore = create<ClassServerHealthState>((set, get) => ({
  status: 'unknown',
  consecutiveFailures: 0,
  lastCheckedAt: null,
  lastError: null,
  isPolling: false,

  checkOnce: async () => {
    const now = Date.now();
    try {
      const res = await fetch(`${API_URL}/api/health/class-server`, {
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const failures = get().consecutiveFailures + 1;
        set({
          consecutiveFailures: failures,
          lastCheckedAt: now,
          lastError: `proxy-non-200:${res.status}`,
          status: failures >= DOWN_THRESHOLD ? 'down' : get().status,
        });
        return;
      }

      const body = (await res.json()) as { status: 'up' | 'down'; reason?: string };
      if (body.status === 'up') {
        // 1 回成功で up 復帰、連続失敗カウンタ reset (D-7)
        set({
          status: 'up',
          consecutiveFailures: 0,
          lastCheckedAt: now,
          lastError: null,
        });
        return;
      }

      const failures = get().consecutiveFailures + 1;
      set({
        consecutiveFailures: failures,
        lastCheckedAt: now,
        lastError: body.reason ?? 'down',
        status: failures >= DOWN_THRESHOLD ? 'down' : get().status,
      });
    } catch (err) {
      const failures = get().consecutiveFailures + 1;
      const reason = err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'network';
      set({
        consecutiveFailures: failures,
        lastCheckedAt: now,
        lastError: reason,
        status: failures >= DOWN_THRESHOLD ? 'down' : get().status,
      });
    }
  },

  startPolling: (intervalMs = DEFAULT_POLL_INTERVAL_MS) => {
    if (intervalId !== null) return;
    set({ isPolling: true });
    void get().checkOnce();
    intervalId = setInterval(() => {
      void get().checkOnce();
    }, intervalMs);
  },

  stopPolling: () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    set({ isPolling: false });
  },
}));
