import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { verifyRecovery } from '@/services/authService';
import { setTokens } from '@/lib/api';

export function RecoveryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();

  const [isRecovering, setIsRecovering] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  useEffect(() => {
    const recover = async () => {
      if (!token) {
        setError(t('auth.recovery.invalidToken', { defaultValue: '無効なリカバリーリンクです' }));
        setIsRecovering(false);
        return;
      }

      try {
        const result = await verifyRecovery(token);

        // トークンを保存
        setTokens(result.accessToken, result.refreshToken, result.expiresIn);

        setSuccess(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('auth.recovery.failed', { defaultValue: 'アカウントリカバリーに失敗しました' })
        );
      } finally {
        setIsRecovering(false);
      }
    };

    recover();
  }, [token, t]);

  // 成功時のカウントダウン
  useEffect(() => {
    if (success && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (success && redirectCountdown === 0) {
      // ホームページにリダイレクト（リロードしてAuthStoreを更新）
      window.location.href = '/';
    }
  }, [success, redirectCountdown]);

  if (isRecovering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
        <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-green-500" />
              <p className="text-[#E6EDF3]">
                {t('auth.recovery.recovering', { defaultValue: 'アカウントを復旧中...' })}
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
              {t('auth.recovery.successTitle', { defaultValue: 'リカバリー完了' })}
            </CardTitle>
            <CardDescription className="text-[#8B949E]">
              {t('auth.recovery.successDesc', { defaultValue: 'アカウントが復旧され、ログインしました' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-[#0D1117] p-4 space-y-2 text-center">
              <p className="text-sm text-[#8B949E]">
                {t('auth.recovery.redirecting', { defaultValue: '{count}秒後に自動的にホームページに移動します', count: redirectCountdown, })}
              </p>
              <div className="w-full bg-[#2E333D] rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${((3 - redirectCountdown) / 3) * 100}%` }}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => { window.location.href = '/'; }}
            >
              {t('common.goToHome', { defaultValue: 'ホームへ' })}
            </Button>

            <p className="text-xs text-[#8B949E] text-center">
              {t('auth.recovery.registerPasskeyRecommendation', { defaultValue: 'セキュリティのため、新しいパスキーを登録することをお勧めします。' })}
            </p>
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
            {t('auth.recovery.errorTitle', { defaultValue: 'リカバリーエラー' })}
          </CardTitle>
          <CardDescription className="text-[#8B949E]">
            {error || t('auth.recovery.failed', { defaultValue: 'アカウントリカバリーに失敗しました' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#8B949E] text-center">
            {t('auth.recovery.errorInstruction', { defaultValue: 'リンクが無効または期限切れの可能性があります。' })}
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
