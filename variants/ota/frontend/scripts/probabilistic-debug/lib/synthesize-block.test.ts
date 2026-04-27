import { describe, it, expect } from 'vitest';
import { loadCatalog, indexByType } from './catalog';
import { synthesizeBlock, synthesizeField } from './synthesize-block';
import type { CatalogField } from './catalog-types';

const cat = loadCatalog();
const idx = indexByType(cat);

describe('synthesizeField', () => {
  it('uses default when present (non-null)', () => {
    const f: CatalogField = {
      name: 'PIN',
      fieldType: 'number',
      default: 13,
      min: 0,
      max: 39,
    };
    expect(synthesizeField(f)).toBe(13);
  });

  it('falls through default=null to fieldType-specific synthesis', () => {
    const f: CatalogField = {
      name: 'PIN_LL',
      fieldType: 'number',
      default: null,
      min: 0,
      max: 39,
    };
    expect(synthesizeField(f)).toBe(0);
  });

  it('uses min for number/angle without default', () => {
    expect(
      synthesizeField({ name: 'X', fieldType: 'number', min: 5, max: 10 }),
    ).toBe(5);
    expect(synthesizeField({ name: 'A', fieldType: 'angle', min: 90 })).toBe(
      90,
    );
  });

  it('uses 0 for number/angle without default and without min', () => {
    expect(synthesizeField({ name: 'NUM', fieldType: 'number' })).toBe(0);
  });

  it('returns first dropdown option when no default', () => {
    expect(
      synthesizeField({
        name: 'OP',
        fieldType: 'dropdown',
        options: ['EQ', 'NEQ'],
      }),
    ).toBe('EQ');
  });

  it("returns 'TRUE' for checkbox without default", () => {
    expect(synthesizeField({ name: 'READ_ONLY', fieldType: 'checkbox' })).toBe(
      'TRUE',
    );
  });

  it('uses TEXT_FIELD_DEFAULTS for known names', () => {
    expect(synthesizeField({ name: 'VAR', fieldType: 'text' })).toBe('i');
    expect(synthesizeField({ name: 'HOSTNAME', fieldType: 'text' })).toBe(
      'digicode',
    );
  });

  it("returns 'value' for unknown text field name", () => {
    expect(synthesizeField({ name: 'WHATEVER', fieldType: 'text' })).toBe(
      'value',
    );
  });
});

describe('synthesizeBlock', () => {
  it('synthesizes esp32_pin_mode with all required fields', () => {
    const b = idx.get('esp32_pin_mode');
    expect(b).toBeDefined();
    if (!b) return;
    const node = synthesizeBlock(b, { mode: 'generic', blockIndex: idx });
    expect(node.type).toBe('esp32_pin_mode');
    expect(node.fields?.PIN).toBeDefined();
    expect(node.fields?.MODE).toBeDefined();
    expect(node.values).toBeUndefined();
  });

  it('synthesizes esp32_delay with TIME value socket filled by Number filler', () => {
    const b = idx.get('esp32_delay');
    expect(b).toBeDefined();
    if (!b) return;
    const node = synthesizeBlock(b, { mode: 'generic', blockIndex: idx });
    expect(node.values?.TIME?.type).toBe('math_number');
  });

  it('omits fields/values for arduino_setup (no fields, no value inputs)', () => {
    const b = idx.get('arduino_setup');
    expect(b).toBeDefined();
    if (!b) return;
    const node = synthesizeBlock(b, { mode: 'generic', blockIndex: idx });
    expect(node.type).toBe('arduino_setup');
    expect(node.fields).toBeUndefined();
    expect(node.values).toBeUndefined();
  });

  it('leaves statementInputs empty (handler body unset)', () => {
    const b = idx.get('ble_uart_on_receive');
    expect(b).toBeDefined();
    if (!b) return;
    const node = synthesizeBlock(b, { mode: 'all_blocks', blockIndex: idx });
    expect(node.statements).toBeUndefined();
  });

  it('synthesizes every catalog block without throwing (smoke)', () => {
    for (const block of cat.blocks) {
      // Pick the first mode the block supports (always non-empty per audit).
      const mode = block.modes[0];
      expect(() =>
        synthesizeBlock(block, { mode, blockIndex: idx }),
      ).not.toThrow();
    }
  });
});
