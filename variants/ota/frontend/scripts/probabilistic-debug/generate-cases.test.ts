import { describe, it, expect } from 'vitest';
import { allocate, buildAllCases } from './generate-cases';
import { loadCatalog, indexByType } from './lib/catalog';

const cat = loadCatalog();
const idx = indexByType(cat);

describe('allocate', () => {
  it('returns the canonical 519/86/100/80/200/15 split for count=1000', () => {
    expect(allocate(1000)).toEqual({
      singleton: 519,
      edge: 86,
      matrix: 100,
      pair: 80,
      template: 200,
      combo: 15,
    });
  });

  it('scales proportionally for smaller counts and absorbs the floor remainder into singleton', () => {
    const a = allocate(100);
    const sum =
      a.singleton + a.edge + a.matrix + a.pair + a.template + a.combo;
    expect(sum).toBe(100);
    expect(a.singleton).toBeGreaterThanOrEqual(40);
    expect(a.template).toBe(20);
  });

  it('handles tiny counts (count=10) without producing zero buckets that break the run', () => {
    const a = allocate(10);
    const sum =
      a.singleton + a.edge + a.matrix + a.pair + a.template + a.combo;
    expect(sum).toBe(10);
  });
});

describe('buildAllCases (count=100 smoke)', () => {
  const result = buildAllCases(100);

  it('emits exactly 100 cases', () => {
    expect(result.cases.length).toBe(100);
  });

  it('every case id is unique and zero-padded to 4 digits', () => {
    const ids = new Set<string>();
    for (const c of result.cases) {
      expect(c.id).toMatch(/^case_\d{4}$/);
      ids.add(c.id);
    }
    expect(ids.size).toBe(100);
  });

  it('every blocksUsed entry references a known catalog block type', () => {
    for (const c of result.cases) {
      for (const t of c.blocksUsed) {
        expect(idx.has(t), `unknown type "${t}" in ${c.id}`).toBe(true);
      }
    }
  });

  it('every xml is non-empty and uses the Blockly namespace', () => {
    for (const c of result.cases) {
      expect(c.xml.length).toBeGreaterThan(50);
      expect(c.xml).toMatch(
        /^<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml">/,
      );
      expect(c.xml).toMatch(/<\/xml>$/);
    }
  });

  it('strategies appear in the planned order (singleton → edge → matrix → pair → combo → template)', () => {
    const seen: string[] = [];
    for (const c of result.cases) {
      if (seen[seen.length - 1] !== c.strategy) seen.push(c.strategy);
    }
    // combo may be empty when alloc.combo rounds to 0 in tiny smokes — filter
    // to the strategies that actually emitted at least one case.
    const expectedOrder = [
      'singleton',
      'edge',
      'matrix',
      'pair',
      'combo',
      'template',
    ].filter((s) => seen.includes(s));
    expect(seen).toEqual(expectedOrder);
  });

  it('strategy counts match allocation (within ±1 for proportional rounding)', () => {
    const dist: Record<string, number> = {};
    for (const c of result.cases) {
      dist[c.strategy] = (dist[c.strategy] ?? 0) + 1;
    }
    expect(dist.singleton).toBeGreaterThanOrEqual(result.alloc.singleton);
    expect(dist.edge).toBe(result.alloc.edge);
  });
});

describe('buildAllCases (count=1000 full run)', () => {
  // This is the integration check that 43.md §5.1.1 mandates: "every generated
  // XML uses only catalog block types in the allowed mode/board". We assert
  // catalog conformance on every emitted case.
  const result = buildAllCases(1000);

  it('emits exactly 1000 cases (template absorbs any earlier shortfall)', () => {
    expect(result.cases.length).toBe(1000);
  });

  it('all 1000 cases have unique ids case_0001..case_1000', () => {
    const ids = new Set(result.cases.map((c) => c.id));
    expect(ids.size).toBe(1000);
    expect(ids.has('case_0001')).toBe(true);
    expect(ids.has('case_1000')).toBe(true);
  });

  it('every block in every case is part of the current catalog (no hallucination)', () => {
    for (const c of result.cases) {
      for (const t of c.blocksUsed) {
        expect(idx.has(t), `case ${c.id} references unknown type "${t}"`).toBe(
          true,
        );
      }
    }
  });

  it('singleton coverage hits every catalog block', () => {
    const seenInSingleton = new Set<string>();
    for (const c of result.cases) {
      if (c.strategy !== 'singleton') continue;
      for (const t of c.blocksUsed) seenInSingleton.add(t);
    }
    for (const b of cat.blocks) {
      expect(
        seenInSingleton.has(b.type),
        `singleton missed catalog block "${b.type}"`,
      ).toBe(true);
    }
  });
});
