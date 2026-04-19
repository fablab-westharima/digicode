import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Loader2, Shield, ShieldCheck, ShieldOff, Mail } from 'lucide-react';
import { getTwoFactorStatus, enableTwoFactor, disableTwoFactor } from '@/services/authService';

export function TwoFactorSettingsCard() {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(false);
  const [enabledAt, setEnabledAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 無効化ダイアログの状態
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // 有効化確認ダイアログの状態
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  // 2FA設定状態を取得
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getTwoFactorStatus();
        setIsEnabled(status.enabled);
        setEnabledAt(status.enabledAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('auth.2fa.statusError', { defaultValue: '設定の取得に失敗しました' }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [t]);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      // 有効化確認ダイアログを表示
      setShowEnableDialog(true);
    } else {
      // 無効化ダイアログを表示
      setShowDisableDialog(true);
    }
  };

  const handleEnable = async () => {
    setIsEnabling(true);
    setError(null);

    try {
      await enableTwoFactor();
      setIsEnabled(true);
      setEnabledAt(new Date().toISOString());
      setSuccessMessage(t('auth.2fa.enableSuccess', { defaultValue: '2段階認証を有効にしました' }));
      setShowEnableDialog(false);

      // 成功メッセージを3秒後に消す
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.2fa.enableError', { defaultValue: '2段階認証の有効化に失敗しました' }));
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDisable = async () => {
    if (!password.trim()) {
      setDisableError(t('auth.2fa.passwordRequired', { defaultValue: 'パスワードを入力してください' }));
      return;
    }

    setIsDisabling(true);
    setDisableError(null);

    try {
      await disableTwoFactor(password);
      setIsEnabled(false);
      setEnabledAt(null);
      setSuccessMessage(t('auth.2fa.disableSuccess', { defaultValue: '2段階認証を無効にしました' }));
      setShowDisableDialog(false);
      setPassword('');

      // 成功メッセージを3秒後に消す
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setDisableError(err instanceof Error ? err.message : t('auth.2fa.disableError', { defaultValue: '2段階認証の無効化に失敗しました' }));
    } finally {
      setIsDisabling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <Shield className="h-5 w-5 text-muted-foreground" />
            )}
            {t('auth.2fa.settingsTitle', { defaultValue: '2段階認証' })}
          </CardTitle>
          <CardDescription>
            {t('auth.2fa.settingsDescription', { defaultValue: 'パスワードログイン時に、メールで送信される6桁のコードを追加で入力します。' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* エラーメッセージ */}
          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* 成功メッセージ */}
          {successMessage && (
            <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-3 rounded-md">
              {successMessage}
            </div>
          )}

          {/* 有効/無効切り替え */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="2fa-toggle" className="text-base font-medium">
                {t('auth.2fa.enableLabel', { defaultValue: '2段階認証を有効にする' })}
              </Label>
              {isEnabled && enabledAt && (
                <p className="text-xs text-muted-foreground">
                  {t('auth.2fa.enabledSince', { defaultValue: '{{date}} から有効', date: formatDate(enabledAt) })}
                </p>
              )}
            </div>
            <Switch
              id="2fa-toggle"
              checked={isEnabled}
              onCheckedChange={handleToggle}
            />
          </div>

          {/* 説明 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {t('auth.2fa.howItWorks', { defaultValue: '有効にすると、パスワードログイン時に登録メールアドレスへ6桁の認証コードが送信されます。このコードを入力することでログインが完了します。' })}
              </p>
            </div>
          </div>

          {/* パスキーについての注意 */}
          <div className="text-xs text-muted-foreground">
            {t('auth.2fa.passkeyNote', { defaultValue: '※ パスキー認証やリカバリーコード認証では2段階認証は不要です。' })}
          </div>
        </CardContent>
      </Card>

      {/* 有効化確認ダイアログ */}
      <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              {t('auth.2fa.enableTitle', { defaultValue: '2段階認証を有効にする' })}
            </DialogTitle>
            <DialogDescription>
              {t('auth.2fa.enableConfirm', { defaultValue: 'パスワードログイン時に、メールで送信される認証コードが必要になります。よろしいですか？' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEnableDialog(false)}
              disabled={isEnabling}
            >
              {t('common.cancel', { defaultValue: 'キャンセル' })}
            </Button>
            <Button
              onClick={handleEnable}
              disabled={isEnabling}
            >
              {isEnabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.2fa.enable', { defaultValue: '有効にする' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 無効化ダイアログ */}
      <Dialog open={showDisableDialog} onOpenChange={(open) => {
        setShowDisableDialog(open);
        if (!open) {
          setPassword('');
          setDisableError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-orange-500" />
              {t('auth.2fa.disableTitle', { defaultValue: '2段階認証を無効にする' })}
            </DialogTitle>
            <DialogDescription>
              {t('auth.2fa.disableConfirm', { defaultValue: 'セキュリティレベルが下がります。無効にするにはパスワードを入力してください。' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">
                {t('auth.password', { defaultValue: 'パスワード' })}
              </Label>
              <Input
                id="disable-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder', { defaultValue: 'パスワードを入力' })}
                autoComplete="current-password"
              />
            </div>

            {disableError && (
              <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
                {disableError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisableDialog(false)}
              disabled={isDisabling}
            >
              {t('common.cancel', { defaultValue: 'キャンセル' })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={isDisabling || !password.trim()}
            >
              {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.2fa.disable', { defaultValue: '無効にする' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
