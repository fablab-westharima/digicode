import { describe, it, expect } from 'vitest';
import { loadCatalog, indexByType } from './catalog';
import { fillerForCheck } from './primitive-fillers';

const cat = loadCatalog();
const idx = indexByType(cat);

describe('fillerForCheck', () => {
  it('returns math_number for Number check', () => {
    const node = fillerForCheck('Number', 'all_blocks', idx);
    expect(node.type).toBe('math_number');
    expect(node.fields?.NUM).toBe(0);
  });

  it('returns logic_boolean for Boolean check', () => {
    const node = fillerForCheck('Boolean', 'all_blocks', idx);
    expect(node.type).toBe('logic_boolean');
    expect(node.fields?.BOOL).toBe('TRUE');
  });

  it('returns text for String check in modes that have text', () => {
    const node = fillerForCheck('String', 'programming', idx);
    expect(node.type).toBe('text');
  });

  it('falls back to math_number for String check in robotics (no text block)', () => {
    const node = fillerForCheck('String', 'robotics', idx);
    expect(node.type).toBe('math_number');
  });

  it('handles ANY (undefined check) — math_number first in every mode (BUG-062)', () => {
    // BUG-062: setCheck(null) sockets land in C++ int contexts (variables_set
    // hoisted to int by BUG-060, preferences_put TYPE=Int default, array_set
    // on int arrays). Picking math_number first keeps those compile-clean;
    // text was the previous default and produced the cluster #13 errors.
    expect(fillerForCheck(undefined, 'all_blocks', idx).type).toBe('math_number');
    expect(fillerForCheck(undefined, 'robotics', idx).type).toBe('math_number');
  });

  it('returns tft_color_rgb for Colour check in modes that have it', () => {
    const node = fillerForCheck('Colour', 'all_blocks', idx);
    expect(node.type).toBe('tft_color_rgb');
    expect(node.fields).toEqual({ R: 0, G: 0, B: 0 });
  });

  it('falls back to math_number for Colour check in robots modes (no tft_color_rgb)', () => {
    const node = fillerForCheck('Colour', 'robotics', idx);
    expect(node.type).toBe('math_number');
  });

  it('treats unknown check string as ANY — math_number in every mode (BUG-062)', () => {
    expect(fillerForCheck('Frobnicator', 'all_blocks', idx).type).toBe('math_number');
    expect(fillerForCheck('Frobnicator', 'robotics', idx).type).toBe('math_number');
  });

  it('ANY filler emits literal 0 — safe in int / String / numeric Serial.print contexts (BUG-062)', () => {
    // The chosen primitive must be 'math_number' with NUM=0 so the C++ output
    // is a bare `0`. That value type-checks against `int` declarations
    // (BUG-060 hoist) and Serial.print(0) compiles cleanly too.
    const node = fillerForCheck(undefined, 'all_blocks', idx);
    expect(node.type).toBe('math_number');
    expect(node.fields?.NUM).toBe(0);
  });
});
