/**
 * Template strategy — sweep parameter values across the canonical sample set.
 *
 * For every entry in `sampleProjects` we keep the original XML and emit up
 * to 10 variants by string-replacing common field values (PIN/BAUD/NUM).
 * Variants are gated by content: a sample with no PIN field skips the PIN
 * sweep. With 37 samples and a default cap of 200, the realistic emission
 * lands around 180-220 → trimmed to 200.
 *
 * Validation: the source XMLs are already audited by
 * `scripts/audit-data-consistency.ts`. Field-value swaps cannot introduce
 * catalog-invalid block types or alter mode/board compatibility, so we skip
 * the per-case `validateRoots` round-trip here.
 */

import { sampleProjects } from '../../../../src/data/sampleProjects';
import type { Catalog } from '../catalog-types';
import type { GeneratedCase } from '../case-types';
import { generateCaseId } from '../case-helpers';

const PIN_SWEEP: readonly number[] = [4, 13, 27, 33, 5];
const BAUD_SWEEP: readonly number[] = [9600, 38400];
const NUM_SWEEP: readonly number[] = [10, 100, 500];

function replaceField(
  xml: string,
  fieldName: string,
  newValue: string | number,
): string {
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return xml.replace(
    new RegExp(`(<field name="${escaped}">)[^<]*(</field>)`, 'g'),
    (_match, open: string, close: string) => `${open}${newValue}${close}`,
  );
}

function extractBlockTypes(xml: string): string[] {
  const set = new Set<string>();
  const re = /<block\s+type="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    set.add(match[1]);
  }
  return [...set].sort();
}

export interface TemplateOptions {
  startIndex?: number;
  /** Cap on emitted cases (default 200). */
  maxCount?: number;
}

export function generateTemplateCases(
  catalog: Catalog,
  options: TemplateOptions = {},
): GeneratedCase[] {
  const cap = options.maxCount ?? 200;
  let seq = options.startIndex ?? 1;
  const cases: GeneratedCase[] = [];

  const preferred = catalog.boards.find((b) => b.id === 'esp32-generic');
  if (!preferred) {
    throw new Error(
      'Template strategy expects esp32-generic in catalog.boards',
    );
  }
  const boardId = preferred.id;

  for (const sample of sampleProjects) {
    if (cases.length >= cap) break;
    const variants: string[] = [sample.blocklyXml];

    if (/<field name="PIN">/.test(sample.blocklyXml)) {
      for (const pin of PIN_SWEEP) {
        variants.push(replaceField(sample.blocklyXml, 'PIN', pin));
      }
    }
    if (/<field name="BAUD">/.test(sample.blocklyXml)) {
      for (const baud of BAUD_SWEEP) {
        variants.push(replaceField(sample.blocklyXml, 'BAUD', baud));
      }
    }
    if (/<field name="NUM">/.test(sample.blocklyXml)) {
      for (const num of NUM_SWEEP) {
        variants.push(replaceField(sample.blocklyXml, 'NUM', num));
      }
    }

    for (const xml of variants) {
      if (cases.length >= cap) break;
      cases.push({
        id: generateCaseId(seq++),
        strategy: 'template',
        mode: 'all_blocks',
        boardId,
        blocksUsed: extractBlockTypes(xml),
        xml,
      });
    }
  }

  return cases;
}
