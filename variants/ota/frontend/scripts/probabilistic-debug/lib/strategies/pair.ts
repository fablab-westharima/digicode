/**
 * Pair strategy — two-block co-occurrence cases.
 *
 * Recipes come from three sources:
 *
 *   deriveInitUsePairs    — auto-extracted from catalog naming convention
 *                           (any block ending in _init/_begin/_attach/etc.
 *                           paired with up to 3 peers sharing the same prefix).
 *   controlFlowPairs      — controls_* block as setup, common body block as loop.
 *   communicationPairs    — hand-curated transport pairs (serial/wifi/mqtt).
 *
 * Categories drive placement:
 *   isStatement=true setup  → goes into arduino_setup.SETUP
 *   hasOutput=true   setup  → wrapped in controls_if(IF0=…) inside SETUP
 *   rootOnly         setup  → emitted as a standalone 3rd root
 *   isStatement=true loop   → goes into arduino_loop.LOOP
 *   hasOutput=true   loop   → wrapped in esp32_serial_println(VALUE=…) inside LOOP
 *   rootOnly         loop   → emitted as a standalone extra root
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

export interface PairOptions {
  startIndex?: number;
  /** Cap on emitted cases (default 200). */
  maxCount?: number;
}

const INIT_SUFFIX_RE =
  /_(init|begin|attach|setup|connect|create|start|mount)$/;

const TRIVIAL_TYPES = new Set([
  'arduino_setup',
  'arduino_loop',
  'math_number',
  'text',
  'logic_boolean',
]);

interface PairRecipe {
  setup: string;
  loop: string;
  label: string;
}

function deriveInitUsePairs(catalog: Catalog): PairRecipe[] {
  const recipes: PairRecipe[] = [];
  const inits = catalog.blocks.filter((b) => INIT_SUFFIX_RE.test(b.type));
  for (const init of inits) {
    if (TRIVIAL_TYPES.has(init.type)) continue;
    const prefix = init.type.replace(INIT_SUFFIX_RE, '');
    if (!prefix) continue;
    const peers = catalog.blocks.filter(
      (b) =>
        b.type !== init.type &&
        b.type.startsWith(prefix + '_') &&
        !TRIVIAL_TYPES.has(b.type),
    );
    for (const peer of peers.slice(0, 3)) {
      recipes.push({
        setup: init.type,
        loop: peer.type,
        label: `${init.type}+${peer.type}`,
      });
    }
  }
  return recipes;
}

function controlFlowPairs(): PairRecipe[] {
  const ctrlBlocks = [
    'controls_if',
    'controls_ifelse',
    'controls_for',
    'controls_repeat_ext',
    'controls_whileUntil',
  ];
  const bodies = [
    'esp32_serial_println',
    'esp32_serial_print',
    'esp32_digital_write',
    'esp32_pin_mode',
    'variables_set',
    'esp32_delay',
  ];
  const recipes: PairRecipe[] = [];
  for (const c of ctrlBlocks) {
    for (const b of bodies) {
      recipes.push({ setup: c, loop: b, label: `${c}+${b}` });
    }
  }
  return recipes;
}

function communicationPairs(): PairRecipe[] {
  return [
    { setup: 'esp32_serial_begin', loop: 'esp32_serial_println', label: 'serial_begin+println' },
    { setup: 'esp32_serial_begin', loop: 'esp32_serial_print', label: 'serial_begin+print' },
    { setup: 'serial2_begin', loop: 'serial2_println', label: 'serial2_begin+println' },
    { setup: 'serial2_begin', loop: 'serial2_print', label: 'serial2_begin+print' },
    { setup: 'serial2_begin', loop: 'serial2_read', label: 'serial2_begin+read' },
    { setup: 'wifi_connect', loop: 'wifi_get_ip', label: 'wifi_connect+get_ip' },
    { setup: 'wifi_connect', loop: 'wifi_get_rssi', label: 'wifi_connect+rssi' },
    { setup: 'wifi_connect', loop: 'mqtt_publish', label: 'wifi+mqtt_publish' },
    { setup: 'wifi_connect', loop: 'ntp_get_time', label: 'wifi+ntp_get_time' },
    { setup: 'mqtt_setup', loop: 'mqtt_publish', label: 'mqtt_setup+publish' },
    { setup: 'mqtt_setup', loop: 'mqtt_subscribe', label: 'mqtt_setup+subscribe' },
    { setup: 'mqtt_connect', loop: 'mqtt_publish', label: 'mqtt_connect+publish' },
    { setup: 'ntp_init', loop: 'ntp_get_time', label: 'ntp+get_time' },
    { setup: 'ble_init', loop: 'ble_uart_write', label: 'ble_init+uart_write' },
    { setup: 'ble_uart_setup', loop: 'ble_uart_write', label: 'ble_uart_setup+write' },
  ];
}

