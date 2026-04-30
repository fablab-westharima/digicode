/**
 * Combo strategy — 1 init + N operation blocks in one case.
 *
 * 真因 (1000-case `2026-04-30_17-49-15` cluster top):
 *   singleton strategy が「単独 block で test」前提のため、init-dependent な
 *   操作 block (humanoid_dance / mqtt_publish / qtr_calibrate 等) を init なしで
 *   生成し、`'humanoid' was not declared` 等の未宣言 error 多発 (286 fail のうち
 *   ~101 件 = 35% を占める Pareto top)。
 *
 * combo strategy はこれを根本解決:
 *   1 つの init block (e.g. humanoid_init) + N 個の関連操作 block
 *   (humanoid_walk / humanoid_dance / humanoid_jump / ...) を 1 case にまとめる。
 *   - init は arduino_setup.SETUP に配置 (statement 型)
 *   - 操作 block N 個は arduino_loop.LOOP に next chain で連結
 *   - 操作 block の hasOutput / isStatement / rootOnly は wrapForCompilability
 *     と同等のロジックで配置 (rootOnly は extra root として独立配置)
 *
 * 別途、singleton.ts は `OPERATION_TO_INIT_MAP` を参照して操作 block の singleton
 * case 生成時に対応 init を auto-prepend する init-aware 拡張を行う (combo case
 * とセットで cluster 完全解消)。
 */

import {
  type Catalog,
  type CatalogBlock,
  type Mode,
} from '../catalog-types';
import { indexByType, isBlockAllowedOnBoard } from '../catalog';
import { synthesizeBlock } from '../synthesize-block';
import { emitXml } from '../xml-builder';
import type { BlockNode } from '../xml-builder';
import { validateRoots } from '../case-validator';
import type { GeneratedCase } from '../case-types';
import { collectBlockTypes, generateCaseId } from '../case-helpers';

export interface ComboOptions {
  startIndex?: number;
  /** Cap on emitted cases (default 30). */
  maxCount?: number;
}

export interface InitDependency {
  /** Init block type (e.g. 'humanoid_init'). */
  init: string;
  /** Operation block types that require this init (e.g. ['humanoid_walk', ...]). */
  operations: readonly string[];
  /** Optional human-readable label for combo case naming. */
  label?: string;
}

/**
 * 依存関係マップ — 7 prefix が 1000-case fail の cluster top (~101 件、35%) を占める。
 * 各 init prefix に対する操作 block を block-catalog.json grep で確認済 (2026-04-30)。
 *
 * Cluster top 対応 (HA は scope 外、cluster top に未登場のため、必要なら別途追加):
 *   1. humanoid (42 件) — humanoid_init + 10 ops
 *   2. mqtt (18 件)     — mqtt_setup + 9 ops (mqtt_setup が global を宣言する init 役)
 *   3. transform (10 件) — transform_init + 10 ops
 *   4. qtr (9 件)       — qtr_8a_init + 10 ops (qtr_8rc_init は variation で別 combo)
 *   5. _jsonDoc (8 件)  — json_create_object + 15 ops
 *   6. NUM_PIXELS (7 件) — neopixel_init + 5 ops
 *   7. wheel (7 件)     — wheel_init + 7 ops
 */
