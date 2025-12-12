import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasskeyLoginButton } from './PasskeyLoginButton';
import { setTokens } from '@/lib/api';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  const handlePasskeySuccess = async (result: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: number; email: string };
  }) => {
    setTokens(result.accessToken, result.refreshToken, result.expiresIn);
    // ページをリロードしてAuthStoreを更新
    window.location.href = '/';
  };

  const handlePasskeyError = (errorMessage: string) => {
    setPasskeyError(errorMessage);
  };

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

        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('auth.loggingIn') : t('auth.login')}
        </Button>

        {onForgotPassword && (
          <div className="text-center">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-muted-foreground hover:text-primary underline"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-primary underline hover:no-underline"
          >
            {t('auth.register')}
          </button>
        </p>
      </form>

      <PasskeyLoginButton
        onSuccess={handlePasskeySuccess}
        onError={handlePasskeyError}
      />
    </div>
  );
}
