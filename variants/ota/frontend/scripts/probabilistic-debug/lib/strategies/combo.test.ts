import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../catalog';
import {
  generateComboCases,
  INIT_DEPENDENCIES,
  OPERATION_TO_INIT_MAP,
} from './combo';

const cat = loadCatalog();

describe('INIT_DEPENDENCIES (manual map)', () => {
  it('all init types exist in catalog', () => {
    const types = new Set(cat.blocks.map((b) => b.type));
    for (const dep of INIT_DEPENDENCIES) {
      expect(
        types.has(dep.init),
        `init "${dep.init}" missing from catalog`,
      ).toBe(true);
    }
  });

  it('all operation types exist in catalog', () => {
    const types = new Set(cat.blocks.map((b) => b.type));
    for (const dep of INIT_DEPENDENCIES) {
      for (const op of dep.operations) {
        expect(
          types.has(op),
          `operation "${op}" (under init "${dep.init}") missing from catalog`,
        ).toBe(true);
      }
    }
  });

  it('every init block is statement-typed (init must live in arduino_setup.SETUP)', () => {
    const idx = new Map(cat.blocks.map((b) => [b.type, b]));
    for (const dep of INIT_DEPENDENCIES) {
      const block = idx.get(dep.init);
      expect(block, `init "${dep.init}" missing`).toBeDefined();
      expect(
        block?.isStatement,
        `init "${dep.init}" is not a statement block`,
      ).toBe(true);
    }
  });

  it('covers cluster top of the 1000-case run', () => {
    // 7 prefix that cover ~101 fail (35%) of the 286 fail in the 71.4% run.
    const labels = INIT_DEPENDENCIES.map((d) => d.label).filter(Boolean);
    expect(labels).toEqual(
      expect.arrayContaining([
        'humanoid',
        'transform',
        'wheel',
        'qtr-8a',
        'mqtt',
        'neopixel',
        'json',
      ]),
    );
  });
});

describe('OPERATION_TO_INIT_MAP (derived)', () => {
  it('maps humanoid_dance → humanoid_init', () => {
    expect(OPERATION_TO_INIT_MAP.get('humanoid_dance')).toBe('humanoid_init');
  });

  it('maps mqtt_publish → mqtt_setup', () => {
    expect(OPERATION_TO_INIT_MAP.get('mqtt_publish')).toBe('mqtt_setup');
  });

  it('maps json_parse → json_create_object', () => {
    expect(OPERATION_TO_INIT_MAP.get('json_parse')).toBe('json_create_object');
  });

  it('does not map a non-listed block', () => {
    expect(OPERATION_TO_INIT_MAP.get('arduino_setup')).toBeUndefined();
    expect(OPERATION_TO_INIT_MAP.get('logic_compare')).toBeUndefined();
  });

  it('first init wins when two prefixes share an op (qtr_8a vs qtr_8rc)', () => {
    // qtr_calibrate is shared between qtr_8a_init and qtr_8rc_init,
    // so the singleton-init-aware path picks the first declared init.
    expect(OPERATION_TO_INIT_MAP.get('qtr_calibrate')).toBe('qtr_8a_init');
  });
});

describe('generateComboCases', () => {
  const cases = generateComboCases(cat);

  it('emits at least one case per init prefix (when catalog has the init)', () => {
    expect(cases.length).toBeGreaterThanOrEqual(7);
  });

  it('every case is tagged with strategy="combo"', () => {
    for (const c of cases) expect(c.strategy).toBe('combo');
  });

  it('case ids are zero-padded sequential starting at case_0001', () => {
    expect(cases[0].id).toBe('case_0001');
    for (let i = 0; i < cases.length; i++) {
      expect(cases[i].id).toBe(`case_${String(i + 1).padStart(4, '0')}`);
    }
  });

  it('every combo xml contains both arduino_setup and arduino_loop', () => {
    for (const c of cases) {
      expect(c.xml).toContain('type="arduino_setup"');
      expect(c.xml).toContain('type="arduino_loop"');
    }
  });

  it('every combo case includes its init block in blocksUsed', () => {
    for (const c of cases) {
      const matchingInit = INIT_DEPENDENCIES.find((d) =>
        c.blocksUsed.includes(d.init),
      );
      expect(
        matchingInit,
        `case ${c.id} has no INIT_DEPENDENCIES init in blocksUsed: ${c.blocksUsed.join(',')}`,
      ).toBeDefined();
    }
  });

  it('honours maxCount and startIndex', () => {
    const some = generateComboCases(cat, { maxCount: 3, startIndex: 100 });
    expect(some.length).toBe(3);
    expect(some[0].id).toBe('case_0100');
    expect(some[2].id).toBe('case_0102');
  });

  it('humanoid combo case includes humanoid_init + at least one humanoid op', () => {
    const humanoidCase = cases.find((c) =>
      c.blocksUsed.includes('humanoid_init'),
    );
    expect(humanoidCase).toBeDefined();
    const ops = humanoidCase!.blocksUsed.filter(
      (b) => b.startsWith('humanoid_') && b !== 'humanoid_init',
    );
    expect(ops.length).toBeGreaterThanOrEqual(1);
  });
});
