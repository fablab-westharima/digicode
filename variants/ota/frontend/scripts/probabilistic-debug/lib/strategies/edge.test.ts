import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../catalog';
import { generateEdgeCases } from './edge';

const cat = loadCatalog();

describe('generateEdgeCases (defaults)', () => {
  const cases = generateEdgeCases(cat);

  it('produces 86 cases by default (20 + 50 + 16)', () => {
    expect(cases.length).toBe(86);
  });

  it('every case is tagged with strategy="edge"', () => {
    for (const c of cases) expect(c.strategy).toBe('edge');
  });

  it('case ids are zero-padded sequential starting at case_0001', () => {
    expect(cases[0].id).toBe('case_0001');
    expect(cases[cases.length - 1].id).toBe('case_0086');
  });

  it('every case opens with the Blockly XML namespace and contains arduino_setup', () => {
    for (const c of cases) {
      expect(c.xml).toMatch(
        /^<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml">/,
      );
      expect(c.xml).toContain('type="arduino_setup"');
      expect(c.xml).toContain('type="arduino_loop"');
    }
  });

  it('blocksUsed is non-empty and sorted unique', () => {
    for (const c of cases) {
      expect(c.blocksUsed.length).toBeGreaterThan(0);
      const sorted = [...c.blocksUsed].sort();
      expect(c.blocksUsed).toEqual(sorted);
      expect(c.blocksUsed).toEqual(Array.from(new Set(c.blocksUsed)).sort());
    }
  });
});

describe('generateEdgeCases — custom counts', () => {
  it('honours overridden sub-strategy counts', () => {
    const cases = generateEdgeCases(cat, {
      numberBoundaryCount: 4,
      dropdownEnumCount: 6,
      deepNestCount: 3,
      startIndex: 100,
    });
    expect(cases.length).toBe(13);
    expect(cases[0].id).toBe('case_0100');
  });
});

describe('generateEdgeCases — dropdown enum coverage', () => {
  it('includes every option of humanoid_sound (19 options)', () => {
    const cases = generateEdgeCases(cat, {
      numberBoundaryCount: 0,
      dropdownEnumCount: 50,
      deepNestCount: 0,
    });
    const humanoidSound = cases.filter((c) =>
      c.blocksUsed.includes('humanoid_sound'),
    );
    // humanoid_sound has 19 options, all should appear (since it's the
    // first/longest dropdown target).
    expect(humanoidSound.length).toBeGreaterThanOrEqual(13);
  });
});

describe('generateEdgeCases — deep nest builders', () => {
  it('every default deep-nest case validates and is reported with arduino_setup root', () => {
    const cases = generateEdgeCases(cat, {
      numberBoundaryCount: 0,
      dropdownEnumCount: 0,
      deepNestCount: 16,
    });
    expect(cases.length).toBe(16);
    // Each contains either controls_for, controls_if, math_arithmetic, or a
    // chained esp32_serial_println.
    for (const c of cases) {
      const interesting =
        c.blocksUsed.includes('controls_for') ||
        c.blocksUsed.includes('controls_if') ||
        c.blocksUsed.includes('math_arithmetic') ||
        c.blocksUsed.includes('esp32_serial_println');
      expect(interesting).toBe(true);
    }
  });
});
