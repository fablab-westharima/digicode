import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { verifyRecoveryCode } from '@/services/passkeyService';
import { setTokens } from '@/lib/api';

interface RecoveryCodeInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

export function RecoveryCodeInputDialog({ open, onOpenChange, email: initialEmail }: RecoveryCodeInputDialogProps) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // initialEmailが変更されたらemailステートを更新
  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!code.trim()) {
      setError('リカバリーコードを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyRecoveryCode(email, code);

      // トークン保存
      setTokens(result.accessToken, result.refreshToken, result.expiresIn);
      localStorage.setItem('user', JSON.stringify(result.user));

      // ログイン成功、ページリロード
      window.location.href = '/';
    } catch (error) {
      setError(error instanceof Error ? error.message : 'リカバリーコードの検証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCode = (value: string) => {
    // ハイフンと英数字以外を除去
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');

    // ハイフンを除去した文字列
    const withoutHyphens = cleaned.replace(/-/g, '');

    // 12文字まで制限
    const limited = withoutHyphens.slice(0, 12);

    // XXXX-XXXX-XXXX形式に整形
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 8) {
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)}-${limited.slice(4, 8)}-${limited.slice(8)}`;
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            リカバリーコードでログイン
          </DialogTitle>
          <DialogDescription>
            パスキーを紛失した場合、リカバリーコードを使用してログインできます。
            <br />
            各コードは1回のみ使用可能です。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例: user@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="recovery-code">リカバリーコード</Label>
            <Input
              id="recovery-code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="XXXX-XXXX-XXXX"
              className="font-mono text-lg tracking-wider"
              maxLength={14} // 12文字 + 2ハイフン
              autoComplete="off"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              形式: XXXX-XXXX-XXXX（大文字英数字12文字）
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ ログイン後、新しいパスキーを登録してください
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isLoading || code.length < 14}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ログイン
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
