import { describe, it, expect } from 'vitest';
import { validateBlocklyXml } from '../xmlValidator';

const VALID_TYPES = new Set([
  'arduino_setup',
  'arduino_loop',
  'esp32_digital_write',
  'esp32_delay',
  'math_number',
]);

const VALID_XML = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="arduino_setup"></block></xml>';

describe('validateBlocklyXml', () => {
  it('valid Blockly XML passes all 4 stages', () => {
    const result = validateBlocklyXml(VALID_XML, VALID_TYPES);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitizedXml).toBe(VALID_XML);
  });

  it('returns stage-2 error when response does not start with <xml', () => {
    const result = validateBlocklyXml('Here is your code:\n' + VALID_XML, VALID_TYPES);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('<xml>');
  });

  it('returns stage-2 error for plain text response', () => {
    const result = validateBlocklyXml('To blink an LED, use arduino_setup...', VALID_TYPES);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('<xml>');
  });

  it('returns stage-3 error for malformed XML (unclosed tag)', () => {
    const result = validateBlocklyXml('<xml><block type="arduino_setup">', VALID_TYPES);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/parse error/i);
  });

  it('returns stage-4 error for unknown block types', () => {
    const xml = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="unknown_xyz"></block></xml>';
    const result = validateBlocklyXml(xml, VALID_TYPES);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('unknown_xyz');
  });

  it('strips xml code fences and validates successfully', () => {
    const withFences = '```xml\n' + VALID_XML + '\n```';
    const result = validateBlocklyXml(withFences, VALID_TYPES);
    expect(result.valid).toBe(true);
    expect(result.sanitizedXml).toBe(VALID_XML);
  });

  it('strips plain code fences and validates successfully', () => {
    const withFences = '```\n' + VALID_XML + '\n```';
    const result = validateBlocklyXml(withFences, VALID_TYPES);
    expect(result.valid).toBe(true);
    expect(result.sanitizedXml).toBe(VALID_XML);
  });
});
