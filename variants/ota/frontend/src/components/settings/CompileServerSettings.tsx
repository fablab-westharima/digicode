/**
 * コンパイルサーバー設定コンポーネント
 * クラウド/ローカルサーバーの切り替えUI
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { compileService, type CompileServerMode } from '@/services/compileService';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Cloud, Server, CheckCircle2, XCircle, Loader2, BarChart3 } from 'lucide-react';

type ConnectionStatus = 'unknown' | 'connected' | 'disconnected';

interface UsageData {
  month: string;
  count: number;
  limit: number;
  remaining: number;
  planType: string;
  isOverLimit: boolean;
}

export const CompileServerSettings = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<CompileServerMode>('cloud');
  const [localStatus, setLocalStatus] = useState<ConnectionStatus>('unknown');
  const [cloudStatus, setCloudStatus] = useState<ConnectionStatus>('unknown');
  const [testing, setTesting] = useState<'local' | 'cloud' | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // 使用量を取得
  const fetchUsage = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    setLoadingUsage(true);
    try {
      const response = await api.compileUsage.get();
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    setMode(compileService.getMode());
    fetchUsage();
  }, []);

  const handleModeChange = (newMode: CompileServerMode) => {
    setMode(newMode);
    compileService.setMode(newMode);
  };

  const testConnection = async (target: 'local' | 'cloud') => {
    setTesting(target);
    const url = target === 'local'
      ? compileService.servers.local
      : compileService.servers.primary;
    const connected = await compileService.testConnection(url);

    if (target === 'local') {
      setLocalStatus(connected ? 'connected' : 'disconnected');
    } else {
      setCloudStatus(connected ? 'connected' : 'disconnected');
    }
    setTesting(null);
  };

  const StatusIcon = ({ status, loading }: { status: ConnectionStatus; loading: boolean }) => {
    if (loading) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const StatusText = ({ status }: { status: ConnectionStatus }) => {
    switch (status) {
      case 'connected':
        return <span className="text-green-600 text-sm">{t('settings.connectionOk')}</span>;
      case 'disconnected':
        return <span className="text-red-600 text-sm">{t('settings.notConnected')}</span>;
      default:
        return <span className="text-gray-500 text-sm">{t('settings.unverified')}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          {t('settings.compileServer')}
        </CardTitle>
        <CardDescription>
          {t('settings.compileServerDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as CompileServerMode)}>
          {/* クラウドサーバー */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-500/10 transition-colors">
            <RadioGroupItem value="cloud" id="cloud" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="cloud" className="flex items-center gap-2 cursor-pointer font-medium">
                <Cloud className="h-4 w-4 text-blue-500" />
                {t('settings.cloudRecommended')}
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                {t('settings.cloudDesc')}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <StatusIcon status={cloudStatus} loading={testing === 'cloud'} />
                  <StatusText status={cloudStatus} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection('cloud')}
                  disabled={testing !== null}
                >
                  {t('settings.connectionTest')}
                </Button>
              </div>
            </div>
          </div>

          {/* ローカルサーバー */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-500/10 transition-colors">
            <RadioGroupItem value="local" id="local" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="local" className="flex items-center gap-2 cursor-pointer font-medium">
                <Server className="h-4 w-4 text-purple-500" />
                {t('settings.localServer')}
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                {t('settings.localDesc')}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <StatusIcon status={localStatus} loading={testing === 'local'} />
                  <StatusText status={localStatus} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection('local')}
                  disabled={testing !== null}
                >
                  {t('settings.connectionTest')}
                </Button>
              </div>
              {mode === 'local' && localStatus === 'disconnected' && (
                <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                  {t('settings.localNotRunning')}
                  <a
                    href="https://github.com/fablab-westharima/arduino-compile-server"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    {t('settings.setupGuide')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </RadioGroup>

        {/* 現在の設定表示 */}
        <div className="pt-2 border-t">
          <p className="text-sm text-gray-600">
            {t('settings.currentServer')}: <code className="bg-gray-500/10 text-gray-300 px-2 py-0.5 rounded text-xs">{compileService.getServerUrl()}</code>
          </p>
        </div>

        {/* クラウドサーバー使用量（ログイン時のみ表示） */}
        {mode === 'cloud' && usage && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">{t('settings.monthlyUsage')}</span>
            </div>

            <div className="space-y-2">
              {/* プログレスバー */}
              <div className="relative">
                <Progress
                  value={usage.limit === -1 ? 0 : (usage.count / usage.limit) * 100}
                  className={`h-3 ${usage.isOverLimit ? '[&>div]:bg-red-500' : ''}`}
                />
              </div>

              {/* 数値表示 */}
              <div className="flex justify-between text-sm">
                <span className={usage.isOverLimit ? 'text-red-600 font-medium' : 'text-gray-600'}>
                  {t('settings.usedCount', { count: usage.count })}
                </span>
                <span className="text-gray-500">
                  {usage.limit === -1 ? t('settings.unlimited') : t('settings.limitCount', { limit: usage.limit })}
                </span>
              </div>

              {/* 残り回数 */}
              {usage.limit !== -1 && (
                <p className={`text-sm ${usage.isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                  {usage.isOverLimit
                    ? t('settings.overLimit', { count: usage.count - usage.limit })
                    : t('settings.remainingCompiles', { count: usage.remaining })
                  }
                </p>
              )}

              {/* プラン表示 */}
              <p className="text-xs text-gray-400 mt-1">
                {t('settings.currentPlan')}: {usage.planType === 'free' ? t('settings.freePlan') : usage.planType}
                （{usage.month}）
              </p>
            </div>

            {/* 制限超過時の警告 */}
            {usage.isOverLimit && (
              <div className="mt-3 p-2 bg-red-50 rounded text-sm text-red-700">
                {t('settings.limitReachedMsg')}
              </div>
            )}
          </div>
        )}

        {/* ローカルサーバー選択時のメッセージ */}
        {mode === 'local' && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">
              {t('settings.localNoCount')}
            </p>
          </div>
        )}

        {/* 未ログイン時 */}
        {mode === 'cloud' && !usage && !loadingUsage && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-500">
              {t('settings.loginToViewUsage')}
            </p>
          </div>
        )}

        {/* ロード中 */}
        {loadingUsage && (
          <div className="pt-4 border-t flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('settings.loadingUsage')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompileServerSettings;
