/**
 * コンパイル設定コンポーネント
 * クラウド/ローカルサーバーの切り替えUI
 *
 * 動作仕様（2026-04-11以降）:
 * - 未ログインユーザー: クラウドは選択不可（グレーアウト）、ローカルのみ利用可能
 * - ログイン済みユーザー: 両方選択可能
 * - ローカル状態は自動チェック（マウント時 + 定期再チェック）
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { compileService, type CompileServerMode } from '@/services/compileService';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Cloud, Server, CheckCircle2, XCircle, Loader2, BarChart3, Lock, AlertCircle } from 'lucide-react';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

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
  const { isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<CompileServerMode>('cloud');
  const [localStatus, setLocalStatus] = useState<ConnectionStatus>('checking');
  const [cloudStatus, setCloudStatus] = useState<ConnectionStatus>('checking');
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // 使用量を取得（ログイン時のみ）
  const fetchUsage = useCallback(async () => {
    if (!isAuthenticated) {
      setUsage(null);
      return;
    }

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
  }, [isAuthenticated]);

  // ローカルサーバーの接続状態を自動チェック
  const checkLocalConnection = useCallback(async () => {
    setLocalStatus('checking');
    const connected = await compileService.testConnection(compileService.servers.local);
    setLocalStatus(connected ? 'connected' : 'disconnected');
  }, []);

  // クラウドサーバーの接続状態を自動チェック
  const checkCloudConnection = useCallback(async () => {
    setCloudStatus('checking');
    const connected = await compileService.testConnection(compileService.servers.primary);
    setCloudStatus(connected ? 'connected' : 'disconnected');
  }, []);

  useEffect(() => {
    // 未ログイン時はcloudがデフォルトでもlocalに自動切替
    const currentMode = compileService.getMode();
    if (!isAuthenticated && currentMode === 'cloud') {
      setMode('local');
      compileService.setMode('local');
    } else {
      setMode(currentMode);
    }

    // 接続状態を初回チェック
    checkLocalConnection();
    checkCloudConnection();

    // 使用量を取得
    fetchUsage();
  }, [isAuthenticated, checkLocalConnection, checkCloudConnection, fetchUsage]);

  const handleModeChange = (newMode: CompileServerMode) => {
    // 未ログイン時はクラウドを選択させない
    if (newMode === 'cloud' && !isAuthenticated) {
      return;
    }
    setMode(newMode);
    compileService.setMode(newMode);
  };

  const StatusIcon = ({ status }: { status: ConnectionStatus }) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const StatusText = ({ status }: { status: ConnectionStatus }) => {
    switch (status) {
      case 'checking':
        return <span className="text-blue-500 text-sm">{t('settings.checking', { defaultValue: '確認中...' })}</span>;
      case 'connected':
        return <span className="text-green-600 text-sm">{t('settings.connectionOk')}</span>;
      case 'disconnected':
        return <span className="text-red-600 text-sm">{t('settings.notConnected')}</span>;
    }
  };

  const cloudDisabled = !isAuthenticated;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          {t('settings.compileSettings', { defaultValue: 'コンパイル設定' })}
        </CardTitle>
        <CardDescription>
          {t('settings.compileServerDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 未ログイン時の案内 */}
        {!isAuthenticated && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                {t('settings.loginRequiredForCloud', {
                  defaultValue: 'クラウドコンパイルを利用するにはログインが必要です。ローカルコンパイルサーバーは引き続き利用できます。'
                })}
              </div>
            </div>
          </div>
        )}

        <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as CompileServerMode)}>
          {/* クラウドサーバー */}
          <div
            className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
              cloudDisabled
                ? 'opacity-50 cursor-not-allowed bg-gray-500/5'
                : 'hover:bg-gray-500/10 cursor-pointer'
            }`}
            title={cloudDisabled ? t('settings.loginRequiredForCloud', { defaultValue: 'ログインが必要です' }) : undefined}
          >
            <RadioGroupItem
              value="cloud"
              id="cloud"
              className="mt-1"
              disabled={cloudDisabled}
            />
            <div className="flex-1">
              <Label
                htmlFor="cloud"
                className={`flex items-center gap-2 font-medium ${
                  cloudDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Cloud className="h-4 w-4 text-blue-500" />
                {t('settings.cloudRecommended')}
                {cloudDisabled && <Lock className="h-3 w-3 text-gray-400" />}
              </Label>
              <p className="text-sm text-gray-500 mt-1">
                {t('settings.cloudDesc')}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <StatusIcon status={cloudStatus} />
                  <StatusText status={cloudStatus} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkCloudConnection}
                  disabled={cloudStatus === 'checking'}
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
                  <StatusIcon status={localStatus} />
                  <StatusText status={localStatus} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkLocalConnection}
                  disabled={localStatus === 'checking'}
                >
                  {t('settings.connectionTest')}
                </Button>
              </div>

              {/* ローカルサーバー未起動時の案内 */}
              {localStatus === 'disconnected' && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded text-sm text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      {t('settings.localNotRunning', {
                        defaultValue: 'ローカルサーバーが起動していません。Dockerでサーバーを起動してください。'
                      })}
                      <div className="mt-1">
                        <a
                          href="https://github.com/fablab-westharima/arduino-compile-server"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {t('settings.setupGuide', { defaultValue: 'セットアップガイドはこちら' })}
                        </a>
                      </div>
                    </div>
                  </div>
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
        {mode === 'cloud' && isAuthenticated && usage && (
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
