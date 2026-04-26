import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';
import { FeedbackFormDialog } from './FeedbackFormDialog';

interface Props {
  shouldShowFull: boolean;
  isAvailable: boolean;
  isUpgradeCandidate: boolean;
  onUpgradePlan?: () => void;
}

export function FeedbackFormButton({
  shouldShowFull,
  isAvailable,
  isUpgradeCandidate,
  onUpgradePlan,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!isAvailable && !isUpgradeCandidate) return null;

  // 折畳時: アイコンのみ
  if (!shouldShowFull) {
    return (
      <div className="flex justify-center py-2">
        <span title={isAvailable ? t('feedback.button.label') : t('feedback.button.requiresLitePlus')}>
          <Megaphone
            className={`w-4 h-4 ${isAvailable ? 'text-[#8B949E]' : 'text-[#5C6370] opacity-50'}`}
          />
        </span>
        {isAvailable && (
          <FeedbackFormDialog open={open} onOpenChange={setOpen} />
        )}
      </div>
    );
  }

  // Upgrade CTA (Free user)
  if (!isAvailable) {
    return (
      <div className="px-2 py-2 border-t border-[#2E333D]">
        <div className="px-2 py-1 text-xs font-semibold text-[#8B949E] uppercase tracking-wide flex items-center gap-1 mb-1">
          <Megaphone className="w-3 h-3" />
          {t('feedback.button.label', { defaultValue: '要望を送る' })}
          <span className="ml-auto text-[10px] text-orange-400">LITE+</span>
        </div>
        <div className="px-2 py-2 text-xs text-[#8B949E]">
          <p className="mb-1">{t('feedback.button.requiresLitePlus', { defaultValue: '要望機能はプラン契約者のみご利用いただけます。' })}</p>
          <button
            onClick={onUpgradePlan}
            className="text-blue-400 hover:text-blue-300 underline text-xs"
          >
            {t('feedback.button.upgradePlan', { defaultValue: 'プランをアップグレード' })}
          </button>
        </div>
      </div>
    );
  }

  // Available: ボタン → Dialog
  return (
    <>
      <div className="px-2 py-2 border-t border-[#2E333D]">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-2 py-2 text-sm text-[#E6EDF3] hover:bg-[#2E333D] rounded transition-colors"
          title={t('feedback.button.label')}
        >
          <Megaphone className="w-4 h-4 text-[#8B949E]" />
          <span className="flex-1 text-left">
            {t('feedback.button.label', { defaultValue: '要望を送る' })}
          </span>
        </button>
      </div>
      <FeedbackFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
