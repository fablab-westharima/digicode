/**
 * jsonValidator tests (50.md §6.4).
 *
 * 5 cases covering the validation rules in jsonValidator.ts:
 *   1. valid JSON (markdown fence stripped)
 *   2. JSON parse failure
 *   3. unknown top-level key
 *   4. widgets[i].displayMode out of enum
 *   5. customCss > 4000 chars
 */
import { describe, it, expect } from 'vitest';
import { validateCustomizationDiff } from '../jsonValidator';

describe('validateCustomizationDiff', () => {
  it('accepts valid JSON wrapped in ```json fences and parses both schemaLevel + widgets', () => {
    const raw = '```json\n' + JSON.stringify({
      schemaLevel: { layout: 'columns-2', colorScheme: { accent: '#2563eb' } },
      widgets: [{ id: 'temp', displayMode: 'gauge' }],
    }) + '\n```';
    const result = validateCustomizationDiff(raw);
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.diff?.schemaLevel?.layout).toBe('columns-2');
    expect(result.diff?.schemaLevel?.colorScheme?.accent).toBe('#2563eb');
    expect(result.diff?.widgets?.[0]?.id).toBe('temp');
    expect(result.diff?.widgets?.[0]?.displayMode).toBe('gauge');
  });

  it('rejects JSON parse failure with explanatory error', () => {
    const result = validateCustomizationDiff('{ this is not json }');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/JSON parse failed/);
  });

  it('rejects unknown top-level keys', () => {
    const raw = JSON.stringify({ schemaLevel: {}, widgetExtras: [] });
    const result = validateCustomizationDiff(raw);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unknown top-level keys/);
    expect(result.error).toContain('widgetExtras');
  });

  it('rejects displayMode outside the allowed enum', () => {
    const raw = JSON.stringify({
      widgets: [{ id: 'led', displayMode: 'spinner' }],
    });
    const result = validateCustomizationDiff(raw);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/displayMode must be one of/);
  });

  it('rejects customCss exceeding 4000 chars', () => {
    const raw = JSON.stringify({
      schemaLevel: { customCss: 'a'.repeat(4001) },
    });
    const result = validateCustomizationDiff(raw);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/customCss exceeds 4000 chars/);
  });
});
