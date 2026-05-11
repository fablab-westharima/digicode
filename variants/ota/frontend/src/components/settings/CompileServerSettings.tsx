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
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Cloud, Server, CheckCircle2, XCircle, Loader2, BarChart3, Lock, AlertCircle, Download, Trash2, Bot } from 'lucide-react';
import { DEFAULT_LOCAL_PORT } from '@/config/servers';
import { LocalServerSetupDialog, type LocalSetupMode } from './LocalServerSetupDialog';
import { AiPromptDialog, type AiPromptTab } from './AiPromptDialog';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected';

interface UsageData {
  month: string;
  count: number;
  limit: number;
  remaining: number;
  planType: string;
  isOverLimit: boolean;
}

// Extract the host port from a saved local URL (`http://host:NNNN`).
// Falls back to the default port when the URL is malformed.
function extractLocalPort(url: string): number {
  const match = url.match(/:(\d+)(?:\/|$)/);
  if (!match) return DEFAULT_LOCAL_PORT;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) ? n : DEFAULT_LOCAL_PORT;
}

interface CompileServerSettingsProps {
  /** When true, omit the duplicated card header — used by
   *  CompileServerSettingsDialog where the Dialog header already shows
   *  the same title and description (avoids ~60 px of wasted vertical
   *  space inside the modal). */
  embedded?: boolean;
}

