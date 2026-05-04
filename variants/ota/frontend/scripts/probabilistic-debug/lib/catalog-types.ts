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
  | 'all_blocks'
  | 'custom'
  | 'generic'
  | 'homeassistant'
  | 'robots_humanoid'
  | 'robots_transform'
  | 'robots_wheel';

export const ALL_MODES: readonly Mode[] = [
  'all_blocks',
  'custom',
  'generic',
  'homeassistant',
  'robots_humanoid',
  'robots_transform',
  'robots_wheel',
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
