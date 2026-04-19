import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle } from 'lucide-react';
import { sendVerificationEmail } from '@/services/authService';

interface EmailVerificationWaitingProps {
  email: string;
  onBackToLogin: () => void;
}

export function EmailVerificationWaiting({ email, onBackToLogin }: EmailVerificationWaitingProps) {
  const { t } = useTranslation();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      await sendVerificationEmail(email);
      setResendSuccess(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.verification.resendFailed', { defaultValue: '確認メールの再送信に失敗しました' })
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
      <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Mail className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-[#E6EDF3]">
            {t('auth.verification.title', { defaultValue: 'メールアドレスの確認' })}
          </CardTitle>
          <CardDescription className="text-[#8B949E]">
            {t('auth.verification.description', { defaultValue: '確認メールを送信しました' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-[#0D1117] p-4 space-y-2">
            <p className="text-sm text-[#E6EDF3]">
              {t('auth.verification.emailSentTo', { defaultValue: '以下のメールアドレスに確認メールを送信しました：' })}
            </p>
            <p className="text-sm font-medium text-green-500">{email}</p>
          </div>

          <div className="space-y-2 text-sm text-[#8B949E]">
            <p>{t('auth.verification.instruction1', { defaultValue: 'メール内のリンクをクリックして、アカウントを有効化してください。' })}</p>
            <p>{t('auth.verification.instruction2', { defaultValue: 'メールが届かない場合は、迷惑メールフォルダをご確認ください。' })}</p>
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {t('auth.verification.resendSuccess', { defaultValue: '確認メールを再送信しました' })}
            </div>
          )}

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || resendSuccess}
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.verification.resend', { defaultValue: '確認メールを再送信' })}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={onBackToLogin}
            >
              {t('auth.backToLogin', { defaultValue: 'ログインに戻る' })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
