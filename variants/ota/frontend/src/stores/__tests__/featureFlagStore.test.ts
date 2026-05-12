/**
 * featureFlagStore plan gate matrix (第107回 Task 2 regression defense)
 *
 * Task 2 で canUsePinAssign / canUseServoPulse の plan-tier 差別化を narrow:
 * - canUsePinAssign: pro/enterprise → **Enterprise only**
 * - canUseServoPulse: default true → **Pro/Enterprise**
 *
 * `memory:prerelease_open_scope`: プレリリース期間中
 * (pin_assign_pro.isFreeNow=true) は全 user に開放を維持必須。
 * 両 gate で isFreeNow OR layer を実証。
 *
 * 8 cases:
 * - canUsePinAssign × 4: enterprise / pro narrow / lite / isFreeNow bypass
 * - canUseServoPulse × 4: enterprise / pro accept / lite / isFreeNow bypass
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useFeatureFlagStore } from '../featureFlagStore';

function setFreeNow(value: boolean): void {
  useFeatureFlagStore.setState({
    flags: {
      pin_assign_pro: {
        enabled: true,
        freeUntil: null,
        freeReason: null,
        isFreeNow: value,
      },
    },
    isLoaded: true,
    lastFetchedAt: Date.now(),
  });
}

describe('featureFlagStore — canUsePinAssign (Enterprise only narrow)', () => {
  beforeEach(() => {
    useFeatureFlagStore.setState({ flags: {}, isLoaded: false, lastFetchedAt: null });
  });

  it('enterprise plan returns true', () => {
    const { canUsePinAssign } = useFeatureFlagStore.getState();
    expect(canUsePinAssign('enterprise')).toBe(true);
  });

  it('pro plan returns false (Task 2 narrow: Pro no longer accepted for PinAssign)', () => {
    const { canUsePinAssign } = useFeatureFlagStore.getState();
    expect(canUsePinAssign('pro')).toBe(false);
  });

  it('lite plan returns false', () => {
    const { canUsePinAssign } = useFeatureFlagStore.getState();
    expect(canUsePinAssign('lite')).toBe(false);
  });

  it('any plan (incl. undefined) is bypass-accepted while isFreeNow=true (prerelease)', () => {
    setFreeNow(true);
    const { canUsePinAssign } = useFeatureFlagStore.getState();
    expect(canUsePinAssign(undefined)).toBe(true);
    expect(canUsePinAssign('free')).toBe(true);
    expect(canUsePinAssign('lite')).toBe(true);
  });
});

describe('featureFlagStore — canUseServoPulse (Pro/Enterprise gate)', () => {
  beforeEach(() => {
    useFeatureFlagStore.setState({ flags: {}, isLoaded: false, lastFetchedAt: null });
  });

  it('enterprise plan returns true', () => {
    const { canUseServoPulse } = useFeatureFlagStore.getState();
    expect(canUseServoPulse('enterprise')).toBe(true);
  });

  it('pro plan returns true (Task 2 differentiation: Pro gains ServoPulse)', () => {
    const { canUseServoPulse } = useFeatureFlagStore.getState();
    expect(canUseServoPulse('pro')).toBe(true);
  });

  it('lite plan returns false (Lite does not include ServoPulse)', () => {
    const { canUseServoPulse } = useFeatureFlagStore.getState();
    expect(canUseServoPulse('lite')).toBe(false);
  });

  it('any plan (incl. undefined) is bypass-accepted while isFreeNow=true (prerelease)', () => {
    setFreeNow(true);
    const { canUseServoPulse } = useFeatureFlagStore.getState();
    expect(canUseServoPulse(undefined)).toBe(true);
    expect(canUseServoPulse('free')).toBe(true);
    expect(canUseServoPulse('lite')).toBe(true);
  });
});
