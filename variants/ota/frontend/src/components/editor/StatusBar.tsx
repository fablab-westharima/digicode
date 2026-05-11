import type { ReactElement } from 'react';
import { Zap, Upload, AlertCircle, Check, Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { isKnownPreset, presetTranslationKey } from '@/utils/featureFlagPresets';
import { getDaysRemaining, getStatusVariant } from '@/utils/featureFlagStatus';

export type StatusBarState = 'ready' | 'compiling' | 'uploading' | 'error' | 'success';

interface StatusBarProps {
  state: StatusBarState;
  message?: string;
  binarySize?: number;
  flashSize?: number;
  deviceInfo?: {
    name?: string;
    ip?: string;
    connected: boolean;
  };
}

// 第102回 C4: StatusBar inline Feature Flag 表示の trigger key (D-5 確定)。
// 複数 flag 対応は後続 task、現状 seed 1 件のみ。
const FEATURE_FLAG_TRIGGER_KEY = 'pin_assign_pro';

const VARIANT_COLOR_CLASS: Record<'normal' | 'warning' | 'critical', string> = {
  normal: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-orange-400',
};

export function StatusBar({
  state,
  message,
  binarySize,
  flashSize,
  deviceInfo,
}: StatusBarProps) {
  const { t } = useTranslation();

  // 状態に応じたアイコンと色
  const getStateDisplay = () => {
    switch (state) {
      case 'ready':
        return {
          icon: <Check className="w-3 h-3" />,
          color: 'text-green-400',
          bgColor: 'bg-green-900/30',
          text: message || t('status.ready'),
        };
      case 'compiling':
        return {
          icon: <Zap className="w-3 h-3 animate-pulse" />,
          color: 'text-orange-400',
          bgColor: 'bg-orange-900/30',
          text: message || t('status.compiling'),
        };
      case 'uploading':
        return {
          icon: <Upload className="w-3 h-3 animate-bounce" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/30',
          text: message || t('status.uploading'),
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          color: 'text-red-400',
          bgColor: 'bg-red-900/30',
          text: message || t('status.error'),
        };
      case 'success':
        return {
          icon: <Check className="w-3 h-3" />,
          color: 'text-green-400',
          bgColor: 'bg-green-900/30',
          text: message || t('status.success'),
        };
    }
  };

  const stateDisplay = getStateDisplay();

  // 第102回 C4: Feature Flag inline 表示 (グローバル下部 banner を撤回、StatusBar に集約)
  // 「✓ 準備完了」の左側に "🎁 <preset> | 残り N 日" を表示、threshold で色変化、dismiss なし
  const flag = useFeatureFlagStore((s) => s.flags[FEATURE_FLAG_TRIGGER_KEY]);
  let featureFlagInline: ReactElement | null = null;
  if (flag?.isFreeNow && flag.freeUntil) {
    const days = getDaysRemaining(flag.freeUntil);
    const variant = getStatusVariant(days);
    if (variant !== 'expired') {
      const reasonLabel = isKnownPreset(flag.freeReason)
        ? t(presetTranslationKey(flag.freeReason))
        : flag.freeReason;
      featureFlagInline = (
        <div className={`flex items-center gap-1.5 ${VARIANT_COLOR_CLASS[variant]}`}>
          <span aria-hidden>🎁</span>
          {reasonLabel && <span className="font-medium">{reasonLabel}</span>}
          <span className="text-gray-500">|</span>
          <span className="tabular-nums">{t('featureFlag.status.endsInDays', { count: days })}</span>
        </div>
      );
    }
  }

  // バイナリサイズをフォーマット
  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  return (
    <div className="flex items-center justify-end gap-4 h-7 px-4 bg-[#1C1F26] text-[#E6EDF3] text-xs border-t border-[#2E333D]">
      {/* バイナリサイズ / メモリ使用量 */}
      {(binarySize || flashSize) && (
        <div className="flex items-center gap-4 text-gray-400">
          {binarySize && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Binary:</span>
              <span className="text-[#E6EDF3]">{formatSize(binarySize)}</span>
            </div>
          )}
          {flashSize && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Flash:</span>
              <span className="text-[#E6EDF3]">{formatSize(flashSize)}</span>
            </div>
          )}
        </div>
      )}

      {/* Feature Flag inline (✓ 準備完了 の左側、第102回 C4) */}
      {featureFlagInline}

      {/* 状態インジケーター */}
      <div className={`flex items-center gap-2 ${stateDisplay.color}`}>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${stateDisplay.bgColor}`}>
          {stateDisplay.icon}
          <span className="font-medium">{stateDisplay.text}</span>
        </div>
      </div>

      {/* デバイス情報（最右端）*/}
      {deviceInfo && (
        <div className="flex items-center gap-1.5 text-gray-400">
          {deviceInfo.connected ? (
            <Wifi className="w-3 h-3 text-green-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-gray-500" />
          )}
          {deviceInfo.connected && (
            <span className="text-[#E6EDF3]">
              {deviceInfo.name || deviceInfo.ip || 'Device'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
