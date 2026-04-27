/**
 * primitive-fillers.ts
 *
 * Builds primitive value-producing blocks (math_number / text / logic_boolean /
 * tft_color_rgb) for filling required value sockets during case synthesis.
 *
 * Catalog audit (2026-04-28):
 * - `colour_picker` is NOT in the catalog and no block accepts a Colour check;
 *   `tft_color_rgb` is the sole Colour producer.
 * - `text` is absent from the three robots_* modes, so String/ANY in a robots
 *   mode falls back to `math_number` (Arduino Serial.print accepts numbers).
 * - `math_number` and `logic_boolean` exist in all 7 modes.
 */

import type { CatalogBlock, Mode } from './catalog-types';
import type { BlockNode } from './xml-builder';

const CHECK_TO_PRIMITIVES: Record<string, string[]> = {
  Number: ['math_number'],
  Boolean: ['logic_boolean'],
  String: ['text', 'math_number'],
  Colour: ['tft_color_rgb', 'math_number'],
};

const ANY_PRIMITIVES = ['text', 'math_number'];

function buildPrimitive(type: string): BlockNode {
  switch (type) {
    case 'math_number':
      return { type, fields: { NUM: 0 } };
    case 'text':
      return { type, fields: { TEXT: '' } };
    case 'logic_boolean':
      return { type, fields: { BOOL: 'TRUE' } };
    case 'tft_color_rgb':
      return { type, fields: { R: 0, G: 0, B: 0 } };
    default:
      return { type: 'math_number', fields: { NUM: 0 } };
  }
}

/**
 * Pick a primitive block that satisfies the given value-input check **and**
 * is allowed in the given mode. Falls back to math_number, which exists in
 * every mode in the current catalog.
 */
export function fillerForCheck(
  check: string | undefined | null,
  mode: Mode,
  blockIndex: Map<string, CatalogBlock>,
): BlockNode {
  const candidates =
    check && CHECK_TO_PRIMITIVES[check] ? CHECK_TO_PRIMITIVES[check] : ANY_PRIMITIVES;

  for (const type of candidates) {
    const blk = blockIndex.get(type);
    if (blk && blk.modes.includes(mode)) {
      return buildPrimitive(type);
    }
  }
  return buildPrimitive('math_number');
}
