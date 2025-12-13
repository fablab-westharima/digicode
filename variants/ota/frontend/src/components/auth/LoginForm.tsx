import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasskeyLoginButton } from './PasskeyLoginButton';
import { RecoveryRequestDialog } from './RecoveryRequestDialog';
import { RecoveryCodeInputDialog } from './RecoveryCodeInputDialog';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { setTokens } from '@/lib/api';

// Cloudflare Pagesでは環境変数が使えないため、hostnameで判定
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
  onForgotPassword?: () => void;
  isLoading: boolean;
  error: string | null;
}

export function LoginForm({ onSubmit, onSwitchToRegister, onForgotPassword, isLoading, error }: LoginFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeyOnlyMode, setPasskeyOnlyMode] = useState(false);
  const [isCheckingMode, setIsCheckingMode] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showRecoveryCodeDialog, setShowRecoveryCodeDialog] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
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
            type="email"
            placeholder={t('auth.emailPlaceholder')}
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
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {t('auth.passkeyOnlyModeNotice', 'このアカウントはパスキーのみでログイン可能です。')}
            </p>
            <div className="flex flex-col gap-1 mt-2">
              <Button
                type="button"
                variant="link"
                onClick={() => setShowRecoveryCodeDialog(true)}
                className="p-0 h-auto text-blue-600 hover:text-blue-800 justify-start"
              >
                リカバリーコードでログイン
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => setShowRecoveryDialog(true)}
                className="p-0 h-auto text-blue-600 hover:text-blue-800 justify-start"
              >
                {t('auth.passkeyLostRecovery', 'パスキーを使えない場合（メールリカバリー）')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {passkeyError && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
            {passkeyError}
          </div>
        )}

        {!passkeyOnlyMode && (
          <Button type="submit" className="w-full" disabled={isLoading || isCheckingMode}>
            {isLoading ? t('auth.loggingIn') : t('auth.login')}
          </Button>
        )}
      </form>

      <PasskeyLoginButton
        onSuccess={handlePasskeySuccess}
        onError={handlePasskeyError}
      />

      {/* 区切り線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t('auth.accountRecovery', 'アカウント復旧')}
          </span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <div>
          <button
            type="button"
            onClick={() => setShowForgotPasswordDialog(true)}
            className="text-sm text-muted-foreground hover:text-primary underline"
          >
            {t('auth.forgotPassword', 'パスワードをお忘れですか？')}
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={() => setShowRecoveryCodeDialog(true)}
            className="text-sm text-muted-foreground hover:text-primary underline"
          >
            リカバリーコードでログイン
          </button>
        </div>
      </div>

      <RecoveryRequestDialog
        open={showRecoveryDialog}
        onOpenChange={setShowRecoveryDialog}
      />

      <RecoveryCodeInputDialog
        open={showRecoveryCodeDialog}
        onOpenChange={setShowRecoveryCodeDialog}
        email={email}
      />

      <ForgotPasswordDialog
        open={showForgotPasswordDialog}
        onOpenChange={setShowForgotPasswordDialog}
      />
    </div>
  );
}
