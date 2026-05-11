import { describe, it, expect } from 'vitest';
import { loadCatalog, nonExperimentalBoards } from '../catalog';
import { ALL_MODES } from '../catalog-types';
import { generateMatrixCases } from './matrix';

const cat = loadCatalog();
const supportedBoards = nonExperimentalBoards(cat);

describe('generateMatrixCases (defaults)', () => {
  const cases = generateMatrixCases(cat);

  it('caps at 100 cases by default', () => {
    expect(cases.length).toBeLessThanOrEqual(100);
    expect(cases.length).toBeGreaterThan(80); // realistic floor
  });

  it('every case is tagged with strategy="matrix"', () => {
    for (const c of cases) expect(c.strategy).toBe('matrix');
  });

  it('every wide mode is represented at least 5 times in the first 100 (round-robin)', () => {
    // Session 104: narrow function-category modes (storage_time / homeassistant
    // / gpio_bus) silently drop cases where the chosen rep needs cross-mode
    // primitives. Wide modes (all_blocks / custom / programming / robotics /
    // network / input / output) still produce cases reliably.
    const WIDE_MODES = ['all_blocks', 'custom', 'programming', 'robotics', 'network', 'input', 'output'] as const;
    const counts = new Map<string, number>();
    for (const c of cases) counts.set(c.mode, (counts.get(c.mode) ?? 0) + 1);
    for (const m of WIDE_MODES) {
      expect(counts.get(m) ?? 0, `wide mode "${m}" should have at least 5 cases`).toBeGreaterThanOrEqual(5);
    }
  });

  it('hits a meaningful slice of the supported boards (≥10 distinct under 100-case cap)', () => {
    // 56.md (2026-05-05): RP2040 family removed; DigiCode is ESP32-only
    // across 16 boards. Round-robin with mode-fastest now visits ≥10 distinct
    // boards under the 100-case cap (10 modes × 16 supported boards, with
    // narrow-mode drops eating some slots).
    const boards = new Set(cases.map((c) => c.boardId));
    expect(boards.size).toBeGreaterThanOrEqual(10);
  });

  it('hits every supported board when the cap is large enough (mode × board = 10 × 16 = 160)', () => {
    const fullCases = generateMatrixCases(cat, {
      maxCount: ALL_MODES.length * supportedBoards.length,
    });
    const boards = new Set(fullCases.map((c) => c.boardId));
    for (const b of supportedBoards) {
      expect(boards.has(b.id)).toBe(true);
    }
  });

  it('never emits a case for an experimental board (filter is preserved as future hook)', () => {
    // 56.md (2026-05-05): no boards currently set `experimental: true` after
    // the RP2040 removal, so the filter is effectively a no-op today. The
    // assertion is kept to guard against any future board setting the flag
    // ever leaking into matrix output.
    const experimentalIds = new Set(
      cat.boards.filter((b) => b.experimental).map((b) => b.id),
    );
    for (const c of cases) {
      expect(experimentalIds.has(c.boardId)).toBe(false);
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
  it('honours maxCount and startIndex (cap, not exact count, when narrow modes drop)', () => {
    // Session 104: narrow modes silently drop, so cases.length may be < maxCount
    // when maxCount is small. With maxCount=20, the loop walks 2×20=40 combos
    // which is enough to fill 20 even with a few drops.
    const cases = generateMatrixCases(cat, {
      maxCount: 20,
      startIndex: 500,
    });
    expect(cases.length).toBeGreaterThan(10);
    expect(cases.length).toBeLessThanOrEqual(20);
    expect(cases[0].id).toBe('case_0500');
  });

  it('first slice of cases spans multiple modes (round-robin starts mode-first)', () => {
    // Session 104: 10 modes, round-robin emits one per mode for the first
    // 10 combos (skipping narrow-mode drops). Expect at least 5 distinct
    // modes in the first 20 cases.
    const cases = generateMatrixCases(cat, { maxCount: 20 });
    const modes = new Set(cases.map((c) => c.mode));
    expect(modes.size).toBeGreaterThanOrEqual(5);
  });
});
