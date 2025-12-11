import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Fingerprint } from 'lucide-react';
import { loginWithPasskey } from '@/services/passkeyService';

interface PasskeyLoginButtonProps {
  email: string;
  onSuccess: (user: { id: number; email: string }) => void;
  onError?: (error: string) => void;
}

export function PasskeyLoginButton({ email, onSuccess, onError }: PasskeyLoginButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handlePasskeyLogin = async () => {
    if (!email) {
      onError?.(t('auth.email') + ' is required');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithPasskey(email);

      if (result.success && result.user) {
        onSuccess(result.user);
      } else {
        onError?.(result.error || t('auth.passkey.loginError'));
      }
    } catch (error) {
      console.error('Passkey login error:', error);
      onError?.(
        error instanceof Error ? error.message : t('auth.passkey.loginError')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handlePasskeyLogin}
      disabled={isLoading || !email}
    >
      <Fingerprint className="mr-2 h-4 w-4" />
      {isLoading ? t('auth.passkey.loggingInWithPasskey') : t('auth.passkey.loginWithPasskey')}
    </Button>
  );
}
