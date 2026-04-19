import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { verifyEmail } from '@/services/authService';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const [isVerifying, setIsVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError(t('auth.verification.invalidToken', { defaultValue: '無効な確認リンクです' }));
        setIsVerifying(false);
        return;
      }

      try {
        const result = await verifyEmail(token);
        if (result.verified) {
          setSuccess(true);
        } else {
          setError(result.message || t('auth.verification.failed', { defaultValue: 'メール確認に失敗しました' }));
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('auth.verification.failed', { defaultValue: 'メール確認に失敗しました' })
        );
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [token, t]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
        <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-green-500" />
              <p className="text-[#E6EDF3]">
                {t('auth.verification.verifying', { defaultValue: 'メールアドレスを確認中...' })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
        <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-[#E6EDF3]">
              {t('auth.verification.successTitle', { defaultValue: 'メール確認完了' })}
            </CardTitle>
            <CardDescription className="text-[#8B949E]">
              {t('auth.verification.successDesc', { defaultValue: 'メールアドレスが確認されました' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8B949E] text-center">
              {t('auth.verification.canLoginNow', { defaultValue: 'ログインしてご利用ください。' })}
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/auth')}
            >
              {t('auth.login', { defaultValue: 'ログイン' })}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
      <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-[#E6EDF3]">
            {t('auth.verification.errorTitle', { defaultValue: 'メール確認エラー' })}
          </CardTitle>
          <CardDescription className="text-[#8B949E]">
            {error || t('auth.verification.failed', { defaultValue: 'メール確認に失敗しました' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#8B949E] text-center">
            {t('auth.verification.errorInstruction', { defaultValue: 'リンクが無効または期限切れの可能性があります。' })}
          </p>
          <Button
            className="w-full"
            onClick={() => navigate('/auth')}
          >
            {t('auth.backToLogin', { defaultValue: 'ログインに戻る' })}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
