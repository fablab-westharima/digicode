import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { registerPasskey } from '@/services/passkeyService';

interface PasskeyRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasskeyRegisterDialog({ open, onOpenChange }: PasskeyRegisterDialogProps) {
  const { t } = useTranslation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setIsRegistering(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await registerPasskey();

      if (result.success) {
        setSuccess(true);
        // Auto-close dialog after 2 seconds
        setTimeout(() => {
          onOpenChange(false);
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || t('auth.passkey.registerError'));
      }
    } catch (err) {
      console.error('Passkey registration error:', err);
      setError(
        err instanceof Error ? err.message : t('auth.passkey.registerError')
      );
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClose = () => {
    if (!isRegistering) {
      onOpenChange(false);
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            {t('auth.passkey.registerPasskey')}
          </DialogTitle>
          <DialogDescription>
            {t('auth.passkey.registerNewPasskey')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
              <CheckCircle className="h-4 w-4" />
              {t('auth.passkey.registerSuccess')}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-md">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-2">
            <p>パスキーを登録すると、次回から生体認証でログインできます。</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>指紋認証</li>
              <li>顔認証</li>
              <li>PINコード</li>
            </ul>
          </div>

          <Button
            onClick={handleRegister}
            disabled={isRegistering || success}
            className="w-full"
          >
            {isRegistering ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('auth.passkey.registeringPasskey')}
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" />
                {t('auth.passkey.registerPasskey')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