export const INIT_DEPENDENCIES: readonly InitDependency[] = [
  {
    init: 'humanoid_init',
    label: 'humanoid',
    operations: [
      'humanoid_home', 'humanoid_walk', 'humanoid_turn', 'humanoid_jump',
      'humanoid_moonwalk', 'humanoid_dance', 'humanoid_swing', 'humanoid_bend',
      'humanoid_gesture', 'humanoid_sound',
    ],
  },
  {
    init: 'transform_init',
    label: 'transform',
    operations: [
      'transform_mode', 'transform_shift', 'transform_home', 'transform_walk',
      'transform_turn', 'transform_stop', 'transform_roll', 'transform_roll_rotate',
      'transform_pushup', 'transform_dance',
    ],
  },
  {
    init: 'wheel_init',
    label: 'wheel',
    operations: [
      'wheel_forward', 'wheel_backward', 'wheel_turn_left', 'wheel_turn_right',
      'wheel_spin_left', 'wheel_spin_right', 'wheel_stop',
    ],
  },
  {
    init: 'qtr_8a_init',
    label: 'qtr-8a',
    operations: [
      'qtr_calibrate', 'qtr_auto_calibrate', 'qtr_is_calibrated',
      'qtr_line_position_normalized', 'qtr_line_position', 'qtr_line_detected',
      'qtr_read_all', 'qtr_sensor_value', 'qtr_raw_value', 'qtr_emitter_control',
    ],
  },
  {
    init: 'qtr_8rc_init',
    label: 'qtr-8rc',
    operations: [
      'qtr_calibrate', 'qtr_auto_calibrate', 'qtr_is_calibrated',
      'qtr_line_position_normalized', 'qtr_line_position', 'qtr_line_detected',
      'qtr_read_all', 'qtr_sensor_value', 'qtr_raw_value', 'qtr_emitter_control',
    ],
  },
  {
    init: 'mqtt_setup',
    label: 'mqtt',
    operations: [
      'mqtt_publish', 'mqtt_subscribe', 'mqtt_unsubscribe', 'mqtt_disconnect',
      'mqtt_loop', 'mqtt_get_state', 'mqtt_on_message',
      'mqtt_topic_value', 'mqtt_message_value',
    ],
  },
  {
    init: 'neopixel_init',
    label: 'neopixel',
    operations: [
      'neopixel_rainbow', 'neopixel_color_simple', 'neopixel_set_color',
      'neopixel_show', 'neopixel_clear',
    ],
  },
  {
    init: 'json_create_object',
    label: 'json',
    operations: [
      'json_parse', 'json_parse_size', 'json_get_string', 'json_get_number',
      'json_get_int', 'json_get_bool', 'json_get_nested', 'json_has_key',
      'json_array_size', 'json_array_get', 'json_set_bool', 'json_set_number',
      'json_set_string', 'json_to_string', 'json_to_string_pretty',
    ],
  },
];

/**
 * Operation type → required init type の逆引きマップ。
 * singleton.ts (init-aware 拡張) と combo.ts 自身が参照、cluster top 操作 block
 * の singleton 生成時に対応 init を auto-prepend するために使用。
 *
 * 同 operation が複数 init で参照される場合は最初の登場順 (= INIT_DEPENDENCIES
 * の declaration 順) で resolve する (qtr の 2 init variants は singleton では
 * qtr_8a_init を選択、combo では別 case で variation)。
 */
export const OPERATION_TO_INIT_MAP: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const dep of INIT_DEPENDENCIES) {
    for (const op of dep.operations) {
      if (!map.has(op)) {
        map.set(op, dep.init);
      }
    }
  }
  return map;
})();

/**
 * Operation block を arduino_loop.LOOP に next chain として束ねる helper。
 * - statement 型: そのまま chain の next に追加
 * - hasOutput=true: esp32_serial_println(VALUE=...) で wrap してから chain
 * - rootOnly: extra roots に独立配置 (chain せず)
 */
function buildOpsChain(
  ops: CatalogBlock[],
  mode: Mode,
  idx: Map<string, CatalogBlock>,
): { loopChain: BlockNode | null; extraRoots: BlockNode[] } {
  const loopParts: BlockNode[] = [];
  const extraRoots: BlockNode[] = [];

  for (const op of ops) {
    const synth = synthesizeBlock(op, { mode, blockIndex: idx });
    if (op.isStatement) {
      loopParts.push(synth);
    } else if (op.hasOutput) {
      loopParts.push({
        type: 'esp32_serial_println',
        values: { VALUE: synth },
      });
    } else {
      // rootOnly handler — placed as separate root, not chained.
      extraRoots.push({ ...synth });
    }
  }

  // Chain loopParts via .next (a.next = b, b.next = c, ...)
  let loopChain: BlockNode | null = null;
  for (let i = loopParts.length - 1; i >= 0; i--) {
    const part = loopParts[i];
    loopChain = loopChain ? { ...part, next: loopChain } : part;
  }

  return { loopChain, extraRoots };
}

