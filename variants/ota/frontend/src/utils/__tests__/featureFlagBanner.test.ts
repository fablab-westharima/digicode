import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getDaysRemaining,
  isSameUtcDay,
  getBannerVariant,
  isDismissedRecently,
  markDismissed,
  __testing__,
} from '../featureFlagBanner';

const { DISMISS_TTL_MS, getDismissKey } = __testing__;

describe('featureFlagBanner', () => {
  describe('getDaysRemaining', () => {
    const now = new Date('2026-05-11T00:00:00Z').getTime();

    it('returns ceil-rounded days for future dates', () => {
      const in10Days = new Date('2026-05-21T00:00:00Z').toISOString();
      expect(getDaysRemaining(in10Days, now)).toBe(10);
    });

    it('returns 1 for any sub-1-day positive remainder (UI shows tomorrow / today)', () => {
      const in1Hour = new Date('2026-05-11T01:00:00Z').toISOString();
      expect(getDaysRemaining(in1Hour, now)).toBe(1);
    });

    it('returns -1 for exact expiry (diff = 0)', () => {
      const exactNow = new Date(now).toISOString();
      expect(getDaysRemaining(exactNow, now)).toBe(-1);
    });

    it('returns -1 for past dates', () => {
      const yesterday = new Date('2026-05-10T00:00:00Z').toISOString();
      expect(getDaysRemaining(yesterday, now)).toBe(-1);
    });

    it('returns -1 for invalid ISO strings (defensive, NaN guard)', () => {
      expect(getDaysRemaining('not-a-date', now)).toBe(-1);
    });
  });

  describe('isSameUtcDay', () => {
    it('returns true for two timestamps in the same UTC calendar day', () => {
      const a = new Date('2026-05-11T00:00:01Z').getTime();
      const b = new Date('2026-05-11T23:59:58Z').getTime();
      expect(isSameUtcDay(a, b)).toBe(true);
    });

    it('returns false across day boundaries', () => {
      const a = new Date('2026-05-11T23:59:59Z').getTime();
      const b = new Date('2026-05-12T00:00:00Z').getTime();
      expect(isSameUtcDay(a, b)).toBe(false);
    });
  });

  describe('getBannerVariant', () => {
    it('classifies threshold zones per D-3 (7/3/1 day)', () => {
      expect(getBannerVariant(30)).toBe('normal');
      expect(getBannerVariant(7)).toBe('normal');
      expect(getBannerVariant(6)).toBe('warning');
      expect(getBannerVariant(3)).toBe('warning');
      expect(getBannerVariant(2)).toBe('critical');
      expect(getBannerVariant(1)).toBe('critical');
      expect(getBannerVariant(0)).toBe('expired');
      expect(getBannerVariant(-5)).toBe('expired');
    });
  });

  describe('dismiss sessionStorage (24h TTL)', () => {
    const flagKey = 'pin_assign_pro';
    const now = 1700000000000;

    beforeEach(() => {
      sessionStorage.clear();
    });

    afterEach(() => {
      sessionStorage.clear();
    });

    it('returns false when no dismiss record exists', () => {
      expect(isDismissedRecently(flagKey, now)).toBe(false);
    });

    it('records dismiss and returns true within 24h window', () => {
      markDismissed(flagKey, now);
      expect(isDismissedRecently(flagKey, now + 60_000)).toBe(true);
      expect(isDismissedRecently(flagKey, now + DISMISS_TTL_MS - 1)).toBe(true);
    });

    it('expires after 24h, banner reappears next day', () => {
      markDismissed(flagKey, now);
      expect(isDismissedRecently(flagKey, now + DISMISS_TTL_MS)).toBe(false);
      expect(isDismissedRecently(flagKey, now + DISMISS_TTL_MS + 1)).toBe(false);
    });

    it('uses a flag-scoped storage key (isolation between flags)', () => {
      expect(getDismissKey('pin_assign_pro')).toBe('featureFlag.banner.dismissed.pin_assign_pro');
      expect(getDismissKey('ai_chat')).toBe('featureFlag.banner.dismissed.ai_chat');
    });

    it('ignores malformed sessionStorage entries (defensive)', () => {
      sessionStorage.setItem(getDismissKey(flagKey), 'not-a-number');
      expect(isDismissedRecently(flagKey, now)).toBe(false);
    });
  });
});
