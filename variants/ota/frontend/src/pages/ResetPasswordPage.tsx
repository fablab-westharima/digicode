import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, X } from 'lucide-react';
import { api } from '@/lib/api';

// パスワード要件チェック（RegisterFormと同じ）
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
      setError('無効なリセットリンクです。メールのリンクから再度アクセスしてください。');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // パスワード要件チェック
    if (!allRequirementsMet) {
      setError('パスワードが要件を満たしていません');
      return;
    }

    // パスワード一致チェック
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (!token) {
      setError('トークンが見つかりません');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.auth.resetPassword(token, password);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'パスワードのリセットに失敗しました');
        return;
      }

      setSuccess(true);
    } catch {
      setError('通信エラーが発生しました');
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
              パスワードリセット完了
            </CardTitle>
            <CardDescription className="text-[#8B949E]">
              パスワードが正常に変更されました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#8B949E] text-center">
              新しいパスワードでログインしてください。
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/')}
            >
              ログインページへ
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
          <CardTitle className="text-2xl text-[#E6EDF3]">パスワードリセット</CardTitle>
          <CardDescription className="text-[#8B949E]">
            新しいパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-[#E6EDF3]">新しいパスワード</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="8文字以上（大小英字・数字・特殊文字を含む）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setShowRequirements(true)}
                required
                disabled={isLoading || !token}
                className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] placeholder:text-[#484F58]"
              />

              {/* パスワード要件表示（リアルタイムチェック） */}
              {showRequirements && (
                <div className="bg-[#0D1117] border border-[#2E333D] rounded-md p-3 space-y-1.5 text-xs">
                  <div className="text-[#8B949E] font-medium mb-2">
                    パスワードの要件:
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.minLength ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.minLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>8文字以上</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasLowercase ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasLowercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>小文字 (a-z) を含む</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasUppercase ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>大文字 (A-Z) を含む</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasNumber ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>数字 (0-9) を含む</span>
                  </div>

                  <div className={`flex items-center gap-2 ${requirements.hasSpecialChar ? 'text-green-500' : 'text-[#8B949E]'}`}>
                    {requirements.hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>特殊文字 (!@#$%^&* など) を含む</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-[#E6EDF3]">パスワード（確認）</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="パスワードを再入力"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading || !token}
                className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3] placeholder:text-[#484F58]"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">パスワードが一致しません</p>
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
              {isLoading ? 'リセット中...' : 'パスワードをリセット'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-[#8B949E] hover:text-[#E6EDF3]"
              onClick={() => navigate('/')}
              disabled={isLoading}
            >
              キャンセル
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
