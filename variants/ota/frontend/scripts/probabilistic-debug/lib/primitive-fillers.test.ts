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
    const node = fillerForCheck('String', 'generic', idx);
    expect(node.type).toBe('text');
  });

  it('falls back to math_number for String check in robots_humanoid (no text block)', () => {
    const node = fillerForCheck('String', 'robots_humanoid', idx);
    expect(node.type).toBe('math_number');
  });

  it('handles ANY (undefined check) — text in non-robots, math_number in robots', () => {
    expect(fillerForCheck(undefined, 'all_blocks', idx).type).toBe('text');
    expect(fillerForCheck(undefined, 'robots_wheel', idx).type).toBe(
      'math_number',
    );
  });

  it('returns tft_color_rgb for Colour check in modes that have it', () => {
    const node = fillerForCheck('Colour', 'all_blocks', idx);
    expect(node.type).toBe('tft_color_rgb');
    expect(node.fields).toEqual({ R: 0, G: 0, B: 0 });
  });

  it('falls back to math_number for Colour check in robots modes (no tft_color_rgb)', () => {
    const node = fillerForCheck('Colour', 'robots_humanoid', idx);
    expect(node.type).toBe('math_number');
  });

  it('treats unknown check string as ANY (text in non-robots, math_number in robots)', () => {
    expect(fillerForCheck('Frobnicator', 'all_blocks', idx).type).toBe('text');
    expect(fillerForCheck('Frobnicator', 'robots_humanoid', idx).type).toBe(
      'math_number',
    );
  });
});
