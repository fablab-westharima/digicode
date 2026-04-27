import { describe, it, expect } from 'vitest';
import { loadCatalog } from '../catalog';
import { ALL_MODES } from '../catalog-types';
import { generateMatrixCases } from './matrix';

const cat = loadCatalog();

describe('generateMatrixCases (defaults)', () => {
  const cases = generateMatrixCases(cat);

  it('caps at 100 cases by default', () => {
    expect(cases.length).toBeLessThanOrEqual(100);
    expect(cases.length).toBeGreaterThan(80); // realistic floor
  });

  it('every case is tagged with strategy="matrix"', () => {
    for (const c of cases) expect(c.strategy).toBe('matrix');
  });

  it('every mode is represented at least 5 times in the first 100 (round-robin)', () => {
    const counts = new Map<string, number>();
    for (const c of cases) counts.set(c.mode, (counts.get(c.mode) ?? 0) + 1);
    for (const m of ALL_MODES) {
      expect(counts.get(m) ?? 0).toBeGreaterThanOrEqual(5);
    }
  });

  it('hits a meaningful slice of the boards (≥15 distinct under 100-case cap)', () => {
    // Round-robin with mode-fastest visits 15 distinct boards for cap=100
    // (7 modes × 14-15 boards). Boards 15-17 (RP2040 tail) are exercised
    // when the cap is raised; here we just guard the 15-board floor.
    const boards = new Set(cases.map((c) => c.boardId));
    expect(boards.size).toBeGreaterThanOrEqual(15);
  });

  it('hits all 18 boards when the cap is large enough (mode×board = 126)', () => {
    const fullCases = generateMatrixCases(cat, { maxCount: 126 });
    const boards = new Set(fullCases.map((c) => c.boardId));
    for (const b of cat.boards) {
      expect(boards.has(b.id)).toBe(true);
    }
  });

  it('blocksUsed always includes arduino_setup and arduino_loop', () => {
    for (const c of cases) {
      expect(c.blocksUsed).toContain('arduino_setup');
      expect(c.blocksUsed).toContain('arduino_loop');
    }
  });

  it('every case xml opens with the Blockly namespace', () => {
    for (const c of cases) {
      expect(c.xml).toMatch(
        /^<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml">/,
      );
    }
  });
});

describe('generateMatrixCases — custom options', () => {
  it('honours maxCount and startIndex', () => {
    const cases = generateMatrixCases(cat, {
      maxCount: 7,
      startIndex: 500,
    });
    expect(cases.length).toBe(7);
    expect(cases[0].id).toBe('case_0500');
    expect(cases[6].id).toBe('case_0506');
  });

  it('first 7 cases each use a different mode (round-robin starts mode-first)', () => {
    const cases = generateMatrixCases(cat, { maxCount: 7 });
    const modes = new Set(cases.map((c) => c.mode));
    expect(modes.size).toBe(7);
  });
});
