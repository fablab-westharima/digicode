import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';

interface PasswordRequirements {
  minLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

function checkPasswordRequirements(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 8,
    hasLowercase: /[a-z]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const requirements = checkPasswordRequirements(password);
  const allRequirementsMet = Object.values(requirements).every(Boolean);

  useEffect(() => {
    if (!token) {
      setError(t('auth.resetPassword.invalidToken', { defaultValue: '無効なリセットリンクです。メールのリンクから再度アクセスしてください。' }));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!allRequirementsMet) {
      setError(t('auth.passwordRequirementsNotMet', { defaultValue: 'パスワードが要件を満たしていません' }));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch', { defaultValue: 'パスワードが一致しません' }));
      return;
    }

    if (!token) {
      setError(t('auth.resetPassword.tokenMissing', { defaultValue: 'トークンが見つかりません' }));
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.auth.resetPassword(token, password);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('auth.resetPassword.failed', { defaultValue: 'パスワードのリセットに失敗しました' }));
        return;
      }

      setSuccess(true);
    } catch {
      setError(t('auth.resetPassword.networkError', { defaultValue: '通信エラーが発生しました' }));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117] px-4">
        <Card className="w-full max-w-md bg-[#161B22] border-[#2E333D]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-500">
              {t('auth.resetPassword.completeTitle', { defaultValue: 'パスワードリセット完了' })}
            </CardTitle>
            <CardDescription className="text-[#8B949E]">
              {t('auth.resetPassword.completeDesc', { defaultValue: 'パスワードが正常に変更されました' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8B949E] text-center">
              {t('auth.resetPassword.loginPrompt', { defaultValue: '新しいパスワードでログインしてください。' })}
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/')}
            >
              {t('auth.resetPassword.goToLogin', { defaultValue: 'ログインページへ' })}
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
          <CardTitle className="text-2xl text-[#E6EDF3]">
            {t('auth.forgotPassword.title', { defaultValue: 'パスワードリセット' })}
          </CardTitle>
          <CardDescription className="text-[#8B949E]">
            {t('auth.resetPassword.description', { defaultValue: '新しいパスワードを入力してください' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-[#E6EDF3]">
                {t('auth.resetPassword.newPasswordLabel', { defaultValue: '新しいパスワード' })}
              </Label>
              <Input
                id="new-password"
                type="password"
                placeholder={t('auth.resetPassword.passwordPlaceholder', { defaultValue: '8文字以上（大小英字・数字・特殊文字を含む）' })}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowRequirements(true)}
                required
                disabled={isLoading || !token}
                className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] placeholder:text-[#484F58]"
              />

              {showRequirements && (
                <div className="bg-[#0D1117] border border-[#2E333D] rounded-md p-3 space-y-1.5 text-xs">
                  <div className="text-[#8B949E] font-medium mb-2">
                    {t('auth.passwordRequirements', { defaultValue: 'パスワードの要件:' })}
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.minLength ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.minLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{t('auth.req.minLength', { defaultValue: '8文字以上' })}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasLowercase ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{t('auth.req.lowercase', { defaultValue: '小文字 (a-z) を含む' })}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasUppercase ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{t('auth.req.uppercase', { defaultValue: '大文字 (A-Z) を含む' })}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasNumber ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{t('auth.req.number', { defaultValue: '数字 (0-9) を含む' })}</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasSpecialChar ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>{t('auth.req.special', { defaultValue: '特殊文字 (!@#$%^&* など) を含む' })}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-[#E6EDF3]">
                {t('auth.confirmPassword', { defaultValue: 'パスワード（確認）' })}
              </Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder={t('auth.confirmPasswordPlaceholder', { defaultValue: 'パスワードを再入力' })}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading || !token}
                className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] placeholder:text-[#484F58]"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">{t('auth.passwordMismatch', { defaultValue: 'パスワードが一致しません' })}</p>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-900/30 border border-red-700 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !token || !allRequirementsMet || password !== confirmPassword}
            >
              {isLoading
                ? t('auth.resetPassword.resetting', { defaultValue: 'リセット中...' })
                : t('auth.resetPassword.submit', { defaultValue: 'パスワードをリセット' })}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-[#8B949E] hover:text-[#E6EDF3]"
              onClick={() => navigate('/')}
              disabled={isLoading}
            >
              {t('common.cancel', { defaultValue: 'キャンセル' })}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
