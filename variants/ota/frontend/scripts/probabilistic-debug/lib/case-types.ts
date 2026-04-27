/**
 * case-types.ts
 *
 * Shared shapes for the use-case generator (Phase 1) and downstream
 * orchestrator/analyzer/reporter phases.
 */

import type { Mode } from './catalog-types';

export type Strategy =
  | 'singleton'
  | 'pair'
  | 'template'
  | 'matrix'
  | 'edge';

export interface GeneratedCase {
  /** Zero-padded id, e.g. 'case_0001'. */
  id: string;
  strategy: Strategy;
  mode: Mode;
  boardId: string;
  /** Catalog block.type values used in this case (for traceability). */
  blocksUsed: string[];
  /** Full Blockly workspace XML, ready to POST to /api/compile. */
  xml: string;
}

export interface ManifestEntry {
  id: string;
  strategy: Strategy;
  mode: Mode;
  boardId: string;
  blocksUsed: string[];
  fileName: string;
}

export interface Manifest {
  /** Short git SHA of the generator (null when not in a git checkout). */
  generatorVersion: string | null;
  /** SHA-256 of the catalog blocks list. */
  catalogHash: string;
  catalogBlockCount: number;
  /** ISO timestamp of generation start. */
  generatedAt: string;
  seed: number;
  count: number;
  cases: ManifestEntry[];
}