export function generateComboCases(
  catalog: Catalog,
  options: ComboOptions = {},
): GeneratedCase[] {
  const idx = indexByType(catalog);
  const cap = options.maxCount ?? 30;
  let seq = options.startIndex ?? 1;
  const cases: GeneratedCase[] = [];

  for (const dep of INIT_DEPENDENCIES) {
    if (cases.length >= cap) break;

    const initBlock = idx.get(dep.init);
    if (!initBlock) continue; // catalog mismatch — skip

    const opBlocks = dep.operations
      .map((opType) => idx.get(opType))
      .filter((b): b is CatalogBlock => b !== undefined);
    if (opBlocks.length === 0) continue;

    // 1 combo case = init + 5 ops 程度 (operations が多い場合は variation で複数 case 生成)
    const groupSize = 5;
    for (let i = 0; i < opBlocks.length; i += groupSize) {
      if (cases.length >= cap) break;
      const opSlice = opBlocks.slice(i, i + groupSize);
      const result = buildComboCase(
        dep,
        initBlock,
        opSlice,
        catalog,
        idx,
        generateCaseId(seq),
        i / groupSize,
      );
      if (!result) continue;
      cases.push(result);
      seq++;
    }
  }

  return cases;
}

function buildComboCase(
  dep: InitDependency,
  initBlock: CatalogBlock,
  ops: CatalogBlock[],
  catalog: Catalog,
  idx: Map<string, CatalogBlock>,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _variationIdx: number,
): GeneratedCase | null {
  // Shared mode: init と全 ops に共通する mode を採用
  let sharedModes = [...initBlock.modes];
  for (const op of ops) {
    sharedModes = sharedModes.filter((m) => op.modes.includes(m));
  }
  if (sharedModes.length === 0) return null;
  const mode: Mode = sharedModes.includes('all_blocks')
    ? 'all_blocks'
    : sharedModes[0];

  // Board: esp32-generic 優先、init + 全 ops が許可される board を選択
  const allBlocks = [initBlock, ...ops];
  const preferredBoard = catalog.boards.find(
    (b) =>
      b.id === 'esp32-generic' &&
      allBlocks.every((bl) => isBlockAllowedOnBoard(bl, b)),
  );
  const board =
    preferredBoard ??
    catalog.boards.find((b) =>
      allBlocks.every((bl) => isBlockAllowedOnBoard(bl, b)),
    );
  if (!board) return null;

  // Init synthesize (must be statement、catalog で確認済の init は全て isStatement=true)
  const initSynth = synthesizeBlock(initBlock, { mode, blockIndex: idx });

  // Operations を loop chain にまとめる
  const { loopChain, extraRoots } = buildOpsChain(ops, mode, idx);

  const roots: BlockNode[] = [
    {
      type: 'arduino_setup',
      x: 50,
      y: 50,
      statements: { SETUP: initSynth },
    },
    {
      type: 'arduino_loop',
      x: 50,
      y: 350,
      ...(loopChain ? { statements: { LOOP: loopChain } } : {}),
    },
    ...extraRoots.map((r, i) => ({ ...r, x: 50, y: 650 + i * 200 })),
  ];

  const issues = validateRoots(roots, { mode, board, blockIndex: idx });
  if (issues.length > 0) {
    // validation fail → drop (combo は best-effort、cluster 解消優先)
    return null;
  }

  return {
    id,
    strategy: 'combo',
    mode,
    boardId: board.id,
    blocksUsed: collectBlockTypes(roots),
    xml: emitXml(roots),
  };
}
