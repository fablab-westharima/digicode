import { describe, it, expect } from 'vitest';
import { selectSpotCases } from './sampling';
import type { Manifest, ManifestEntry, Strategy } from './case-types';

const ALL_STRATEGIES: ReadonlyArray<Strategy> = [
  'singleton',
  'pair',
  'template',
  'matrix',
  'edge',
  'combo',
];

interface SyntheticSpec {
  boardId: string;
  /** Number of cases per strategy. Missing strategies = 0 cases. */
  perStrategy: Partial<Record<Strategy, number>>;
}

function buildManifest(specs: SyntheticSpec[]): Manifest {
  const cases: ManifestEntry[] = [];
  let seq = 0;
  for (const spec of specs) {
    for (const strat of ALL_STRATEGIES) {
      const n = spec.perStrategy[strat] ?? 0;
      for (let i = 0; i < n; i++) {
        const id = `case_${String(seq++).padStart(4, '0')}`;
        cases.push({
          id,
          strategy: strat,
          mode: 'all_blocks',
          boardId: spec.boardId,
          blocksUsed: [],
          fileName: `${id}.xml`,
        });
      }
    }
  }
  return {
    generatorVersion: 'test',
    catalogHash: 'test',
    catalogBlockCount: 0,
    generatedAt: new Date().toISOString(),
    seed: 0,
    count: cases.length,
    cases,
  };
}

describe('selectSpotCases', () => {
  it('round-robin: 16 boards × 6 strategies returns 80 cases (5 per board)', () => {
    const specs: SyntheticSpec[] = Array.from({ length: 16 }, (_, i) => ({
      boardId: `board-${i}`,
      perStrategy: {
        singleton: 5,
        pair: 5,
        template: 5,
        matrix: 5,
        edge: 5,
        combo: 5,
      },
    }));
    const manifest = buildManifest(specs);
    const sampled = selectSpotCases(manifest, { sampleSize: 80 });
    expect(sampled).toHaveLength(80);
    // Each board should appear exactly 5 times.
    const counts = new Map<string, number>();
    for (const c of sampled) counts.set(c.boardId, (counts.get(c.boardId) ?? 0) + 1);
    expect(counts.size).toBe(16);
    for (const n of counts.values()) expect(n).toBe(5);
    // Strategy spread for board-0: should hit at least 5 distinct strategies
    // out of 6 (the round-robin picks one per strategy until cap=5, leaving
    // exactly one strategy uncovered).
    const board0Strats = new Set(
      sampled.filter((c) => c.boardId === 'board-0').map((c) => c.strategy),
    );
    expect(board0Strats.size).toBe(5);
  });

  it('boards with fewer strategies fall back to Pass-2 fill', () => {
    // board-A only has 3 strategies, but each has multiple cases.
    const manifest = buildManifest([
      {
        boardId: 'board-A',
        perStrategy: { singleton: 3, pair: 3, template: 3 },
      },
      {
        boardId: 'board-B',
        perStrategy: {
          singleton: 1,
          pair: 1,
          template: 1,
          matrix: 1,
          edge: 1,
          combo: 1,
        },
      },
    ]);
    const sampled = selectSpotCases(manifest, { sampleSize: 100 });
    // board-A: Pass 1 picks 1 from each of 3 strategies, Pass 2 fills the
    // remaining 2 slots from any non-empty queue → 5 total.
    const aCount = sampled.filter((c) => c.boardId === 'board-A').length;
    expect(aCount).toBe(5);
    // board-B: 6 strategies × 1 case each, cap=5 → 5 picks (one strategy
    // intentionally skipped).
    const bCount = sampled.filter((c) => c.boardId === 'board-B').length;
    expect(bCount).toBe(5);
    expect(sampled).toHaveLength(10);
  });

  it('respects sampleSize cap (16 → 1 per board across 16 boards)', () => {
    const specs: SyntheticSpec[] = Array.from({ length: 16 }, (_, i) => ({
      boardId: `board-${i}`,
      perStrategy: { singleton: 5, pair: 5, template: 5 },
    }));
    const manifest = buildManifest(specs);
    const sampled = selectSpotCases(manifest, { sampleSize: 16 });
    expect(sampled).toHaveLength(16);
    const counts = new Map<string, number>();
    for (const c of sampled) counts.set(c.boardId, (counts.get(c.boardId) ?? 0) + 1);
    // Each of the 16 boards gets exactly one slot.
    expect(counts.size).toBe(16);
    for (const n of counts.values()) expect(n).toBe(1);
  });

  it('is deterministic: same manifest yields identical picks across runs', () => {
    const manifest = buildManifest([
      {
        boardId: 'board-A',
        perStrategy: {
          singleton: 5,
          pair: 5,
          template: 5,
          matrix: 5,
          edge: 5,
          combo: 5,
        },
      },
      {
        boardId: 'board-B',
        perStrategy: { singleton: 3, pair: 3 },
      },
    ]);
    const a = selectSpotCases(manifest, { sampleSize: 80 });
    const b = selectSpotCases(manifest, { sampleSize: 80 });
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});
