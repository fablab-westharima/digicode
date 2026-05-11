/**
 * グローバル下部バナー: Feature Flag 無料開放期間を user に通知する
 *
 * 第102回 Task 1-B + 1-C:
 * - D-5: trigger flag = pin_assign_pro
 * - D-2: App.tsx 配置、認証系 route (/auth /reset-password /verify-email /recovery) で除外
 * - D-3: 7 / 3 / 1 日 threshold で variant (緑 / 黄 / 橙) を切替
 * - D-9: dismiss 24h sessionStorage
 *
 * 期限切れ後は isFreeNow=false で自然に banner 消失。
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import {
  isKnownPreset,
  presetTranslationKey,
} from '@/utils/featureFlagPresets';
import {
  getBannerVariant,
  getDaysRemaining,
  isDismissedRecently,
  markDismissed,
  type BannerVariant,
} from '@/utils/featureFlagBanner';

const TRIGGER_FLAG_KEY = 'pin_assign_pro';

const EXCLUDED_ROUTE_PREFIXES = [
  '/auth',
  '/reset-password',
  '/verify-email',
  '/recovery',
];

// i18n.language → toLocaleDateString locale (AdminPage と同 pattern)
const LOCALE_MAP: Record<string, string> = {
  ja: 'ja-JP',
  en: 'en-US',
  es: 'es-ES',
  'pt-PT': 'pt-PT',
  'zh-TW': 'zh-TW',
};

interface VariantStyle {
  containerClass: string;
  icon: string;
  buttonHoverClass: string;
}

const VARIANT_STYLES: Record<Exclude<BannerVariant, 'expired'>, VariantStyle> = {
  normal: {
    containerClass: 'bg-emerald-600 text-white',
    icon: '🎁',
    buttonHoverClass: 'hover:bg-emerald-700',
  },
  warning: {
    containerClass: 'bg-amber-500 text-black',
    icon: '⏰',
    buttonHoverClass: 'hover:bg-amber-600',
  },
  critical: {
    containerClass: 'bg-orange-600 text-white',
    icon: '⚠️',
    buttonHoverClass: 'hover:bg-orange-700',
  },
};

function isExcludedRoute(pathname: string): boolean {
  return EXCLUDED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function FeatureFlagBanner() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const flags = useFeatureFlagStore((s) => s.flags);
  const fetchFlags = useFeatureFlagStore((s) => s.fetchFlags);
  const [dismissTick, setDismissTick] = useState(0);

  // 初回 mount で store の cache TTL 内ならスキップされる、安全に呼べる
  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const flag = flags[TRIGGER_FLAG_KEY];
  const now = Date.now();
  const isExcluded = isExcludedRoute(pathname);
  const dismissed = useMemo(
    () => isDismissedRecently(TRIGGER_FLAG_KEY, now),
    // dismissTick を依存に含めて dismiss 直後に再評価
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dismissTick, now],
  );

  if (isExcluded || !flag || !flag.isFreeNow || !flag.freeUntil || dismissed) {
    return null;
  }

  const daysRemaining = getDaysRemaining(flag.freeUntil, now);
  const variant = getBannerVariant(daysRemaining);
  if (variant === 'expired') return null;

  const style = VARIANT_STYLES[variant];
  const locale = LOCALE_MAP[i18n.language] ?? 'en-US';
  const endDateLabel = new Date(flag.freeUntil).toLocaleDateString(locale);

  const reasonLabel = isKnownPreset(flag.freeReason)
    ? t(presetTranslationKey(flag.freeReason))
    : flag.freeReason;

  // countdown text: ≥7 日 → 終了日 / 2-6 日 → 残日数 / 1 日 → endsTomorrow
  let countdownText: string;
  if (daysRemaining >= 7) {
    countdownText = t('featureFlag.banner.untilDate', { date: endDateLabel });
  } else if (daysRemaining === 1) {
    countdownText = t('featureFlag.banner.endsTomorrow');
  } else {
    countdownText = t('featureFlag.banner.endsInDays', { count: daysRemaining });
  }

  const handleDismiss = () => {
    markDismissed(TRIGGER_FLAG_KEY, Date.now());
    setDismissTick((n) => n + 1);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-0 left-0 right-0 z-40 ${style.containerClass} shadow-lg`}
    >
      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-2xl mx-auto">
        <span className="text-lg shrink-0" aria-hidden>
          {style.icon}
        </span>
        {reasonLabel && (
          <span className="text-sm font-medium truncate">{reasonLabel}</span>
        )}
        <span className="text-sm ml-auto shrink-0 tabular-nums">{countdownText}</span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('featureFlag.banner.dismiss')}
          className={`shrink-0 p-1 rounded-md ${style.buttonHoverClass} focus:outline-none focus:ring-2 focus:ring-white/60`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
