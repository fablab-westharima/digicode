/**
 * catalog.ts
 *
 * Loads block-catalog.json and provides filter helpers used by the
 * probabilistic-debug use case generator (Phase 1).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import type {
  Catalog,
  CatalogBlock,
  CatalogBoard,
  Mode,
} from './catalog-types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// scripts/probabilistic-debug/lib/ → scripts/probabilistic-debug/ → scripts/ → frontend/
const FRONTEND_DIR = path.resolve(__dirname, '../../..');

export const DEFAULT_CATALOG_PATH = path.join(
  FRONTEND_DIR,
  'public/ai/block-catalog.json',
);

let cached: Catalog | null = null;
let cachedPath: string | null = null;

/** Loads (and memoizes) the catalog from disk. */
export function loadCatalog(catalogPath: string = DEFAULT_CATALOG_PATH): Catalog {
  if (cached && cachedPath === catalogPath) return cached;
  const raw = fs.readFileSync(catalogPath, 'utf-8');
  const data = JSON.parse(raw) as Catalog;
  cached = data;
  cachedPath = catalogPath;
  return data;
}

/** Resets the in-memory cache (test helper). */
export function clearCatalogCache(): void {
  cached = null;
  cachedPath = null;
}

/** Blocks whose `modes` array contains the given mode. */
export function blocksForMode(catalog: Catalog, mode: Mode): CatalogBlock[] {
  return catalog.blocks.filter((b) => b.modes.includes(mode));
}

/** Whether a block's `boardRequires` capability is satisfied by the board. */
export function isBlockAllowedOnBoard(
  block: CatalogBlock,
  board: CatalogBoard,
): boolean {
  if (block.boardRequires === null) return true;
  switch (block.boardRequires) {
    case 'supportsBle':
      return board.supportsBle;
    case 'supportsOta':
      return board.supportsOta;
    case 'supportsWifi':
      return board.supportsWifi;
    default:
      return false;
  }
}

/** Blocks valid for both the given mode and board. */
export function blocksFor(
  catalog: Catalog,
  mode: Mode,
  board: CatalogBoard,
): CatalogBlock[] {
  return blocksForMode(catalog, mode).filter((b) =>
    isBlockAllowedOnBoard(b, board),
  );
}

/** Index blocks by `type` for O(1) lookup. */
export function indexByType(catalog: Catalog): Map<string, CatalogBlock> {
  const map = new Map<string, CatalogBlock>();
  for (const b of catalog.blocks) map.set(b.type, b);
  return map;
}

/** SHA-256 over the catalog's blocks list — for run-to-run regression tagging. */
export function catalogHash(catalog: Catalog): string {
  return createHash('sha256').update(JSON.stringify(catalog.blocks)).digest('hex');
}
