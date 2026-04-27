/**
 * Edge strategy — boundary value coverage for the catalog.
 *
 * Three sub-strategies:
 *
 *   numberBoundary   — for catalog blocks with `min`/`max` on number/angle
 *                      fields, emit one case at min and one at max.
 *   dropdownEnum     — for catalog blocks with rich dropdown enums (≥3 options),
 *                      emit one case per option value.
 *   deepNest         — hand-built deeply nested structures (controls_for /
 *                      controls_if / math_arithmetic chains) to surface
 *                      generator stack/recursion limits.
 *
 * Default split (= 86 cases): 20 number + 50 dropdown + 16 nest.
 */

import type { Catalog, CatalogBlock, Mode } from '../catalog-types';
import { indexByType } from '../catalog';
import { synthesizeBlock, synthesizeField } from '../synthesize-block';
import { emitXml } from '../xml-builder';
import type { BlockNode } from '../xml-builder';
import { validateRoots } from '../case-validator';
import type { GeneratedCase } from '../case-types';
import {
  pickMode,
  pickBoard,
  collectBlockTypes,
  generateCaseId,
  wrapForCompilability,
} from '../case-helpers';

export interface EdgeOptions {
  startIndex?: number;
  numberBoundaryCount?: number;
  dropdownEnumCount?: number;
  deepNestCount?: number;
}

export function generateEdgeCases(
  catalog: Catalog,
  options: EdgeOptions = {},
): GeneratedCase[] {
  const idx = indexByType(catalog);
  let seq = options.startIndex ?? 1;
  const nextId = (): string => generateCaseId(seq++);

  const numberCount = options.numberBoundaryCount ?? 20;
  const dropdownCount = options.dropdownEnumCount ?? 50;
  const nestCount = options.deepNestCount ?? 16;

  return [
    ...generateNumberBoundaryCases(catalog, idx, nextId, numberCount),
    ...generateDropdownEnumCases(catalog, idx, nextId, dropdownCount),
    ...generateDeepNestCases(catalog, idx, nextId, nestCount),
  ];
}

// --- Sub-strategy 1: number boundary -----------------------------------

function generateNumberBoundaryCases(
  catalog: Catalog,
  idx: Map<string, CatalogBlock>,
  nextId: () => string,
  targetCount: number,
): GeneratedCase[] {
  const candidates = catalog.blocks.filter((b) =>
    b.fields.some(
      (f) =>
        (f.fieldType === 'number' || f.fieldType === 'angle') &&
        f.min !== undefined &&
        f.max !== undefined,
    ),
  );

  // Diverse selection: walk candidates picking one per category until we have
  // enough blocks for `targetCount / 2` (each yields min + max).
  const blocksPerCase = Math.ceil(targetCount / 2);
  const seenCategories = new Set<string>();
  const selected: CatalogBlock[] = [];
  for (const b of candidates) {
    if (selected.length >= blocksPerCase) break;
    if (!seenCategories.has(b.category)) {
      seenCategories.add(b.category);
      selected.push(b);
    }
  }
  // Fill remaining slots from any category if diversity wasn't enough.
  for (const b of candidates) {
    if (selected.length >= blocksPerCase) break;
    if (!selected.includes(b)) selected.push(b);
  }

  const cases: GeneratedCase[] = [];
  for (const block of selected) {
    if (cases.length >= targetCount) break;
    const numField = block.fields.find(
      (f) =>
        (f.fieldType === 'number' || f.fieldType === 'angle') &&
        f.min !== undefined &&
        f.max !== undefined,
    );
    if (
      !numField ||
      numField.min === undefined ||
      numField.max === undefined
    ) {
      continue;
    }
    const mode = pickMode(block);
    const board = pickBoard(block, catalog);

    for (const variant of ['min', 'max'] as const) {
      if (cases.length >= targetCount) break;
      const value = variant === 'min' ? numField.min : numField.max;
      const synth = synthesizeBlock(block, { mode, blockIndex: idx });
      synth.fields = { ...(synth.fields ?? {}), [numField.name]: value };
      const roots = wrapForCompilability(synth, block);

      const issues = validateRoots(roots, { mode, board, blockIndex: idx });
      if (issues.length > 0) {
        const summary = issues
          .map((i) => `  - ${i.path} [${i.blockType}]: ${i.reason}`)
          .join('\n');
        throw new Error(
          `Edge/numberBoundary case for "${block.type}.${numField.name}=${value}" failed validation:\n${summary}`,
        );
      }

      cases.push({
        id: nextId(),
        strategy: 'edge',
        mode,
        boardId: board.id,
        blocksUsed: collectBlockTypes(roots),
        xml: emitXml(roots),
      });
    }
  }
  return cases;
}

