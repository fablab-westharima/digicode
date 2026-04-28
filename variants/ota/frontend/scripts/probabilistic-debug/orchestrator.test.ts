import { describe, it, expect } from 'vitest';
import { processWithConcurrency } from './orchestrator';

describe('processWithConcurrency', () => {
  it('processes every item once', async () => {
    const seen = new Set<number>();
    await processWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      seen.add(item);
    });
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('respects the concurrency limit', async () => {
    let inFlight = 0;
    let peak = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);
    await processWithConcurrency(items, 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(peak).toBeGreaterThanOrEqual(2);
  });

  it('handles empty input array', async () => {
    let count = 0;
    await processWithConcurrency<number>([], 4, async () => {
      count++;
    });
    expect(count).toBe(0);
  });

  it('handles concurrency=1 (serial execution)', async () => {
    const order: number[] = [];
    await processWithConcurrency([1, 2, 3], 1, async (item) => {
      order.push(item);
      await new Promise((r) => setTimeout(r, 1));
    });
    expect(order).toEqual([1, 2, 3]);
  });

  it('floors concurrency to at least 1', async () => {
    const seen: number[] = [];
    await processWithConcurrency([1, 2], 0, async (item) => {
      seen.push(item);
    });
    expect(seen.sort()).toEqual([1, 2]);
  });
});
