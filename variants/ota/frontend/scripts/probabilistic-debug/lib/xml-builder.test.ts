import { describe, it, expect } from 'vitest';
import { emitXml, type BlockNode } from './xml-builder';

describe('emitXml', () => {
  it('wraps roots with the Blockly xml namespace', () => {
    const out = emitXml([]);
    expect(out).toBe(
      '<xml xmlns="https://developers.google.com/blockly/xml"></xml>',
    );
  });

  it('emits a minimal block with one field', () => {
    const node: BlockNode = { type: 'math_number', fields: { NUM: 42 } };
    const out = emitXml([node]);
    expect(out).toContain('<block type="math_number"');
    expect(out).toContain('<field name="NUM">42</field>');
  });

  it('emits root coordinates only on root blocks (not on children)', () => {
    const root: BlockNode = {
      type: 'arduino_setup',
      x: 50,
      y: 50,
      statements: {
        SETUP: {
          type: 'esp32_pin_mode',
          x: 999,
          y: 999,
          fields: { PIN: 2 },
        },
      },
    };
    const out = emitXml([root]);
    expect(out).toContain('x="50"');
    expect(out).toContain('y="50"');
    expect(out).not.toContain('x="999"');
    expect(out).not.toContain('y="999"');
  });

  it('emits value sockets', () => {
    const root: BlockNode = {
      type: 'esp32_delay',
      values: {
        TIME: { type: 'math_number', fields: { NUM: 1000 } },
      },
    };
    const out = emitXml([root]);
    expect(out).toContain(
      '<value name="TIME"><block type="math_number"><field name="NUM">1000</field></block></value>',
    );
  });

  it('emits statement sockets', () => {
    const root: BlockNode = {
      type: 'arduino_loop',
      statements: {
        LOOP: { type: 'esp32_serial_println', fields: { VALUE: 'hi' } },
      },
    };
    const out = emitXml([root]);
    expect(out).toContain(
      '<statement name="LOOP"><block type="esp32_serial_println">',
    );
  });

  it('emits next chain', () => {
    const root: BlockNode = {
      type: 'esp32_digital_write',
      fields: { PIN: 2, VALUE: 'HIGH' },
      next: {
        type: 'esp32_delay',
        values: {
          TIME: { type: 'math_number', fields: { NUM: 500 } },
        },
      },
    };
    const out = emitXml([root]);
    expect(out).toContain('<next><block type="esp32_delay">');
  });

  it('escapes special characters in field text values', () => {
    const root: BlockNode = {
      type: 'text',
      fields: { TEXT: 'a < b & c > d "e" \'f\'' },
    };
    const out = emitXml([root]);
    expect(out).toContain(
      'a &lt; b &amp; c &gt; d &quot;e&quot; &apos;f&apos;',
    );
  });

  it('escapes special characters in field/socket names', () => {
    const root: BlockNode = {
      type: 'fake_block',
      fields: { 'A&B': 'v' },
    };
    const out = emitXml([root]);
    expect(out).toContain('<field name="A&amp;B">');
  });

  it('handles multiple root blocks (workspace level)', () => {
    const setup: BlockNode = { type: 'arduino_setup', x: 50, y: 50 };
    const loop: BlockNode = { type: 'arduino_loop', x: 50, y: 250 };
    const out = emitXml([setup, loop]);
    expect(out).toContain('<block type="arduino_setup"');
    expect(out).toContain('<block type="arduino_loop"');
  });

  it('emits boolean and number field values', () => {
    const root: BlockNode = {
      type: 'fake',
      fields: { READ_ONLY: true, COUNT: 42 },
    };
    const out = emitXml([root]);
    expect(out).toContain('<field name="READ_ONLY">true</field>');
    expect(out).toContain('<field name="COUNT">42</field>');
  });
});