// --- Sub-strategy 2: dropdown enum -------------------------------------

interface DropdownTarget {
  block: CatalogBlock;
  fieldName: string;
  options: string[];
}

function gatherDropdownTargets(catalog: Catalog): DropdownTarget[] {
  const out: DropdownTarget[] = [];
  for (const b of catalog.blocks) {
    for (const f of b.fields) {
      if (
        f.fieldType === 'dropdown' &&
        f.options &&
        f.options.length >= 3
      ) {
        out.push({ block: b, fieldName: f.name, options: f.options });
      }
    }
  }
  // Most options first — single block can carry many cases.
  out.sort((a, b) => b.options.length - a.options.length);
  return out;
}

function generateDropdownEnumCases(
  catalog: Catalog,
  idx: Map<string, CatalogBlock>,
  nextId: () => string,
  targetCount: number,
): GeneratedCase[] {
  const targets = gatherDropdownTargets(catalog);
  const cases: GeneratedCase[] = [];

  for (const t of targets) {
    if (cases.length >= targetCount) break;
    const mode = pickMode(t.block);
    const board = pickBoard(t.block, catalog);

    for (const optionValue of t.options) {
      if (cases.length >= targetCount) break;
      const synth = synthesizeBlock(t.block, { mode, blockIndex: idx });
      synth.fields = {
        ...(synth.fields ?? {}),
        [t.fieldName]: optionValue,
      };
      const roots = wrapForCompilability(synth, t.block);

      const issues = validateRoots(roots, { mode, board, blockIndex: idx });
      if (issues.length > 0) {
        const summary = issues
          .map((i) => `  - ${i.path} [${i.blockType}]: ${i.reason}`)
          .join('\n');
        throw new Error(
          `Edge/dropdownEnum case for "${t.block.type}.${t.fieldName}=${optionValue}" failed validation:\n${summary}`,
        );
      }

      cases.push({
        id: nextId(),
        strategy: 'edge',
        mode,
        boardId: board.id,
        blocksUsed: collectBlockTypes(roots),
        xml: emitXml(roots),
      });
    }
  }
  return cases;
}

// --- Sub-strategy 3: deep nest -----------------------------------------

const LOOP_VAR_NAMES = ['i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r'];

function buildNumberBlock(value: number): BlockNode {
  return { type: 'math_number', fields: { NUM: value } };
}

function buildBooleanBlock(value: boolean): BlockNode {
  return {
    type: 'logic_boolean',
    fields: { BOOL: value ? 'TRUE' : 'FALSE' },
  };
}

function buildArithmeticNest(depth: number): BlockNode {
  if (depth <= 0) return buildNumberBlock(1);
  return {
    type: 'math_arithmetic',
    fields: { OP: 'ADD' },
    values: {
      A: buildArithmeticNest(depth - 1),
      B: buildNumberBlock(depth),
    },
  };
}

function buildForNest(depth: number): BlockNode {
  if (depth <= 0) {
    return {
      type: 'esp32_serial_println',
      values: { VALUE: buildNumberBlock(0) },
    };
  }
  const varName =
    LOOP_VAR_NAMES[LOOP_VAR_NAMES.length - depth] ?? `v${depth}`;
  return {
    type: 'controls_for',
    fields: { VAR: varName },
    values: {
      FROM: buildNumberBlock(0),
      TO: buildNumberBlock(3),
      BY: buildNumberBlock(1),
    },
    statements: { DO: buildForNest(depth - 1) },
  };
}

function buildIfNest(depth: number): BlockNode {
  if (depth <= 0) {
    return {
      type: 'esp32_serial_println',
      values: { VALUE: buildNumberBlock(1) },
    };
  }
  return {
    type: 'controls_if',
    values: { IF0: buildBooleanBlock(true) },
    statements: { DO0: buildIfNest(depth - 1) },
  };
}

