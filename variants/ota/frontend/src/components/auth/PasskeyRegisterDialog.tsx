import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fingerprint, Loader2 } from 'lucide-react';
import { registerPasskey, isPasskeySupported } from '@/services/passkeyService';

interface PasskeyRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PasskeyRegisterDialog({
  open,
  onOpenChange,
  onSuccess,
}: PasskeyRegisterDialogProps) {
  const { t } = useTranslation();
  const [deviceName, setDeviceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // パスキーサポートチェック
  const supported = isPasskeySupported();

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await registerPasskey(deviceName || undefined);
      onOpenChange(false);
      setDeviceName('');
      onSuccess?.();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.passkey.registerFailed', 'パスキーの登録に失敗しました'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setDeviceName('');
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            {t('auth.passkey.registerPasskey', 'パスキーを登録')}
          </DialogTitle>
          <DialogDescription>
            {supported
              ? t(
                  'auth.passkey.registerDesc',
                  'このデバイスにパスキーを登録すると、次回からパスワードなしでログインできます。'
                )
              : t('auth.passkey.notSupported', 'お使いのブラウザはパスキーをサポートしていません')}
          </DialogDescription>
        </DialogHeader>

        {supported && (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">
                  {t('auth.passkey.deviceName', 'デバイス名')}
                  <span className="text-muted-foreground ml-1">
                    ({t('common.optional', '省略可')})
                  </span>
                </Label>
                <Input
                  id="device-name"
                  placeholder={t('auth.passkey.deviceNamePlaceholder', '例: MacBook Pro')}
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={isLoading}
                  maxLength={50}
                />
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                {t('common.cancel', 'キャンセル')}
              </Button>
              <Button onClick={handleRegister} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading
                  ? t('auth.passkey.registeringPasskey', 'パスキーを登録中...')
                  : t('auth.passkey.registerPasskey', 'パスキーを登録')}
              </Button>
            </DialogFooter>
          </>
        )}

        {!supported && (
          <DialogFooter>
            <Button onClick={handleClose}>{t('common.close', '閉じる')}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
