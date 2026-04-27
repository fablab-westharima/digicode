/**
 * synthesize-block.ts
 *
 * Build a fully-saturated BlockNode for a catalog entry: every required field
 * gets a value, every value socket gets a primitive filler. Statement sockets
 * are left empty — empty C++ bodies compile cleanly, which is what we want
 * for a coverage-oriented compile test.
 */

import type { CatalogBlock, CatalogField, Mode } from './catalog-types';
import type { BlockNode } from './xml-builder';
import { fillerForCheck } from './primitive-fillers';

/**
 * Sensible non-empty defaults for `text` fields by name. Loop variables, NVS
 * keys, hostnames etc. fail to compile (or run) when blank, so we seed them.
 */
const TEXT_FIELD_DEFAULTS: Record<string, string> = {
  VAR: 'i',
  KEY: 'key',
  PATH: 'data',
  TERM: '\n',
  TEXT: '',
  HOSTNAME: 'digicode',
  SSID: 'ssid',
  WIFI_PASS: 'pass',
  OTA_PASS: 'pass',
};

export function synthesizeField(
  field: CatalogField,
): string | number | boolean {
  if (field.default !== undefined && field.default !== null) {
    return field.default;
  }
  switch (field.fieldType) {
    case 'number':
    case 'angle':
      return field.min ?? 0;
    case 'dropdown':
      return field.options?.[0] ?? '';
    case 'checkbox':
      return 'TRUE';
    case 'text':
      return TEXT_FIELD_DEFAULTS[field.name] ?? 'value';
    default:
      return '';
  }
}

export interface SynthesizeContext {
  mode: Mode;
  blockIndex: Map<string, CatalogBlock>;
}

export function synthesizeBlock(
  block: CatalogBlock,
  ctx: SynthesizeContext,
): BlockNode {
  const node: BlockNode = { type: block.type };

  if (block.fields.length > 0) {
    node.fields = {};
    for (const f of block.fields) {
      node.fields[f.name] = synthesizeField(f);
    }
  }

  if (block.valueInputs.length > 0) {
    node.values = {};
    for (const v of block.valueInputs) {
      node.values[v.name] = fillerForCheck(v.check, ctx.mode, ctx.blockIndex);
    }
  }

  // statementInputs intentionally left empty.
  return node;
}