function buildSerialChain(length: number): BlockNode {
  if (length <= 1) {
    return {
      type: 'esp32_serial_println',
      values: { VALUE: buildNumberBlock(0) },
    };
  }
  return {
    type: 'esp32_serial_println',
    values: { VALUE: buildNumberBlock(length) },
    next: buildSerialChain(length - 1),
  };
}

interface DeepNestRecipe {
  label: string;
  build: () => BlockNode;
}

function deepNestRecipes(): DeepNestRecipe[] {
  return [
    { label: 'for_d2', build: () => buildForNest(2) },
    { label: 'for_d3', build: () => buildForNest(3) },
    { label: 'for_d5', build: () => buildForNest(5) },
    { label: 'for_d8', build: () => buildForNest(8) },
    { label: 'if_d2', build: () => buildIfNest(2) },
    { label: 'if_d3', build: () => buildIfNest(3) },
    { label: 'if_d5', build: () => buildIfNest(5) },
    { label: 'if_d10', build: () => buildIfNest(10) },
    { label: 'arith_d2', build: () => buildArithWrapper(2) },
    { label: 'arith_d3', build: () => buildArithWrapper(3) },
    { label: 'arith_d5', build: () => buildArithWrapper(5) },
    { label: 'arith_d8', build: () => buildArithWrapper(8) },
    { label: 'serial_chain_3', build: () => buildSerialChain(3) },
    { label: 'serial_chain_10', build: () => buildSerialChain(10) },
    { label: 'mixed_for_if', build: () => buildMixedForIf() },
    { label: 'arithmetic_in_serial', build: () => buildArithWrapper(4) },
  ];
}

/** Wrap an arithmetic nest in a serial_println so its value is consumed. */
function buildArithWrapper(depth: number): BlockNode {
  return {
    type: 'esp32_serial_println',
    values: { VALUE: buildArithmeticNest(depth) },
  };
}

/** controls_for(controls_if(serial_println)) — three layers, mixed kind. */
function buildMixedForIf(): BlockNode {
  return {
    type: 'controls_for',
    fields: { VAR: 'i' },
    values: {
      FROM: buildNumberBlock(0),
      TO: buildNumberBlock(5),
      BY: buildNumberBlock(1),
    },
    statements: {
      DO: {
        type: 'controls_if',
        values: { IF0: buildBooleanBlock(true) },
        statements: {
          DO0: {
            type: 'esp32_serial_println',
            values: { VALUE: buildNumberBlock(42) },
          },
        },
      },
    },
  };
}

function generateDeepNestCases(
  catalog: Catalog,
  idx: Map<string, CatalogBlock>,
  nextId: () => string,
  targetCount: number,
): GeneratedCase[] {
  const recipes = deepNestRecipes().slice(0, targetCount);
  const mode: Mode = 'all_blocks';
  const board = pickBoard(
    catalog.blocks.find((b) => b.type === 'arduino_setup')!,
    catalog,
  );

  const cases: GeneratedCase[] = [];
  for (const recipe of recipes) {
    const inner = recipe.build();
    const roots: BlockNode[] = [
      {
        type: 'arduino_setup',
        x: 50,
        y: 50,
        statements: { SETUP: inner },
      },
      { type: 'arduino_loop', x: 50, y: 350 },
    ];

    const issues = validateRoots(roots, { mode, board, blockIndex: idx });
    if (issues.length > 0) {
      const summary = issues
        .map((i) => `  - ${i.path} [${i.blockType}]: ${i.reason}`)
        .join('\n');
      throw new Error(
        `Edge/deepNest case "${recipe.label}" failed validation:\n${summary}`,
      );
    }

    cases.push({
      id: nextId(),
      strategy: 'edge',
      mode,
      boardId: board.id,
      blocksUsed: collectBlockTypes(roots),
      xml: emitXml(roots),
    });
  }
  return cases;
}

// Re-export for tests.
export {
  buildArithmeticNest,
  buildForNest,
  buildIfNest,
  buildSerialChain,
  deepNestRecipes,
};

// Currently unused — keeps tree-shaking honest in case we later swap synthesize-block-driven defaults in.
void synthesizeField;
