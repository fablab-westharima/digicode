import { Monitor, Smartphone } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';

export function MobileWarning() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <Monitor className="w-24 h-24 text-blue-500" strokeWidth={1.5} />
            <Smartphone className="w-12 h-12 text-red-400 absolute -bottom-2 -right-2 animate-pulse" strokeWidth={2} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          {t('mobileWarning.title', { defaultValue: 'デスクトップ版をご利用ください' })}
        </h1>

        <p className="text-gray-300 mb-6 leading-relaxed">
          <Trans
            i18nKey="mobileWarning.description"
            components={{ strong: <strong className="text-white" /> }}
            defaults="DigiCodeは<strong>PC専用</strong>のブロックエディタです。ファームウェアの書き込みやデバイス設定など、すべての機能はデスクトップ環境を前提としています。"
          />
        </p>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-2">
            {t('mobileWarning.requirements.title', { defaultValue: '推奨環境' })}
          </h2>
          <ul className="text-left text-sm text-gray-300 space-y-1">
            <li>• <strong className="text-white">{t('mobileWarning.requirements.resolution', { defaultValue: '画面解像度:' })}</strong> {t('mobileWarning.requirements.resolutionValue', { defaultValue: '1024px × 768px 以上' })}</li>
            <li>• <strong className="text-white">{t('mobileWarning.requirements.os', { defaultValue: '対応OS:' })}</strong> {t('mobileWarning.requirements.osValue', { defaultValue: 'Windows / macOS / Linux' })}</li>
            <li>• <strong className="text-white">{t('mobileWarning.requirements.browser', { defaultValue: 'ブラウザ:' })}</strong> {t('mobileWarning.requirements.browserValue', { defaultValue: 'Chrome, Firefox, Edge (最新版)' })}</li>
          </ul>
        </div>

        <p className="text-xs text-gray-500">
          {t('mobileWarning.notSupported', { defaultValue: 'スマートフォン・タブレットでの動作はサポートしていません。' })}
        </p>
      </div>
    </div>
  );
}
