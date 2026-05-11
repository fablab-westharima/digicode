/**
 * blocklyContrast.ts WCAG 2.1 contrast 計算 + pickTextStyle 判定 unit tests
 *
 * monkey-patch (installContrastTextPatch) は DOM 必要なため別途手動 UI verify、
 * 本 file は純粋関数のみ test。
 */
import { describe, it, expect } from 'vitest';
import {
  relativeLuminance,
  contrastRatio,
  pickTextStyle,
  __testing__,
} from '../blocklyContrast';

describe('relativeLuminance (WCAG 2.1)', () => {
  it('returns 1.0 for pure white', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1.0, 4);
  });

  it('returns 0.0 for pure black', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0.0, 4);
  });

  it('handles hex without # prefix', () => {
    expect(relativeLuminance('ffffff')).toBeCloseTo(1.0, 4);
  });

  it('returns 0 for invalid hex (defensive)', () => {
    expect(relativeLuminance('#xyz')).toBe(0);
    expect(relativeLuminance('not-a-color')).toBe(0);
  });

  it('matches reference values for primary colors', () => {
    // sRGB pure red/green/blue WCAG 公式 reference
    expect(relativeLuminance('#ff0000')).toBeCloseTo(0.2126, 3);
    expect(relativeLuminance('#00ff00')).toBeCloseTo(0.7152, 3);
    expect(relativeLuminance('#0000ff')).toBeCloseTo(0.0722, 3);
  });
});

describe('contrastRatio (WCAG 2.1)', () => {
  it('returns 21.0 for white/black (max)', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21.0, 1);
  });

  it('returns 1.0 for identical colors (min)', () => {
    expect(contrastRatio('#facc15', '#facc15')).toBeCloseTo(1.0, 4);
  });

  it('is symmetric (fg/bg interchangeable)', () => {
    const a = contrastRatio('#facc15', '#ffffff');
    const b = contrastRatio('#ffffff', '#facc15');
    expect(a).toBeCloseTo(b, 4);
  });

  it('confirms LED yellow vs white fails WCAG by huge margin', () => {
    // dark theme led_blocks colourPrimary = #facc15
    expect(contrastRatio('#ffffff', '#facc15')).toBeLessThan(2.0);
  });

  it('confirms sound lime vs white fails WCAG', () => {
    // dark theme sound_blocks colourPrimary = #a3e635
    expect(contrastRatio('#ffffff', '#a3e635')).toBeLessThan(2.5);
  });

  it('confirms CAM dark color fails dark text WCAG (must use white)', () => {
    // cameraBlocks.ts CAM_COLOR = #212121
    expect(contrastRatio('#1f2937', '#212121')).toBeLessThan(2.0);
    expect(contrastRatio('#ffffff', '#212121')).toBeGreaterThan(15);
  });
});

describe('pickTextStyle (case 18 mitigation evidence、BUG-081 follow-up #2 で outline 廃止)', () => {
  it('returns dark text for bright LED yellow', () => {
    const result = pickTextStyle('#facc15');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
  });

  it('returns dark text for bright sound lime', () => {
    const result = pickTextStyle('#a3e635');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
  });

  it('returns dark text for sensor cyan', () => {
    const result = pickTextStyle('#22d3ee');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
  });

  it('returns white text for camera dark color', () => {
    const result = pickTextStyle('#212121');
    expect(result.fill).toBe(__testing__.LIGHT_TEXT);
  });

  it('returns white text for LORA deep purple', () => {
    const result = pickTextStyle('#4B0082');
    expect(result.fill).toBe(__testing__.LIGHT_TEXT);
  });

  it('returns white text for HA Light yellow (#FFEB3B)', () => {
    // 第101回 follow-up trigger 案件、case-insensitive hex 受容と higher contrast 採択 verify
    const result = pickTextStyle('#FFEB3B');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
  });

  it('returns white text for mid-luminance gray #888888 (両方 AA 未達 → higher contrast = white)', () => {
    // DARK=#374151 (gray-700) で再計算: white ratio ≈ 3.54 (fail) / dark ratio ≈ 2.91 (fail)
    // higher contrast 側 = white (旧 gray-800 では dark wins だったが、gray-700 化で逆転)
    const result = pickTextStyle('#888888');
    expect(result.fill).toBe(__testing__.LIGHT_TEXT);
  });

  it('returns white text for mid-luminance gray #7d7d7d (両方 AA 未達 → higher contrast = white)', () => {
    // DARK=#374151 で: white ratio ≈ 4.12 (fail) / dark ratio ≈ 2.50 (fail)、higher = white
    const result = pickTextStyle('#7d7d7d');
    expect(result.fill).toBe(__testing__.LIGHT_TEXT);
  });

  it('returns dark text for #aaaaaa (lighter gray、dark borderline 4.44 で AA fail だが higher contrast)', () => {
    // DARK=#374151 で: white ratio ≈ 2.32 (fail) / dark ratio ≈ 4.44 (fail by 0.06)、
    // higher contrast 側 = dark
    const result = pickTextStyle('#aaaaaa');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
  });

  it('respects WCAG AA threshold (4.5:1) for boundary cases', () => {
    // black on white → white ratio = 1, dark ratio ≈ 10.31 → dark wins (AA pass)
    const onWhite = pickTextStyle('#ffffff');
    expect(onWhite.fill).toBe(__testing__.DARK_TEXT);
    // white on black → white ratio = 21 → white wins (AA pass)
    const onBlack = pickTextStyle('#000000');
    expect(onBlack.fill).toBe(__testing__.LIGHT_TEXT);
  });

  it('returns object with fill only (needsOutline removed in follow-up #2)', () => {
    const result = pickTextStyle('#facc15');
    expect(Object.keys(result)).toEqual(['fill']);
  });
});

describe('module constants (sanity check)', () => {
  it('DARK_TEXT matches Tailwind gray-700 (BUG-081 follow-up #5 で gray-600 → gray-700 に戻し)', () => {
    expect(__testing__.DARK_TEXT).toBe('#374151');
  });

  it('LIGHT_TEXT is pure white', () => {
    expect(__testing__.LIGHT_TEXT).toBe('#ffffff');
  });

  it('WCAG_AA_NORMAL threshold is 4.5', () => {
    expect(__testing__.WCAG_AA_NORMAL).toBe(4.5);
  });

  it('class name follows blockly-text-* convention', () => {
    expect(__testing__.CLASS_DARK).toBe('blockly-text-dark');
  });
});
