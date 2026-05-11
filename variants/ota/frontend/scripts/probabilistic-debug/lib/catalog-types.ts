/**
 * catalog-types.ts
 *
 * Type definitions mirroring the actual structure of
 * variants/ota/frontend/public/ai/block-catalog.json
 * (produced by scripts/generate-ai-block-catalog.ts).
 *
 * Verified against catalog v1.0 (414 blocks, 18 boards) on 2026-04-28.
 */

export type Mode =
  | 'input'
  | 'output'
  | 'robotics'
  | 'network'
  | 'homeassistant'
  | 'storage_time'
  | 'gpio_bus'
  | 'programming'
  | 'all_blocks'
  | 'custom';

export const ALL_MODES: readonly Mode[] = [
  'input',
  'output',
  'robotics',
  'network',
  'homeassistant',
  'storage_time',
  'gpio_bus',
  'programming',
  'all_blocks',
  'custom',
] as const;

export type FieldType = 'angle' | 'checkbox' | 'dropdown' | 'number' | 'text';

export type BoardRequires =
  | null
  | 'supportsBle'
  | 'supportsOta'
  | 'supportsWifi'
  | 'supportsEspNow'
  | 'category=m5stack';

export type ValueCheck =
  | 'Number'
  | 'Boolean'
  | 'String'
  | 'Colour'
  | string;

export interface CatalogField {
  name: string;
  fieldType: FieldType;
  default?: string | number | boolean | null;
  /** number / angle */
  min?: number;
  /** number / angle */
  max?: number;
  /** dropdown */
  options?: string[];
}

export interface CatalogValueInput {
  name: string;
  check?: ValueCheck;
}

export interface CatalogStatementInput {
  name: string;
}

export interface CatalogBlock {
  type: string;
  category: string;
  tooltip: string;
  colour: string;
  isStatement: boolean;
  hasOutput: boolean;
  modes: Mode[];
  boardRequires: BoardRequires;
  fields: CatalogField[];
  valueInputs: CatalogValueInput[];
  statementInputs: CatalogStatementInput[];
}

export interface CatalogBoard {
  id: string;
  name: string;
  category: string;
  supportsWifi: boolean;
  supportsOta: boolean;
  supportsBle: boolean;
  supportsEspNow: boolean;
  /**
   * post-Phase 4-4 commit 4 (2026-05-06): block-level guard flag.
   * Currently false for every supported board (arduino-esp32 v3+ removed
   * `hallRead()` for all chip families). See
   * `src/data/blockBoardGuards.ts` for the guard list and
   * `BoardDefinition.supportsHallSensor` in `boardStore.ts` for the source.
   */
  supportsHallSensor: boolean;
  /**
   * BUG-073: True for boards we ship in the UI but exclude from the
   * probabilistic-debug case generator (and thus from the release passRate
   * denominator). Mirrors `BoardDefinition.experimental` in boardStore.ts.
   */
  experimental?: boolean;
}

export interface CatalogBoardFilters {
  wifi: string[];
  ota: string[];
  ble: string[];
  /** 51.md Phase A+B (2026-05-04 第78回): ESP-NOW 専用カテゴリ (espnow blocks) */
  espnow: string[];
  /** 51.md Phase A+B (2026-05-04 第78回): M5Stack 系本体専用カテゴリ (m5stack blocks) */
  m5stackOnly: string[];
}

export interface Catalog {
  version: string;
  generatedAt: string;
  blocks: CatalogBlock[];
  boardFilters: CatalogBoardFilters;
  boards: CatalogBoard[];
}
