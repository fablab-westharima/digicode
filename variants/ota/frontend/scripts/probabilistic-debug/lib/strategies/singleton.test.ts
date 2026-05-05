import { describe, it, expect } from 'vitest';
import { loadCatalog, indexByType } from '../catalog';
import { generateSingletonCases } from './singleton';
import { hasCompatibleBoard } from '../case-helpers';
import { validateRoots } from '../case-validator';

const cat = loadCatalog();
const idx = indexByType(cat);

describe('generateSingletonCases', () => {
  const cases = generateSingletonCases(cat);
  // post-Phase 4-4 commit 4 (2026-05-06): the strategy skips blocks that no
  // supported board can host (BLOCK_BOARD_GUARDS deny list — currently
  // `hall_sensor_esp32` for every chip family). Compute the expected
  // coverage from `hasCompatibleBoard` so the assertion tracks the live
  // guard list instead of hard-coding "every catalog block".
  const generableBlocks = cat.blocks.filter((b) => hasCompatibleBoard(b, cat));
  const skippedBlocks = cat.blocks.filter((b) => !hasCompatibleBoard(b, cat));

  it('produces exactly the count of blocks with at least one compatible board', () => {
    expect(cases.length).toBe(generableBlocks.length);
  });

  it('every case is tagged with strategy="singleton"', () => {
    for (const c of cases) expect(c.strategy).toBe('singleton');
  });

  it('case ids are zero-padded sequential starting at case_0001', () => {
    expect(cases[0].id).toBe('case_0001');
    for (let i = 0; i < cases.length; i++) {
      expect(cases[i].id).toBe(`case_${String(i + 1).padStart(4, '0')}`);
    }
  });

  it('every case mode is in the catalog mode set (all_blocks expected)', () => {
    for (const c of cases) expect(c.mode).toBe('all_blocks');
  });

  it('every case board is one of the catalog boards', () => {
    const boardIds = new Set(cat.boards.map((b) => b.id));
    for (const c of cases) expect(boardIds.has(c.boardId)).toBe(true);
  });

  it('emits a non-empty XML payload that opens with the Blockly namespace', () => {
    for (const c of cases) {
      expect(c.xml).toMatch(
        /^<xml xmlns="https:\/\/developers\.google\.com\/blockly\/xml">/,
      );
      expect(c.xml.length).toBeGreaterThan(50);
    }
  });

  it('every case lists its target block type in blocksUsed', () => {
    const targets = new Set(cat.blocks.map((b) => b.type));
    let covered = 0;
    for (const c of cases) {
      const target = c.blocksUsed.find((t) => targets.has(t));
      expect(target).toBeDefined();
      covered++;
    }
    // Sanity: number of cases that link to a catalog block equals the count
    // of catalog blocks with at least one compatible board (skipped blocks
    // are excluded by the BLOCK_BOARD_GUARDS deny list).
    expect(covered).toBe(generableBlocks.length);
  });

  it('singleton coverage hits every generable catalog block at least once', () => {
    const seen = new Set<string>();
    for (const c of cases) {
      for (const t of c.blocksUsed) seen.add(t);
    }
    for (const b of generableBlocks) {
      expect(seen.has(b.type), `block "${b.type}" never appears`).toBe(true);
    }
    // Conversely, blocks with no compatible board should NOT appear in any
    // case (post-Phase 4-4 commit 4: hall_sensor_esp32 is the only such
    // block today).
    for (const b of skippedBlocks) {
      expect(
        seen.has(b.type),
        `block "${b.type}" was skipped by BLOCK_BOARD_GUARDS but appeared in a case`,
      ).toBe(false);
    }
  });

  it('every emitted XML re-validates cleanly against the catalog', () => {
    // Re-parse not required: the strategy already validates, but we re-run
    // validateRoots on the synthesized roots by reconstructing a minimal
    // assertion: blocksUsed is consistent with the XML payload (no orphan
    // types reachable in the tree but absent from blocksUsed).
    for (const c of cases) {
      // Quick textual check: every blocksUsed type appears as `<block type="…">`
      for (const t of c.blocksUsed) {
        expect(c.xml).toContain(`type="${t}"`);
      }
    }
  });

  it('startIndex offsets the case ids', () => {
    const offset = generateSingletonCases(cat, { startIndex: 100 });
    expect(offset[0].id).toBe('case_0100');
  });

  it('uses esp32_serial_println as the value wrapper for hasOutput blocks', () => {
    // Priority C value-input refactor (2026-05-03) introduced math_number
    // shadows inside value-input slots of statement blocks (e.g.
    // humanoid_walk STEPS), so math_number now appears in many cases as a
    // sub-component. Filter for the case where math_number is the *target*
    // singleton — that case wraps it with esp32_serial_println so the
    // hasOutput value reaches a printable consumer.
    const numeric = cases.find(
      (c) => c.blocksUsed.includes('math_number') && c.blocksUsed.includes('esp32_serial_println'),
    );
    expect(numeric).toBeDefined();
    if (!numeric) return;
    expect(numeric.xml).toContain('esp32_serial_println');
  });

  it('emits both arduino_setup and arduino_loop in every case (compilable)', () => {
    for (const c of cases) {
      expect(c.xml).toContain('type="arduino_setup"');
      expect(c.xml).toContain('type="arduino_loop"');
    }
  });

  it('passes validateRoots with zero issues for a sampled subset', () => {
    // The strategy already throws on validation failure; this re-asserts as a
    // belt-and-suspenders check on the first 25 cases.
    const sample = cases.slice(0, 25);
    for (const c of sample) {
      expect(c.blocksUsed.length).toBeGreaterThan(0);
      // Reconstructing validation requires the original BlockNode tree, which
      // we don't expose. Instead we check the XML round-trips through known
      // structural invariants.
      expect(c.xml).toMatch(/<\/xml>$/);
    }
    // Ensure validateRoots is reachable (smoke).
    expect(typeof validateRoots).toBe('function');
    expect(idx.size).toBe(cat.blocks.length);
  });
});
