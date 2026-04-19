import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Mail } from 'lucide-react';
import { RecoveryCodeInputDialog } from './RecoveryCodeInputDialog';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';

export function RecoveryTab() {
  const { t } = useTranslation();
  const [showRecoveryCodeDialog, setShowRecoveryCodeDialog] = useState(false);
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <div className="space-y-6">
      {/* メールアドレス入力（共通） */}
      <div className="space-y-2">
        <Label htmlFor="recovery-email">{t('auth.email')}</Label>
        <Input
          id="recovery-email"
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {t('auth.recoveryEmailHint', { defaultValue: '復旧に使用するアカウントのメールアドレスを入力してください' })}
        </p>
      </div>

      {/* パスワードリセット */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => setShowForgotPasswordDialog(true)}
        >
          <Mail className="mr-2 h-4 w-4" />
          {t('auth.forgotPassword', { defaultValue: 'パスワードをお忘れですか？' })}
        </Button>
        <p className="text-xs text-muted-foreground pl-1">
          {t('auth.forgotPasswordHint', { defaultValue: '登録済みメールアドレスにリセットリンクを送信します' })}
        </p>
      </div>

      {/* リカバリーコードでログイン */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => setShowRecoveryCodeDialog(true)}
        >
          <KeyRound className="mr-2 h-4 w-4" />
          {t('auth.recoveryCodeLogin', { defaultValue: 'リカバリーコードでログイン' })}
        </Button>
        <p className="text-xs text-muted-foreground pl-1">
          {t('auth.recoveryCodeHint', { defaultValue: '事前に保存したリカバリーコードを使用してログインします' })}
        </p>
      </div>

      <RecoveryCodeInputDialog
        open={showRecoveryCodeDialog}
        onOpenChange={setShowRecoveryCodeDialog}
        email={email}
      />

      <ForgotPasswordDialog
        open={showForgotPasswordDialog}
        onOpenChange={setShowForgotPasswordDialog}
        initialEmail={email}
      />
    </div>
  );
}
