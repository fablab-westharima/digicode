/**
 * case-helpers.ts
 *
 * Cross-strategy utilities: mode/board selection, ID formatting, and tree
 * traversal for `blocksUsed` accounting.
 */

import type {
  Catalog,
  CatalogBlock,
  CatalogBoard,
  Mode,
} from './catalog-types';
import { isBlockAllowedOnBoard } from './catalog';
import type { BlockNode } from './xml-builder';

/**
 * `all_blocks` is a superset mode that contains every block in the current
 * catalog, so it is always a safe default for Singleton/Edge/Pair generators.
 * Mode/board permutation lives in the Matrix strategy instead.
 */
export const DEFAULT_MODE: Mode = 'all_blocks';

/**
 * Boards are ordered by priority: M5Stack 9 (FS course materials, top
 * stability priority) → XIAO ESP32 3 (Fab Academy recommended) → generic
 * ESP32 4. pickBoard walks this list and returns the first one that
 * satisfies the block's boardRequires.
 *
 * 56.md (2026-05-05): RP2040 family completely removed; DigiCode is now
 * ESP32-only across 16 boards. The `experimental` filter below is preserved
 * as a hook for any future board that ships in the UI but should stay out
 * of the release passRate denominator.
 */
export const PREFERRED_BOARD_ORDER: readonly string[] = [
  // M5Stack 9 (FS 講座教材、最優先)
  'm5stack-basic',
  'atom-lite',
  'atom-matrix',
  'm5stickc-plus',
  'm5stamp-pico',
  'm5stamp-c3',
  'm5stamp-s3a',
  'm5stamp-s3-bat',
  'm5stack-atoms3-lite',
  // XIAO ESP32 3 (Fab Academy 推奨)
  'xiao-esp32c3',
  'xiao-esp32s3',
  'xiao-esp32c6',
  // 汎用 ESP32 4
  'esp32-generic',
  'esp32-s3-generic',
  'esp32-c3-generic',
  'esp32-c6-generic',
];

export function pickMode(block: CatalogBlock): Mode {
  if (block.modes.includes(DEFAULT_MODE)) return DEFAULT_MODE;
  return block.modes[0];
}

export function pickBoard(
  block: CatalogBlock,
  catalog: Catalog,
): CatalogBoard {
  // The `experimental` filter is preserved as a hook for future boards that
  // ship in the UI but should stay out of the release passRate denominator.
  // No board currently sets `experimental: true` after the 56.md RP2040
  // removal (2026-05-05), so this filter is effectively a no-op today.
  const supported = catalog.boards.filter((b) => !b.experimental);
  for (const id of PREFERRED_BOARD_ORDER) {
    const board = supported.find((b) => b.id === id);
    if (board && isBlockAllowedOnBoard(block, board)) return board;
  }
  for (const board of supported) {
    if (isBlockAllowedOnBoard(block, board)) return board;
  }
  throw new Error(
    `No supported board satisfies boardRequires=${block.boardRequires} for "${block.type}"`,
  );
}

/**
 * Whether at least one supported (non-experimental) board satisfies the
 * block's constraints (category-level `boardRequires` AND block-level
 * `BLOCK_BOARD_GUARDS`). Strategies call this before iterating to skip
 * blocks that no board can host (post-Phase 4-4 commit 4, 2026-05-06).
 *
 * Returns false today for `hall_sensor_esp32` because arduino-esp32 v3
 * removed `hallRead()` for every chip family — every board has
 * `supportsHallSensor: false`, the BLOCK_BOARD_GUARDS predicate fails on
 * all of them, and `pickBoard` would throw. Skipping at the iteration
 * level keeps generation total stable and lets future regenerated cases
 * re-include the block when arduino-esp32 v4 (or a new chip flag) flips
 * any board's `supportsHallSensor` to `true`.
 */
export function hasCompatibleBoard(
  block: CatalogBlock,
  catalog: Catalog,
): boolean {
  const supported = catalog.boards.filter((b) => !b.experimental);
  return supported.some((board) => isBlockAllowedOnBoard(block, board));
}

export function generateCaseId(seq: number): string {
  return `case_${String(seq).padStart(4, '0')}`;
}

/** Sorted, deduplicated list of every `block.type` reachable from `roots`. */
export function collectBlockTypes(roots: BlockNode[]): string[] {
  const set = new Set<string>();
  function visit(node: BlockNode): void {
    set.add(node.type);
    if (node.values) {
      for (const child of Object.values(node.values)) visit(child);
    }
    if (node.statements) {
      for (const child of Object.values(node.statements)) visit(child);
    }
    if (node.next) visit(node.next);
  }
  for (const r of roots) visit(r);
  return [...set].sort();
}

const SETUP_POS = { x: 50, y: 50 } as const;
const LOOP_POS = { x: 50, y: 350 } as const;
const EXTRA_POS = { x: 50, y: 650 } as const;
const VALUE_WRAPPER_TYPE = 'esp32_serial_println';

/**
 * Wrap a synthesized block in the canonical arduino_setup + arduino_loop root
 * pair so the compile server always emits both `void setup()` and `void loop()`.
 *
 * Placement rules:
 *   arduino_setup target  → emit it as the setup root, add empty arduino_loop
 *   arduino_loop target   → emit it as the loop root, add empty arduino_setup
 *   rootOnly handler      → emit empty setup + loop, append target as 3rd root
 *   hasOutput=true        → wrap target in esp32_serial_println.VALUE inside loop
 *   isStatement=true      → place target inside arduino_setup.SETUP
 */
export function wrapForCompilability(
  synth: BlockNode,
  block: CatalogBlock,
): BlockNode[] {
  if (synth.type === 'arduino_setup') {
    return [
      { ...synth, ...SETUP_POS },
      { type: 'arduino_loop', ...LOOP_POS },
    ];
  }
  if (synth.type === 'arduino_loop') {
    return [
      { type: 'arduino_setup', ...SETUP_POS },
      { ...synth, ...LOOP_POS },
    ];
  }
  if (!block.isStatement && !block.hasOutput) {
    return [
      { type: 'arduino_setup', ...SETUP_POS },
      { type: 'arduino_loop', ...LOOP_POS },
      { ...synth, ...EXTRA_POS },
    ];
  }
  if (block.hasOutput) {
    return [
      { type: 'arduino_setup', ...SETUP_POS },
      {
        type: 'arduino_loop',
        ...LOOP_POS,
        statements: {
          LOOP: { type: VALUE_WRAPPER_TYPE, values: { VALUE: synth } },
        },
      },
    ];
  }
  return [
    { type: 'arduino_setup', ...SETUP_POS, statements: { SETUP: synth } },
    { type: 'arduino_loop', ...LOOP_POS },
  ];
}
