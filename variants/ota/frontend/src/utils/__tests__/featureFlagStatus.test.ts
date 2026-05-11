import { describe, expect, it } from 'vitest';
import { getDaysRemaining, getStatusVariant } from '../featureFlagStatus';

describe('featureFlagStatus', () => {
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

  describe('getStatusVariant (第102回 C4 仕様: 残3日以下 critical / 残7日以下 warning)', () => {
    it('returns normal for > 7 days', () => {
      expect(getStatusVariant(30)).toBe('normal');
      expect(getStatusVariant(8)).toBe('normal');
    });

    it('returns warning for 4-7 days inclusive', () => {
      expect(getStatusVariant(7)).toBe('warning');
      expect(getStatusVariant(5)).toBe('warning');
      expect(getStatusVariant(4)).toBe('warning');
    });

    it('returns critical for 1-3 days inclusive', () => {
      expect(getStatusVariant(3)).toBe('critical');
      expect(getStatusVariant(2)).toBe('critical');
      expect(getStatusVariant(1)).toBe('critical');
    });

    it('returns expired for 0 / negative days', () => {
      expect(getStatusVariant(0)).toBe('expired');
      expect(getStatusVariant(-5)).toBe('expired');
    });
  });
});
