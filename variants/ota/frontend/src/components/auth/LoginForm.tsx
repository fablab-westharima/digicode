import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasskeyLoginButton } from './PasskeyLoginButton';
import { OtpInputDialog } from './OtpInputDialog';
import { setTokens } from '@/lib/api';
import { sendOtp } from '@/services/authService';

// Cloudflare Pagesでは環境変数が使えないため、hostnameで判定
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  // BUG-083: email未認証 (email_verified=0) 時に EmailVerificationWaiting に切替するための callback
  onNeedsVerification?: (email: string) => void;
}

export function LoginForm({ isLoading, error, onNeedsVerification }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyOnlyMode, setPasskeyOnlyMode] = useState(false);
  const [isCheckingMode, setIsCheckingMode] = useState(false);
  // 2FA関連の状態
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      // 2FA API を使用（パスワード検証 + 2FA判定）
      const result = await sendOtp(email, password);

      // BUG-083: email未認証時は EmailVerificationWaiting に誘導 (admin 介入なし自己解決経路)
      if (result.needsVerification) {
        onNeedsVerification?.(email);
        return;
      }

      if (result.twoFactorRequired) {
        // 2FA が必要な場合、OTP入力ダイアログを表示
        setTwoFactorEmail(email);
        setShowOtpDialog(true);
      } else if (result.accessToken && result.user) {
        // 2FA不要の場合、直接ログイン完了
        setTokens(result.accessToken, result.refreshToken!, result.expiresIn || 3600);
        localStorage.setItem('user', JSON.stringify(result.user));
        window.location.href = '/';
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : t('auth.loginError', { defaultValue: 'ログインに失敗しました' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSuccess = () => {
    // OTP検証成功後、ページリロード
    window.location.href = '/';
  };

  const handlePasskeySuccess = async (result: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: number; email: string; passkeyOnly?: number };
  }) => {
    setTokens(result.accessToken, result.refreshToken, result.expiresIn);
    localStorage.setItem('user', JSON.stringify(result.user));
    // ページをリロードしてAuthStoreを更新
    window.location.href = '/';
  };

  const handlePasskeyError = (errorMessage: string) => {
    setPasskeyError(errorMessage);
  };

  // メールアドレス入力後、パスキーのみモードかチェック
  useEffect(() => {
    const checkPasskeyMode = async () => {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setPasskeyOnlyMode(false);
        return;
      }

      setIsCheckingMode(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/check-passkey-mode?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        setPasskeyOnlyMode(data.passkeyOnly || false);
      } catch (error) {
        console.error('Failed to check passkey mode:', error);
        setPasskeyOnlyMode(false);
      } finally {
        setIsCheckingMode(false);
      }
    };

    // メールアドレスが変更されてから500ms後にチェック（デバウンス）
    const timer = setTimeout(checkPasskeyMode, 500);
    return () => clearTimeout(timer);
  }, [email]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input
            id="email"
            type="text"
            placeholder={t('auth.emailOrLoginIdPlaceholder', { defaultValue: 'メールアドレスまたはログインID' })}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        {!passkeyOnlyMode && (
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!passkeyOnlyMode}
              disabled={isLoading}
            />
          </div>
        )}

        {passkeyOnlyMode && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {t('auth.passkeyOnlyModeNotice', { defaultValue: 'このアカウントはパスキーのみでログイン可能です。' })}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
              {t('auth.passkeyOnlyRecoveryHint', { defaultValue: 'パスキーが使えない場合は「復旧」タブをご利用ください。' })}
            </p>
          </div>
        )}

        {(error || loginError) && (
          <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
            {error || loginError}
          </div>
        )}

        {passkeyError && (
          <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
            {passkeyError}
          </div>
        )}

        {!passkeyOnlyMode && (
          <Button type="submit" className="w-full" disabled={isLoading || isSubmitting || isCheckingMode}>
            {(isLoading || isSubmitting) ? t('auth.loggingIn') : t('auth.login')}
          </Button>
        )}
      </form>

      <PasskeyLoginButton
        onSuccess={handlePasskeySuccess}
        onError={handlePasskeyError}
      />

      {/* 2FA OTP入力ダイアログ */}
      <OtpInputDialog
        open={showOtpDialog}
        onOpenChange={setShowOtpDialog}
        email={twoFactorEmail}
        onSuccess={handleOtpSuccess}
      />
    </div>
  );
}
