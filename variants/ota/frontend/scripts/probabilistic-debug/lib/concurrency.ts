/**
 * concurrency.ts — small worker-pool helper shared by `orchestrator.ts`
 * (Stage 1 / 4) and `stage2-validate-fragments.ts` (Stage 2).
 *
 * Extracted from `orchestrator.ts` so Stage 2 can reuse the same fixed-pool
 * pattern without importing `orchestrator.ts`'s CLI auto-run guard (which
 * fires on `--in` and would race with Stage 2's own CLI).
 */

/**
 * Process `items` through `worker` with at most `concurrency` calls in
 * flight. Resolves once every item has been visited exactly once.
 *
 * - `concurrency < 1` is floored to 1 (serial execution).
 * - Order of completion is not guaranteed; use `worker`'s second arg for
 *   the original index when needed.
 */
export async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  async function loop(): Promise<void> {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  }
  const lanes = Array.from({ length: Math.max(1, concurrency) }, () => loop());
  await Promise.all(lanes);
}
