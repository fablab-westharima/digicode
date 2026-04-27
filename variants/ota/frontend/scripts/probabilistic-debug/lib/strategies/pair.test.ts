import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../catalog';
import { generatePairCases } from './pair';

const cat = loadCatalog();

describe('generatePairCases (defaults)', () => {
  const cases = generatePairCases(cat);

  it('emits a meaningful number of pair cases under the 200 cap', () => {
    expect(cases.length).toBeLessThanOrEqual(200);
    expect(cases.length).toBeGreaterThan(150);
  });

  it('every case is tagged with strategy="pair"', () => {
    for (const c of cases) expect(c.strategy).toBe('pair');
  });

  it('case ids are zero-padded sequential starting at case_0001', () => {
    expect(cases[0].id).toBe('case_0001');
    for (let i = 0; i < cases.length; i++) {
      expect(cases[i].id).toBe(`case_${String(i + 1).padStart(4, '0')}`);
    }
  });

  it('every case xml contains both arduino_setup and arduino_loop', () => {
    for (const c of cases) {
      expect(c.xml).toContain('type="arduino_setup"');
      expect(c.xml).toContain('type="arduino_loop"');
    }
  });

  it('every case has at least 3 distinct block types (setup + loop + ≥1 pair member)', () => {
    for (const c of cases) {
      // arduino_setup and arduino_loop are always present; the pair adds 1+.
      expect(c.blocksUsed.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('mode is always one shared by both pair members', () => {
    // Spot-check: most pairs end up in all_blocks since it includes everything.
    const allBlocksCount = cases.filter((c) => c.mode === 'all_blocks').length;
    expect(allBlocksCount).toBe(cases.length);
  });
});

describe('generatePairCases — custom options', () => {
  it('honours maxCount and startIndex', () => {
    const cases = generatePairCases(cat, {
      maxCount: 5,
      startIndex: 200,
    });
    expect(cases.length).toBe(5);
    expect(cases[0].id).toBe('case_0200');
    expect(cases[4].id).toBe('case_0204');
  });
});

describe('generatePairCases — auto-derived init/use pairs', () => {
  it('contains expected sensor init+use pairs', () => {
    const cases = generatePairCases(cat);
    const labels = cases.map((c) => c.blocksUsed.join('|'));
    // dht_init + dht_temperature
    const hasDht = labels.some(
      (l) => l.includes('dht_init') && l.includes('dht_temperature'),
    );
    expect(hasDht).toBe(true);
    // ultrasonic_init + ultrasonic_distance
    const hasUltra = labels.some(
      (l) =>
        l.includes('ultrasonic_init') && l.includes('ultrasonic_distance'),
    );
    expect(hasUltra).toBe(true);
  });
});
