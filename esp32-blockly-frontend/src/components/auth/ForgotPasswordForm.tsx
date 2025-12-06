import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.auth.forgotPassword(email);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('auth.resetSendFailed'));
        return;
      }

      setSuccess(true);
    } catch {
      setError(t('auth.networkError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-green-600 text-lg font-semibold mb-2">
            {t('auth.sendComplete')}
          </div>
          <p className="text-sm text-muted-foreground">
            {t('auth.resetEmailSent')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onBack}
        >
          {t('auth.backToLogin')}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          {t('auth.enterRegisteredEmail')}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="forgot-email">{t('auth.email')}</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('auth.sending') : t('auth.sendResetLink')}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onBack}
        disabled={isLoading}
      >
        {t('auth.backToLogin')}
      </Button>
    </form>
  );
}
