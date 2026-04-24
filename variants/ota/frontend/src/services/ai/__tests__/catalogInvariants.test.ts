import { describe, it, expect } from 'vitest';
import catalog from '../../../../public/ai/block-catalog.json';

interface CatalogField {
  name: string;
  type?: string;
  options?: unknown[];
  isCredential?: boolean;
}

interface CatalogInput {
  name: string;
  check?: string;
}

interface CatalogBlock {
  type: string;
  isStatement: boolean;
  hasOutput: boolean;
  fields: CatalogField[];
  valueInputs: CatalogInput[];
  statementInputs: CatalogInput[];
}

describe('catalog invariants', () => {
  const blocks = catalog.blocks as unknown as CatalogBlock[];
  const byType: Record<string, CatalogBlock> = Object.fromEntries(blocks.map((b) => [b.type, b]));

  it('bmp280_read is a value block with TYPE dropdown', () => {
    const b = byType['bmp280_read'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
    expect(b.fields.find((f) => f.name === 'TYPE')?.options).toEqual(['temp', 'pres']);
  });

  it('wifi_connect has SSID and PASSWORD as credentials', () => {
    const b = byType['wifi_connect'];
    expect(b).toBeDefined();
    expect(b.fields.find((f) => f.name === 'SSID')?.isCredential).toBe(true);
    expect(b.fields.find((f) => f.name === 'PASSWORD')?.isCredential).toBe(true);
  });

  it('math_number is a value block (not statement)', () => {
    const b = byType['math_number'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
  });

  it('arduino_setup is a hat block with SETUP statement input', () => {
    const b = byType['arduino_setup'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(false);
    expect(b.statementInputs.map((s) => s.name)).toContain('SETUP');
  });

  it('esp32_delay has TIME value input with Number check', () => {
    const b = byType['esp32_delay'];
    expect(b).toBeDefined();
    expect(b.valueInputs.find((v) => v.name === 'TIME')?.check).toBe('Number');
  });

  it('variables_get exists as value block with VAR field', () => {
    const b = byType['variables_get'];
    expect(b).toBeDefined();
    expect(b.hasOutput).toBe(true);
    expect(b.isStatement).toBe(false);
    expect(b.fields.find((f) => f.name === 'VAR')).toBeDefined();
  });

  it('variables_set exists as statement block with VAR field and VALUE input', () => {
    const b = byType['variables_set'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(true);
    expect(b.hasOutput).toBe(false);
    expect(b.fields.find((f) => f.name === 'VAR')).toBeDefined();
    expect(b.valueInputs.find((v) => v.name === 'VALUE')).toBeDefined();
  });

  it('controls_for has VAR field', () => {
    const b = byType['controls_for'];
    expect(b).toBeDefined();
    expect(b.fields.find((f) => f.name === 'VAR')).toBeDefined();
  });

  it('tft_fill_screen has COLOR field defined', () => {
    const b = byType['tft_fill_screen'];
    expect(b).toBeDefined();
    expect(b.fields.find((f) => f.name === 'COLOR')).toBeDefined();
  });

  it('no block has both isStatement and hasOutput true', () => {
    for (const b of blocks) {
      expect(b.isStatement && b.hasOutput, `${b.type}: isStatement and hasOutput both true`).toBe(false);
    }
  });
});
