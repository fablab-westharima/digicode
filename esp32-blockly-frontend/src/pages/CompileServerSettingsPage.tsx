/**
 * コンパイルサーバー設定ページ
 * クラウド/ローカルサーバーの切り替え
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompileServerSettings } from '@/components/settings/CompileServerSettings';
import { LocaleSelector } from '@/components/common/LocaleSelector';

export function CompileServerSettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t('settings.compileServer')}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('settings.compileServerDesc')}
              </p>
            </div>
          </div>
          <LocaleSelector />
        </div>

        {/* メインコンテンツ */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <CompileServerSettings />
        </div>
      </div>
    </div>
  );
}

export default CompileServerSettingsPage;
