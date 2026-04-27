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
  | 'supportsWifi';

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
  supportsWifi: boolean;
  supportsOta: boolean;
  supportsBle: boolean;
}

export interface CatalogBoardFilters {
  wifi: string[];
  ota: string[];
  ble: string[];
}

export interface Catalog {
  version: string;
  generatedAt: string;
  blocks: CatalogBlock[];
  boardFilters: CatalogBoardFilters;
  boards: CatalogBoard[];
}
