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
import { Loader2, CheckCircle, KeyRound } from 'lucide-react';
import { forgotPassword } from '@/services/authService';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
}

export function ForgotPasswordDialog({
  open,
  onOpenChange,
  initialEmail = '',
}: ForgotPasswordDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequest = async () => {
    if (!email.trim()) {
      setError(t('auth.emailRequired', { defaultValue: 'メールアドレスを入力してください' }));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.forgotPassword.requestFailed', { defaultValue: 'パスワードリセット申請に失敗しました' })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
      setEmail('');
      setError(null);
      setSuccess(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">
              {t('auth.forgotPassword.requestSuccessTitle', { defaultValue: 'パスワードリセットメール送信完了' })}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('auth.forgotPassword.requestSuccessDesc', { defaultValue: 'パスワードリセット用のリンクをメールで送信しました' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm">
                {t('auth.forgotPassword.emailSentTo', { defaultValue: '以下のメールアドレスにリセットリンクを送信しました：' })}
              </p>
              <p className="text-sm font-medium text-green-600">{email}</p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('auth.forgotPassword.instruction1', { defaultValue: 'メール内のリンクをクリックしてパスワードをリセットしてください。' })}</p>
              <p>{t('auth.forgotPassword.instruction2', { defaultValue: 'リンクの有効期限は1時間です。' })}</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              {t('common.close', { defaultValue: '閉じる' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t('auth.forgotPassword.title', { defaultValue: 'パスワードリセット' })}
          </DialogTitle>
          <DialogDescription>
            {t('auth.forgotPassword.description', { defaultValue: 'メールアドレスを入力してください。パスワードリセット用のリンクを送信します。' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">{t('auth.email')}</Label>
            <Input
              id="forgot-password-email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel', { defaultValue: 'キャンセル' })}
          </Button>
          <Button onClick={handleRequest} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading
              ? t('auth.sending', { defaultValue: '送信中...' })
              : t('auth.forgotPassword.sendLink', { defaultValue: 'リセットリンクを送信' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