export function generatePairCases(
  catalog: Catalog,
  options: PairOptions = {},
): GeneratedCase[] {
  const idx = indexByType(catalog);
  const cap = options.maxCount ?? 200;
  let seq = options.startIndex ?? 1;
  const cases: GeneratedCase[] = [];

  const recipes = [
    ...deriveInitUsePairs(catalog),
    ...controlFlowPairs(),
    ...communicationPairs(),
  ];

  const seen = new Set<string>();
  const deduped = recipes.filter((r) => {
    if (seen.has(r.label)) return false;
    seen.add(r.label);
    return true;
  });

  for (const recipe of deduped) {
    if (cases.length >= cap) break;
    const out = buildPairCase(recipe, catalog, idx, generateCaseId(seq));
    if (!out) continue;
    cases.push(out);
    seq++;
  }

  return cases;
}

function buildPairCase(
  recipe: PairRecipe,
  catalog: Catalog,
  idx: Map<string, CatalogBlock>,
  id: string,
): GeneratedCase | null {
  const setupBlock = idx.get(recipe.setup);
  const peerBlock = idx.get(recipe.loop);
  if (!setupBlock || !peerBlock) return null;

  const sharedModes = setupBlock.modes.filter((m) =>
    peerBlock.modes.includes(m),
  );
  if (sharedModes.length === 0) return null;
  const mode: Mode = sharedModes.includes('all_blocks')
    ? 'all_blocks'
    : sharedModes[0];

  const preferredBoard = catalog.boards.find(
    (b) =>
      b.id === 'esp32-generic' &&
      isBlockAllowedOnBoard(setupBlock, b) &&
      isBlockAllowedOnBoard(peerBlock, b),
  );
  const board =
    preferredBoard ??
    catalog.boards.find(
      (b) =>
        isBlockAllowedOnBoard(setupBlock, b) &&
        isBlockAllowedOnBoard(peerBlock, b),
    );
  if (!board) return null;

  const setupSynth = synthesizeBlock(setupBlock, { mode, blockIndex: idx });
  const peerSynth = synthesizeBlock(peerBlock, { mode, blockIndex: idx });

  let setupChild: BlockNode | undefined;
  let loopChild: BlockNode | undefined;
  const extraRoots: BlockNode[] = [];

  if (setupBlock.isStatement) {
    setupChild = setupSynth;
  } else if (setupBlock.hasOutput) {
    setupChild = {
      type: 'controls_if',
      values: { IF0: setupSynth },
    };
  } else {
    extraRoots.push({ ...setupSynth, x: 50, y: 650 });
  }

  if (peerBlock.isStatement) {
    loopChild = peerSynth;
  } else if (peerBlock.hasOutput) {
    loopChild = {
      type: 'esp32_serial_println',
      values: { VALUE: peerSynth },
    };
  } else {
    extraRoots.push({ ...peerSynth, x: 50, y: 850 });
  }

  const roots: BlockNode[] = [
    {
      type: 'arduino_setup',
      x: 50,
      y: 50,
      ...(setupChild ? { statements: { SETUP: setupChild } } : {}),
    },
    {
      type: 'arduino_loop',
      x: 50,
      y: 350,
      ...(loopChild ? { statements: { LOOP: loopChild } } : {}),
    },
    ...extraRoots,
  ];

  const issues = validateRoots(roots, { mode, board, blockIndex: idx });
  if (issues.length > 0) {
    const summary = issues
      .map((i) => `  - ${i.path} [${i.blockType}]: ${i.reason}`)
      .join('\n');
    throw new Error(
      `Pair case "${recipe.label}" failed validation:\n${summary}`,
    );
  }

  return {
    id,
    strategy: 'pair',
    mode,
    boardId: board.id,
    blocksUsed: collectBlockTypes(roots),
    xml: emitXml(roots),
  };
}
