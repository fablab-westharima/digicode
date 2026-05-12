import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fingerprint } from 'lucide-react';
import { authenticateWithPasskey, isPasskeySupported } from '@/services/passkeyService';

interface PasskeyLoginButtonProps {
  onSuccess: (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: number; email: string };
  }) => void;
  onError: (error: string) => void;
  // F-6: email 未認証 (email_verified=0) 時に EmailVerificationWaiting に切替するための callback
  onNeedsVerification?: (email: string) => void;
}

export function PasskeyLoginButton({ onSuccess, onError, onNeedsVerification }: PasskeyLoginButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');

  // パスキーサポートチェック
  if (!isPasskeySupported()) {
    return null;
  }

  const handlePasskeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      onError(t('auth.emailRequired', { defaultValue: 'メールアドレスを入力してください' }));
      return;
    }

    setIsLoading(true);
    try {
      const result = await authenticateWithPasskey(email);
      // F-6: email 未認証時は EmailVerificationWaiting に誘導 (admin 介入なし自己解決経路)
      if (result.needsVerification) {
        onNeedsVerification?.(email);
        return;
      }
      // 通常 path = 全 field 存在保証 (type narrow)
      if (result.accessToken && result.refreshToken && result.user) {
        onSuccess({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn ?? 3600,
          user: result.user,
        });
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : t('auth.passkeyLoginFailed', { defaultValue: 'パスキーログインに失敗しました' }));
    } finally {
      setIsLoading(false);
    }
  };

  if (!showEmailInput) {
    return (
      <div className="mt-4 space-y-4">
        {/* セパレーター */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('auth.or', { defaultValue: 'または' })}
            </span>
          </div>
        </div>
        {/* ボタン */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setShowEmailInput(true)}
        >
          <Fingerprint className="mr-2 h-4 w-4" />
          {t('auth.passkey.loginWithPasskey', { defaultValue: 'パスキーでログイン' })}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t('auth.passkey.loginWithPasskey', { defaultValue: 'パスキーでログイン' })}
          </span>
        </div>
      </div>
      <form onSubmit={handlePasskeyLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="passkey-email">{t('auth.email')}</Label>
          <Input
            id="passkey-email"
            type="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => {
              setShowEmailInput(false);
              setEmail('');
            }}
            disabled={isLoading}
          >
            {t('common.cancel', { defaultValue: 'キャンセル' })}
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            <Fingerprint className="mr-2 h-4 w-4" />
            {isLoading
              ? t('auth.passkey.loggingInWithPasskey', { defaultValue: 'パスキーでログイン中...' })
              : t('auth.passkey.loginWithPasskey', { defaultValue: 'パスキーでログイン' })}
          </Button>
        </div>
      </form>
    </div>
  );
}
