/**
 * Block-level board guards (post-Phase 4-4 commit 4, 2026-05-06).
 *
 * Single source of truth for "this block requires a chip-level capability that
 * isn't captured by the 5 category-level flags (supportsWifi/Ota/Ble/EspNow/
 * category=m5stack)". Used by:
 *   - `components/editor/toolboxGenerator.ts` (UI)         → strips block from
 *     toolbox XML before render so users can't drag it.
 *   - `scripts/probabilistic-debug/lib/catalog.ts`         → consulted by
 *     `isBlockAllowedOnBoard` so Stage 1-4 case generation doesn't pick the
 *     block for an incompatible board.
 *
 * Defense pattern (UI + generation 両経路):
 *   The category-level flags filter whole categories. They're too coarse for
 *   "block X within category Y is unavailable on chip Z". This map is the
 *   block-level escape hatch. Add an entry only when a block emits code that
 *   depends on a chip flag not already represented in the 5 category flags.
 *
 * Currently registered:
 *   - `hall_sensor_esp32`: emits `hallRead()`. arduino-esp32 v2.x exposed
 *     this on xtensa LX6 chips only; arduino-esp32 v3+ removed the
 *     declaration **for every chip family** (verified by direct grep of
 *     framework-arduinoespressif32 v3.2.1 packages on ML30: 0 hits across
 *     `cores/` for `hallRead`). All 16 boards therefore have
 *     `supportsHallSensor: false` today. The flag + guard is kept so a
 *     future arduino-esp32 release that re-exposes the API (or a future
 *     chip with hall support) can flip the relevant board to `true` without
 *     re-introducing the strip mechanism. The block definition + generator
 *     in `digitalSensorBlocks.ts` are intentionally kept so legacy XML
 *     workspaces saved before this commit still load (the block won't be
 *     reachable from the toolbox or case generator going forward).
 *
 * When to add a new entry:
 *   - The block emits a chip-family-specific Arduino-core API
 *     (e.g. `touchRead` on S3 only, future I2S features on C3 only).
 *   - Add a new boolean flag to `BoardDefinition` in `boardStore.ts` and
 *     to `BoardInfo`/`CatalogBoard` in the catalog generator types.
 *   - Mirror the flag value across all 16 boards.
 *   - Add the entry here. UI + generation will both honor it automatically.
 *
 * Why a predicate over a static list of boards:
 *   The predicate keeps the source of truth in `boardStore.ts` (single
 *   per-board flag declaration) and lets the guard reuse it. Listing
 *   board IDs here would invert the dependency.
 */

/**
 * Minimal board shape required by the guards. Both `BoardDefinition`
 * (UI store) and `CatalogBoard` (script-land catalog) extend this.
 */
export interface BoardLikeForGuards {
  supportsHallSensor: boolean;
}

export interface BlockBoardGuard {
  blockType: string;
  required: (board: BoardLikeForGuards) => boolean;
}

export const BLOCK_BOARD_GUARDS: ReadonlyArray<BlockBoardGuard> = [
  { blockType: 'hall_sensor_esp32', required: (b) => b.supportsHallSensor },
];

/**
 * Whether `blockType` is allowed on `board` per the block-level guards.
 * Returns `true` (allowed) when no guard targets this block — guards are
 * a *deny* list keyed by blockType, not an allow list.
 */
export function isBlockAllowedByGuards(
  blockType: string,
  board: BoardLikeForGuards,
): boolean {
  for (const guard of BLOCK_BOARD_GUARDS) {
    if (guard.blockType === blockType && !guard.required(board)) {
      return false;
    }
  }
  return true;
}
