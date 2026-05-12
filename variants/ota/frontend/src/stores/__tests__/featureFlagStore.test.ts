/**
 * featureFlagStore plan gate matrix (第107回 Task 2 + 第112回 case 19 cluster FE-1 regression defense)
 *
 * Task 2 で canUsePinAssign / canUseServoPulse の plan-tier 差別化を narrow:
 * - canUsePinAssign: pro/enterprise → **Enterprise only**
 * - canUseServoPulse: default true → **Pro/Enterprise**
 *
 * 第112回 FE-1 で canUseClasses helper を新設、Sidebar / ClassesPage / ClassDetailPage
 * の inline gate `user.plan === 'enterprise' || isPinAssignFreeOpen` を統合。
 * - canUseClasses: **Enterprise only** + isFreeNow bypass (canUsePinAssign と同 spirit)
 *
 * `memory:prerelease_open_scope`: プレリリース期間中
 * (pin_assign_pro.isFreeNow=true) は全 user に開放を維持必須。
 * 3 gate で isFreeNow OR layer を実証。
 *
 * 12 cases:
 * - canUsePinAssign × 4: enterprise / pro narrow / lite / isFreeNow bypass
 * - canUseServoPulse × 4: enterprise / pro accept / lite / isFreeNow bypass
 * - canUseClasses × 4: enterprise / pro / lite / isFreeNow bypass
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

describe('featureFlagStore — canUseClasses (Enterprise only, case 19 cluster FE-1)', () => {
  beforeEach(() => {
    useFeatureFlagStore.setState({ flags: {}, isLoaded: false, lastFetchedAt: null });
  });

  it('enterprise plan returns true', () => {
    const { canUseClasses } = useFeatureFlagStore.getState();
    expect(canUseClasses('enterprise')).toBe(true);
  });

  it('pro plan returns false (Enterprise-only gate, not Pro/Enterprise)', () => {
    const { canUseClasses } = useFeatureFlagStore.getState();
    expect(canUseClasses('pro')).toBe(false);
  });

  it('lite plan returns false', () => {
    const { canUseClasses } = useFeatureFlagStore.getState();
    expect(canUseClasses('lite')).toBe(false);
  });

  it('any plan (incl. undefined) is bypass-accepted while isFreeNow=true (prerelease)', () => {
    setFreeNow(true);
    const { canUseClasses } = useFeatureFlagStore.getState();
    expect(canUseClasses(undefined)).toBe(true);
    expect(canUseClasses('free')).toBe(true);
    expect(canUseClasses('lite')).toBe(true);
    expect(canUseClasses('pro')).toBe(true);
  });
});