export const CompileServerSettings = ({ embedded = false }: CompileServerSettingsProps = {}) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<CompileServerMode>('cloud');
  const [localStatus, setLocalStatus] = useState<ConnectionStatus>('checking');
  const [cloudStatus, setCloudStatus] = useState<ConnectionStatus>('checking');
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Local-server port editor state. Initialised from compileService.getLocalUrl()
  // (which reads the localStorage override or falls back to localhost:3001).
  const [localPort, setLocalPort] = useState<number>(() =>
    extractLocalPort(compileService.getLocalUrl()),
  );
  const [portInput, setPortInput] = useState<string>(() =>
    String(extractLocalPort(compileService.getLocalUrl())),
  );
  const [portError, setPortError] = useState<string | null>(null);

  // Setup / uninstall dialogs (案 2 採択 2026-05-01: in-dialog modal で
  // OS 別コマンドを直接表示し、docs page 経由の摩擦を 1 クリックに短縮)
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupDialogMode, setSetupDialogMode] = useState<LocalSetupMode>('install');
  const openSetupDialog = (m: LocalSetupMode) => {
    setSetupDialogMode(m);
    setSetupDialogOpen(true);
  };

  // AI prompt dialog (BUG-081 follow-up F-2 拡張、第101回): disconnected hint
  // 内の「🤖 AI に聞く」button から呼び出し、context (initial vs manual test 失敗)
  // で default tab を切替。lastFailReason は接続テスト button click でのみ
  // 'manual-test' に set、初回 mount + port apply の checkLocalConnection は
  // 'initial' のまま (disconnected の主因 = setup 未完了 と推定)。
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [lastFailReason, setLastFailReason] = useState<'initial' | 'manual-test'>('initial');
  const aiDefaultTab: AiPromptTab = lastFailReason === 'manual-test' ? 'verify' : 'pullRun';

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

  // ローカルサーバーの接続状態を自動チェック (ユーザーが指定した port を反映)
  const checkLocalConnection = useCallback(async () => {
    setLocalStatus('checking');
    const connected = await compileService.testConnection(compileService.getLocalUrl());
    setLocalStatus(connected ? 'connected' : 'disconnected');
  }, []);

  // 「接続テスト」button click 専用 wrapper: 失敗時に AI prompt の default tab を
  // 'verify' に向けるため lastFailReason を 'manual-test' に set してから check。
  // 成功時は AI prompt が開くこと自体ないため reason の値は無視される (next failure
  // 時に再度 set される、明示 reset 不要)。
  const handleManualConnectionTest = useCallback(async () => {
    setLastFailReason('manual-test');
    await checkLocalConnection();
  }, [checkLocalConnection]);

  // Apply a typed port: validate, persist via compileService.setLocalUrl,
  // re-run the connection check so the status badge stays in sync with
  // the new URL.
  const applyLocalPort = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        // Empty input → revert to default (3001).
        compileService.setLocalUrl(`http://localhost:${DEFAULT_LOCAL_PORT}`);
        setLocalPort(DEFAULT_LOCAL_PORT);
        setPortInput(String(DEFAULT_LOCAL_PORT));
        setPortError(null);
        checkLocalConnection();
        return;
      }
      if (!/^\d+$/.test(trimmed)) {
        setPortError(
          t('settings.localPortInvalid', {
            defaultValue: 'ポート番号は 1024〜65535 の整数を指定してください。',
          }),
        );
        return;
      }
      const n = parseInt(trimmed, 10);
      if (n < 1024 || n > 65535) {
        setPortError(
          t('settings.localPortInvalid', {
            defaultValue: 'ポート番号は 1024〜65535 の整数を指定してください。',
          }),
        );
        return;
      }
      if (n === localPort) {
        setPortError(null);
        return;
      }
      compileService.setLocalUrl(`http://localhost:${n}`);
      setLocalPort(n);
      setPortInput(String(n));
      setPortError(null);
      checkLocalConnection();
    },
    [checkLocalConnection, localPort, t],
  );

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
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const StatusText = ({ status }: { status: ConnectionStatus }) => {
    switch (status) {
      case 'checking':
        return <span className="text-muted-foreground text-sm">{t('settings.checking', { defaultValue: '確認中...' })}</span>;
      case 'connected':
        return <span className="text-primary text-sm">{t('settings.connectionOk')}</span>;
      case 'disconnected':
        return <span className="text-destructive text-sm">{t('settings.notConnected')}</span>;
    }
  };

  const cloudDisabled = !isAuthenticated;

  return (
    <Card>
      {!embedded && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {t('settings.compileSettings', { defaultValue: 'コンパイル設定' })}
          </CardTitle>
          <CardDescription>
            {t('settings.compileServerDesc')}
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={embedded ? 'space-y-4 pt-6' : 'space-y-4'}>
        {/* 未ログイン時の案内 */}
        {!isAuthenticated && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm text-foreground">
                {t('settings.loginRequiredForCloud', {
                  defaultValue: 'クラウドコンパイルを利用するにはログインが必要です。ローカルコンパイルサーバーは引き続き利用できます。'
                })}
              </div>
            </div>
          </div>
        )}

        <RadioGroup
          value={mode}
          onValueChange={(v) => handleModeChange(v as CompileServerMode)}
          className="gap-3"
        >
          {/* クラウドサーバー */}
          <div
            className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
              cloudDisabled
                ? 'opacity-50 cursor-not-allowed bg-muted/30'
                : 'hover:bg-accent/50 cursor-pointer'
            }`}
            title={cloudDisabled ? t('settings.loginRequiredForCloud', { defaultValue: 'クラウドコンパイルを利用するにはログインが必要です。ローカルコンパイルサーバーは引き続き利用できます。' }) : undefined}
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
                <Cloud className="h-4 w-4 text-primary" />
                {t('settings.cloudRecommended')}
                {cloudDisabled && <Lock className="h-3 w-3 text-muted-foreground" />}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
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
          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="local" id="local" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="local" className="flex items-center gap-2 cursor-pointer font-medium">
                <Server className="h-4 w-4 text-primary" />
                {t('settings.localServer')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1.5">
                {t('settings.localDesc')}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <StatusIcon status={localStatus} />
                  <StatusText status={localStatus} />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualConnectionTest}
                  disabled={localStatus === 'checking'}
                >
                  {t('settings.connectionTest')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSetupDialog('install')}
                  className="gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('settings.setupButton', { defaultValue: 'セットアップ' })}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSetupDialog('uninstall')}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('settings.uninstallButton', { defaultValue: 'アンインストール' })}
                </Button>
              </div>

              {/* port 番号入力 (installer の --port と一致させる) */}
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
                <Label htmlFor="local-port" className="text-xs text-muted-foreground">
                  {t('settings.localPort', { defaultValue: 'ポート番号' })}
                </Label>
                <Input
                  id="local-port"
                  type="number"
                  inputMode="numeric"
                  min={1024}
                  max={65535}
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  onBlur={() => applyLocalPort(portInput)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyLocalPort(portInput);
                    }
                  }}
                  className="h-7 w-24 text-xs"
                />
                <span className="text-xs text-muted-foreground">
                  {t('settings.localPortHint', {
                    defaultValue: 'デフォルト 3001。installer の --port と一致させてください。',
                  })}
                </span>
                {portError && (
                  <span className="w-full text-xs text-destructive">{portError}</span>
                )}
              </div>

              {/* ローカルサーバー未起動時の案内 (セットアップ動線は上のボタンに集約済) */}
              {localStatus === 'disconnected' && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-foreground">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-destructive" />
                    <div className="flex-1">
                      <p>
                        {t('settings.localNotRunningHint', {
                          defaultValue:
                            'ローカルサーバーが起動していません。上の「セットアップ」ボタンからインストールできます。下の「AI に聞く」ボタンからプロンプトをコピーし、ご利用の AI アシスタントに詳しい手順を聞くこともできます。',
                        })}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAiDialogOpen(true)}
                        className="mt-2 gap-1"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        {t('localServerSetup.aiButton', { defaultValue: '🤖 AI に聞く' })}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </RadioGroup>

        {/* セットアップ / アンインストール ダイアログ */}
        <LocalServerSetupDialog
          open={setupDialogOpen}
          mode={setupDialogMode}
          onOpenChange={setSetupDialogOpen}
        />

        {/* AI prompt ダイアログ (disconnected hint 内 button から呼び出し) */}
        <AiPromptDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          defaultTab={aiDefaultTab}
        />

        {/* 現在の設定表示 */}
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {t('settings.currentServer')}: <code className="bg-muted text-foreground px-2 py-0.5 rounded text-xs">{compileService.getServerUrl()}</code>
          </p>
        </div>

        {/* クラウドサーバー使用量（ログイン時のみ表示） */}
        {mode === 'cloud' && isAuthenticated && usage && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{t('settings.monthlyUsage')}</span>
            </div>

            <div className="space-y-2">
              {/* プログレスバー */}
              <div className="relative">
                <Progress
                  value={usage.limit === -1 ? 0 : (usage.count / usage.limit) * 100}
                  className={`h-3 ${usage.isOverLimit ? '[&>div]:bg-destructive' : ''}`}
                />
              </div>

              {/* 数値表示 */}
              <div className="flex justify-between text-sm">
                <span className={usage.isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                  {t('settings.usedCount', { count: usage.count })}
                </span>
                <span className="text-muted-foreground">
                  {usage.limit === -1 ? t('settings.unlimited') : t('settings.limitCount', { limit: usage.limit })}
                </span>
              </div>

              {/* 残り回数 */}
              {usage.limit !== -1 && (
                <p className={`text-sm ${usage.isOverLimit ? 'text-destructive' : 'text-primary'}`}>
                  {usage.isOverLimit
                    ? t('settings.overLimit', { count: usage.count - usage.limit })
                    : t('settings.remainingCompiles', { count: usage.remaining })
                  }
                </p>
              )}

              {/* プラン表示 */}
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.currentPlan')}: {usage.planType === 'free' ? t('settings.freePlan') : usage.planType}
                （{usage.month}）
              </p>
            </div>

            {/* 制限超過時の警告 */}
            {usage.isOverLimit && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-foreground">
                {t('settings.limitReachedMsg')}
              </div>
            )}
          </div>
        )}

        {/* ローカルサーバー選択時のメッセージ */}
        {mode === 'local' && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {t('settings.localNoCount')}
            </p>
          </div>
        )}

        {/* ロード中 */}
        {loadingUsage && (
          <div className="pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('settings.loadingUsage')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompileServerSettings;
