/**
 * Matrix strategy — mode × board representative coverage.
 *
 * Visits (mode, board) combinations in round-robin order so the first 100
 * cases are balanced across all 7 modes (≈14 boards per mode) instead of
 * stacking all 18 boards onto the first few modes.
 *
 * For each visited combination:
 *   1. Pick a "representative" block: prefer an isStatement=true block valid
 *      in both the mode and the board, excluding the trivial roots/primitives.
 *   2. Synthesize the block, wrap with arduino_setup/loop.
 *   3. Validate against catalog.
 *
 * Combinations with no compatible non-trivial block are skipped silently.
 */

import {
  ALL_MODES,
  type Catalog,
  type CatalogBlock,
  type CatalogBoard,
  type Mode,
} from '../catalog-types';
import {
  indexByType,
  isBlockAllowedOnBoard,
  nonExperimentalBoards,
} from '../catalog';
import { synthesizeBlock } from '../synthesize-block';
import { emitXml } from '../xml-builder';
import { validateRoots } from '../case-validator';
import type { GeneratedCase } from '../case-types';
import {
  collectBlockTypes,
  generateCaseId,
  wrapForCompilability,
} from '../case-helpers';

const TRIVIAL_TYPES = new Set([
  'arduino_setup',
  'arduino_loop',
  'math_number',
  'text',
  'logic_boolean',
]);

export interface MatrixOptions {
  startIndex?: number;
  /** Cap on emitted cases (default 100). */
  maxCount?: number;
}

function pickRepresentative(
  mode: Mode,
  board: CatalogBoard,
  catalog: Catalog,
): CatalogBlock | null {
  let stmtPick: CatalogBlock | null = null;
  let anyPick: CatalogBlock | null = null;
  for (const b of catalog.blocks) {
    if (TRIVIAL_TYPES.has(b.type)) continue;
    if (!b.modes.includes(mode)) continue;
    if (!isBlockAllowedOnBoard(b, board)) continue;
    if (b.isStatement) {
      if (!stmtPick) stmtPick = b;
    } else if (!anyPick) {
      anyPick = b;
    }
  }
  return stmtPick ?? anyPick;
}

export function generateMatrixCases(
  catalog: Catalog,
  options: MatrixOptions = {},
): GeneratedCase[] {
  const idx = indexByType(catalog);
  const cap = options.maxCount ?? 100;
  let seq = options.startIndex ?? 1;
  const cases: GeneratedCase[] = [];

  // BUG-073: drop experimental boards from the matrix; release passRate
  // denominator is the supported ESP32 set.
  const supportedBoards = nonExperimentalBoards(catalog);
  const totalCombos = ALL_MODES.length * supportedBoards.length;
  const visitMax = Math.min(cap * 2, totalCombos); // walk extra to absorb skips

  for (let c = 0; c < visitMax; c++) {
    if (cases.length >= cap) break;
    const mode = ALL_MODES[c % ALL_MODES.length];
    const board =
      supportedBoards[Math.floor(c / ALL_MODES.length) % supportedBoards.length];

    const rep = pickRepresentative(mode, board, catalog);
    if (!rep) continue;

    const synth = synthesizeBlock(rep, { mode, blockIndex: idx });
    const roots = wrapForCompilability(synth, rep);

    const issues = validateRoots(roots, { mode, board, blockIndex: idx });
    if (issues.length > 0) {
      const summary = issues
        .map((i) => `  - ${i.path} [${i.blockType}]: ${i.reason}`)
        .join('\n');
      throw new Error(
        `Matrix case for (mode=${mode}, board=${board.id}, target=${rep.type}) failed:\n${summary}`,
      );
    }

    cases.push({
      id: generateCaseId(seq++),
      strategy: 'matrix',
      mode,
      boardId: board.id,
      blocksUsed: collectBlockTypes(roots),
      xml: emitXml(roots),
    });
  }

  return cases;
}
