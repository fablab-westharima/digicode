import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('無効なリセットリンクです。メールのリンクから再度アクセスしてください。');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // パスワード一致チェック
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    // パスワード強度チェック
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('パスワードには小文字を含めてください');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('パスワードには大文字を含めてください');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('パスワードには数字を含めてください');
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-600">
              パスワードリセット完了
            </CardTitle>
            <CardDescription>
              パスワードが正常に変更されました
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">パスワードリセット</CardTitle>
          <CardDescription>
            新しいパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="8文字以上（大小英字・数字を含む）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || !token}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">パスワード（確認）</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="パスワードを再入力"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading || !token}
              />
            </div>

            <div className="text-xs text-muted-foreground">
              パスワード要件:
              <ul className="list-disc list-inside mt-1">
                <li>8文字以上</li>
                <li>大文字を含む</li>
                <li>小文字を含む</li>
                <li>数字を含む</li>
              </ul>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !token}
            >
              {isLoading ? 'リセット中...' : 'パスワードをリセット'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
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
