import { describe, expect, it } from 'vitest';
import {
  FREE_REASON_PRESETS,
  isKnownPreset,
  presetTranslationKey,
} from '../featureFlagPresets';

describe('featureFlagPresets', () => {
  it('exposes exactly the 3 prerelease templates', () => {
    expect(FREE_REASON_PRESETS).toEqual(['prerelease', 'newFeatureTest', 'campaign']);
  });

  describe('isKnownPreset', () => {
    it('returns true for each known preset', () => {
      for (const preset of FREE_REASON_PRESETS) {
        expect(isKnownPreset(preset)).toBe(true);
      }
    });

    it('returns false for null / undefined / empty string', () => {
      expect(isKnownPreset(null)).toBe(false);
      expect(isKnownPreset(undefined)).toBe(false);
      expect(isKnownPreset('')).toBe(false);
    });

    it('returns false for legacy free-text values (pre-migration backfill)', () => {
      expect(isKnownPreset('テスター期間 - 全機能開放')).toBe(false);
      expect(isKnownPreset('any custom string')).toBe(false);
    });
  });

  describe('presetTranslationKey', () => {
    it('maps each preset to its featureFlag.presets.<key> i18n path', () => {
      expect(presetTranslationKey('prerelease')).toBe('featureFlag.presets.prerelease');
      expect(presetTranslationKey('newFeatureTest')).toBe('featureFlag.presets.newFeatureTest');
      expect(presetTranslationKey('campaign')).toBe('featureFlag.presets.campaign');
    });
  });
});
