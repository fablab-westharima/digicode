/**
 * Singleton strategy — one case per catalog block.
 *
 * Each case wraps the target block in arduino_setup + arduino_loop roots so
 * the compiler always emits both `void setup()` and `void loop()`. Placement
 * follows three categories:
 *   - rootOnly handler  (isStatement=false && hasOutput=false): standalone 3rd root
 *   - value-producing   (hasOutput=true):                       wrapped in
 *                                                                esp32_serial_println VALUE
 *                                                                inside the loop
 *   - statement         (isStatement=true):                     placed in
 *                                                                arduino_setup.SETUP
 *
 * `arduino_setup` and `arduino_loop` are themselves rootOnly but are special-cased
 * (the target IS one of the standard roots, so we just emit it directly).
 *
 * Init-aware extension (2026-04-30、改定log 第64回):
 *   1000-case で humanoid / mqttClient / transform / qtr / wheel / _jsonDoc /
 *   NUM_PIXELS の "未宣言" cluster top (~101 件 = 35% of fail) は、singleton
 *   が init を伴わない操作 block (humanoid_dance 等) を生成していたため。
 *   操作 block の type が `OPERATION_TO_INIT_MAP` に含まれる場合、対応 init を
 *   arduino_setup.SETUP に auto-prepend する init-aware 拡張で根本解消。
 */

import type { Catalog, CatalogBlock } from '../catalog-types';
import { indexByType } from '../catalog';
import { synthesizeBlock } from '../synthesize-block';
import { emitXml } from '../xml-builder';
import { validateRoots } from '../case-validator';
import type { GeneratedCase } from '../case-types';
import {
  pickMode,
  pickBoard,
  collectBlockTypes,
  generateCaseId,
  wrapForCompilability,
} from '../case-helpers';
import { prependInitForOp } from './combo';

export interface SingletonOptions {
  /** First case sequence number (default: 1). */
  startIndex?: number;
}

export function generateSingletonCases(
  catalog: Catalog,
  options: SingletonOptions = {},
): GeneratedCase[] {
  const idx = indexByType(catalog);
  const cases: GeneratedCase[] = [];
  let seq = options.startIndex ?? 1;

  for (const block of catalog.blocks) {
    const mode = pickMode(block);
    const board = pickBoard(block, catalog);
    const synth = synthesizeBlock(block, { mode, blockIndex: idx });
    let roots = wrapForCompilability(synth, block);

    // Init-aware: 操作 block (e.g., humanoid_dance) なら対応 init (humanoid_init)
    // を SETUP に prepend → singleton case でも未宣言 error 解消。
    roots = prependInitForOp(roots, block.type, idx, mode);

    const issues = validateRoots(roots, {
      mode,
      board,
      blockIndex: idx,
    });
    if (issues.length > 0) {
      const summary = issues
        .map((i) => `  - ${i.path} [${i.blockType}]: ${i.reason}`)
        .join('\n');
      throw new Error(
        `Singleton case for "${block.type}" failed validation:\n${summary}`,
      );
    }

    cases.push({
      id: generateCaseId(seq++),
      strategy: 'singleton',
      mode,
      boardId: board.id,
      blocksUsed: collectBlockTypes(roots),
      xml: emitXml(roots),
    });
  }

  return cases;
}

/** Helper for tests/Step-7 dispatcher: which catalog blocks are covered. */
export function singletonTargets(catalog: Catalog): CatalogBlock[] {
  return catalog.blocks;
}
