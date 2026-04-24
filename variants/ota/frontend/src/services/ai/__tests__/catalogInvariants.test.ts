import { describe, it, expect } from 'vitest';
import catalog from '../../../../public/ai/block-catalog.json';

describe('catalog invariants', () => {
  const byType = Object.fromEntries(catalog.blocks.map((b: any) => [b.type, b]));

  it('bmp280_read is a value block with TYPE dropdown', () => {
    const b = byType['bmp280_read'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(false);
    expect(b.hasOutput).toBe(true);
    expect(b.fields.find((f: any) => f.name === 'TYPE')?.options).toEqual(['temp', 'pres']);
  });

  it('wifi_connect has SSID and PASSWORD as credentials', () => {
    const b = byType['wifi_connect'];
    expect(b).toBeDefined();
    expect(b.fields.find((f: any) => f.name === 'SSID')?.isCredential).toBe(true);
    expect(b.fields.find((f: any) => f.name === 'PASSWORD')?.isCredential).toBe(true);
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
    expect(b.statementInputs.map((s: any) => s.name)).toContain('SETUP');
  });

  it('esp32_delay has TIME value input with Number check', () => {
    const b = byType['esp32_delay'];
    expect(b).toBeDefined();
    expect(b.valueInputs.find((v: any) => v.name === 'TIME')?.check).toBe('Number');
  });

  it('variables_get exists as value block with VAR field', () => {
    const b = byType['variables_get'];
    expect(b).toBeDefined();
    expect(b.hasOutput).toBe(true);
    expect(b.isStatement).toBe(false);
    expect(b.fields.find((f: any) => f.name === 'VAR')).toBeDefined();
  });

  it('variables_set exists as statement block with VAR field and VALUE input', () => {
    const b = byType['variables_set'];
    expect(b).toBeDefined();
    expect(b.isStatement).toBe(true);
    expect(b.hasOutput).toBe(false);
    expect(b.fields.find((f: any) => f.name === 'VAR')).toBeDefined();
    expect(b.valueInputs.find((v: any) => v.name === 'VALUE')).toBeDefined();
  });

  it('controls_for has VAR field', () => {
    const b = byType['controls_for'];
    expect(b).toBeDefined();
    expect(b.fields.find((f: any) => f.name === 'VAR')).toBeDefined();
  });

  it('tft_fill_screen has COLOR field defined', () => {
    const b = byType['tft_fill_screen'];
    expect(b).toBeDefined();
    expect(b.fields.find((f: any) => f.name === 'COLOR')).toBeDefined();
  });

  it('no block has both isStatement and hasOutput true', () => {
    for (const b of catalog.blocks) {
      expect(b.isStatement && b.hasOutput, `${b.type}: isStatement and hasOutput both true`).toBe(false);
    }
  });
});
