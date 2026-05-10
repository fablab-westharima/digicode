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

describe('pickTextStyle (case 18 mitigation evidence)', () => {
  it('returns dark text for bright LED yellow (no outline needed)', () => {
    const result = pickTextStyle('#facc15');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
    expect(result.needsOutline).toBe(false);
  });

  it('returns dark text for bright sound lime (no outline needed)', () => {
    const result = pickTextStyle('#a3e635');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
    expect(result.needsOutline).toBe(false);
  });

  it('returns dark text for sensor cyan (no outline needed)', () => {
    const result = pickTextStyle('#22d3ee');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
    expect(result.needsOutline).toBe(false);
  });

  it('returns white text for camera dark color (no outline needed)', () => {
    const result = pickTextStyle('#212121');
    expect(result.fill).toBe(__testing__.LIGHT_TEXT);
    expect(result.needsOutline).toBe(false);
  });

  it('returns white text for LORA deep purple (no outline needed)', () => {
    const result = pickTextStyle('#4B0082');
    expect(result.fill).toBe(__testing__.LIGHT_TEXT);
    expect(result.needsOutline).toBe(false);
  });

  it('returns dark + outline for mid-luminance gray where dark wins (両方 4.5 未達)', () => {
    // #888888 (gray) → linear lum ≈ 0.236 → white ratio ≈ 3.67 (fail) / dark ratio ≈ 3.91 (fail)
    // 両方 4.5 未達、higher contrast 側 = dark
    const result = pickTextStyle('#888888');
    expect(result.needsOutline).toBe(true);
    expect(result.fill).toBe(__testing__.DARK_TEXT);
  });

  it('returns white + outline for mid-luminance gray where white wins (両方 4.5 未達)', () => {
    // #7d7d7d (gray) → linear lum ≈ 0.202 → white ratio ≈ 4.17 (fail) / dark ratio ≈ 3.44 (fail)
    // 両方 4.5 未達、higher contrast 側 = white
    const result = pickTextStyle('#7d7d7d');
    expect(result.needsOutline).toBe(true);
    expect(result.fill).toBe(__testing__.LIGHT_TEXT);
  });

  it('returns dark text for #aaaaaa (lighter gray、dark passes AA)', () => {
    // #aaaaaa → linear lum ≈ 0.402 → dark ratio ≈ 6.17 (pass)、outline 不要
    const result = pickTextStyle('#aaaaaa');
    expect(result.fill).toBe(__testing__.DARK_TEXT);
    expect(result.needsOutline).toBe(false);
  });

  it('respects WCAG AA threshold (4.5:1)', () => {
    // black on white → white ratio = 1, dark ratio = 21 → dark, no outline
    const onWhite = pickTextStyle('#ffffff');
    expect(onWhite.fill).toBe(__testing__.DARK_TEXT);
    expect(onWhite.needsOutline).toBe(false);
    // white on black → white ratio = 21 → white, no outline
    const onBlack = pickTextStyle('#000000');
    expect(onBlack.fill).toBe(__testing__.LIGHT_TEXT);
    expect(onBlack.needsOutline).toBe(false);
  });
});

describe('module constants (sanity check)', () => {
  it('DARK_TEXT matches Tailwind gray-800 per rule 08-ui-theme', () => {
    expect(__testing__.DARK_TEXT).toBe('#1f2937');
  });

  it('LIGHT_TEXT is pure white', () => {
    expect(__testing__.LIGHT_TEXT).toBe('#ffffff');
  });

  it('WCAG_AA_NORMAL threshold is 4.5', () => {
    expect(__testing__.WCAG_AA_NORMAL).toBe(4.5);
  });

  it('class names follow blockly-text-* convention', () => {
    expect(__testing__.CLASS_DARK).toBe('blockly-text-dark');
    expect(__testing__.CLASS_OUTLINE).toBe('blockly-text-outline');
  });
});
