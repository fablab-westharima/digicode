import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasskeyLoginButton } from './PasskeyLoginButton';

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
    setPasskeyError(null);
    await onSubmit(email, password);
  };

  const handlePasskeySuccess = () => {
    // Tokens are already set by passkeyService.loginWithPasskey()
    // authStore will automatically detect the change and redirect
    setPasskeyError(null);
  };

  const handlePasskeyError = (error: string) => {
    setPasskeyError(error);
  };

  return (
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t('auth.passkey.orDivider')}
          </span>
        </div>
      </div>

      <PasskeyLoginButton
        email={email}
        onSuccess={handlePasskeySuccess}
        onError={handlePasskeyError}
      />

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
  );
}
