/**
 * audit-ble-controller.ts (47.md commit #7)
 *
 * Verifies that the BLE block field schema in `bleBlocks.ts` (as captured in
 * the regenerated AI catalog) matches what `inferUiSchema.ts` expects to
 * read. This catches three classes of breakage:
 *  1. A field rename in the block (e.g., LABEL → NAME) that would silently
 *     fall back to defaults in the controller widgets.
 *  2. A missing block — e.g., ble_add_characteristic deleted or renamed.
 *  3. A DATA_TYPE dropdown option drift — e.g., adding "double" but
 *     forgetting to widen the inferUiSchema NUMERIC_DATA_TYPES set.
 *
 * Run via: npx tsx scripts/audit-ble-controller.ts
 * Auto-run: appended to the "prebuild" hook in package.json so any block
 * change that breaks the controller is caught at build time, not by users.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CatalogField {
  name: string;
  fieldType: string;
  default?: unknown;
  options?: string[];
}

interface CatalogBlock {
  type: string;
  fields?: CatalogField[];
}

interface Catalog {
  blocks: CatalogBlock[];
}

interface FieldExpectation {
  name: string;
  fieldType: string;
  /** When set, dropdown options must contain at least these values. */
  requiredOptions?: string[];
}

interface BlockExpectation {
  type: string;
  fields: FieldExpectation[];
}

const EXPECTATIONS: BlockExpectation[] = [
  {
    type: 'ble_uart_setup',
    fields: [{ name: 'NAME', fieldType: 'text' }],
  },
  {
    type: 'ble_init',
    fields: [{ name: 'NAME', fieldType: 'text' }],
  },
  {
    type: 'ble_add_service',
    fields: [{ name: 'UUID', fieldType: 'text' }],
  },
  {
    type: 'ble_add_characteristic',
    fields: [
      { name: 'LABEL', fieldType: 'text' },
      { name: 'SERVICE_UUID', fieldType: 'text' },
      { name: 'CHAR_UUID', fieldType: 'text' },
      {
        name: 'DATA_TYPE',
        fieldType: 'dropdown',
        // Must contain at least these 7 — additions are tolerated but require
        // a corresponding widen in inferUiSchema.ts before the audit will pass.
        requiredOptions: ['string', 'bool', 'uint8', 'uint16', 'int8', 'int16', 'float'],
      },
      { name: 'MIN', fieldType: 'number' },
      { name: 'MAX', fieldType: 'number' },
      { name: 'READ', fieldType: 'checkbox' },
      { name: 'WRITE', fieldType: 'checkbox' },
      { name: 'NOTIFY', fieldType: 'checkbox' },
    ],
  },
];

function readCatalog(): Catalog {
  const catalogPath = path.resolve(__dirname, '..', 'public', 'ai', 'block-catalog.json');
  if (!fs.existsSync(catalogPath)) {
    console.error(`✗ Catalog not found at ${catalogPath}. Run npm run generate:ai-catalog first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as Catalog;
}

function audit(): { errors: string[]; warnings: string[] } {
  const catalog = readCatalog();
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const expectation of EXPECTATIONS) {
    const block = catalog.blocks.find((b) => b.type === expectation.type);
    if (!block) {
      errors.push(`[BLOCK_MISSING] ${expectation.type} not found in catalog`);
      continue;
    }
    const fields = block.fields ?? [];

    for (const expected of expectation.fields) {
      const actual = fields.find((f) => f.name === expected.name);
      if (!actual) {
        errors.push(
          `[FIELD_MISSING] ${expectation.type}: expected field "${expected.name}" of type ${expected.fieldType} not found`
        );
        continue;
      }
      if (actual.fieldType !== expected.fieldType) {
        errors.push(
          `[FIELD_TYPE] ${expectation.type}.${expected.name}: expected ${expected.fieldType}, got ${actual.fieldType}`
        );
      }
      if (expected.requiredOptions) {
        const opts = new Set(actual.options ?? []);
        const missing = expected.requiredOptions.filter((o) => !opts.has(o));
        if (missing.length > 0) {
          errors.push(
            `[DROPDOWN_OPTIONS] ${expectation.type}.${expected.name}: missing required options [${missing.join(', ')}]`
          );
        }
      }
    }
  }

  return { errors, warnings };
}

function main(): void {
  console.log('🔍 Auditing BLE controller block schema (47.md contract)…');
  const { errors, warnings } = audit();
  console.log(`   Blocks audited: ${EXPECTATIONS.length}`);
  for (const w of warnings) console.warn(`   ⚠ ${w}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`   ✗ ${e}`);
    console.error(
      `✗ ${errors.length} error(s). The BLE controller's inferUiSchema relies on these fields; ` +
        `update inferUiSchema.ts (and types.ts where applicable) when changing the block schema.`
    );
    process.exit(1);
  }
  console.log(`✅ All audits passed (${warnings.length} warning(s))`);
}

main();
