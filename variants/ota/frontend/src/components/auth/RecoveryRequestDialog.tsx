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
import { requestRecovery } from '@/services/authService';

interface RecoveryRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecoveryRequestDialog({
  open,
  onOpenChange,
}: RecoveryRequestDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRequest = async () => {
    if (!email.trim()) {
      setError(t('auth.emailRequired', 'メールアドレスを入力してください'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await requestRecovery(email);
      setSuccess(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.recovery.requestFailed', 'リカバリー申請に失敗しました')
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">
              {t('auth.recovery.requestSuccessTitle', 'リカバリーメール送信完了')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t(
                'auth.recovery.requestSuccessDesc',
                'リカバリー用のリンクをメールで送信しました'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm">
                {t('auth.recovery.emailSentTo', '以下のメールアドレスにリカバリーリンクを送信しました：')}
              </p>
              <p className="text-sm font-medium text-green-600">{email}</p>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>{t('auth.recovery.instruction1', 'メール内のリンクをクリックしてアカウントを復旧してください。')}</p>
              <p>{t('auth.recovery.instruction2', 'リンクの有効期限は1時間です。')}</p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose} className="w-full">
              {t('common.close', '閉じる')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {t('auth.recovery.requestTitle', 'アカウントリカバリー')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'auth.recovery.requestDesc',
              'パスキーにアクセスできない場合、メールアドレスでアカウントを復旧できます'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="recovery-email">{t('auth.email')}</Label>
            <Input
              id="recovery-email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoFocus
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
          <Button onClick={handleRequest} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading
              ? t('auth.sending', '送信中...')
              : t('auth.recovery.sendLink', 'リカバリーリンクを送信')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
