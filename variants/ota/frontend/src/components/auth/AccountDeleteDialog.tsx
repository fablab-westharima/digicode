import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserX, Loader2, AlertTriangle } from 'lucide-react';
import { api, removeToken } from '@/lib/api';

interface AccountDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDeleteDialog({
  open,
  onOpenChange,
}: AccountDeleteDialogProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!password) {
      setError('パスワードを入力してください');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // 現在のユーザー情報を取得
      const meResponse = await api.auth.me();
      if (!meResponse.ok) {
        throw new Error('ユーザー情報の取得に失敗しました。再度ログインしてください。');
      }

      const userData = await meResponse.json();
      const email = userData.user.email;

      // パスワードでログインして本人確認
      const loginResponse = await api.auth.login(email, password);
      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.error || 'パスワードが正しくありません');
      }

      // アカウント削除APIを呼び出し
      const deleteResponse = await api.auth.deleteAccount();
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error || 'アカウント削除に失敗しました');
      }

      // 削除成功 - トークンをクリア
      removeToken();

      // ダイアログを閉じる
      onOpenChange(false);

      // ログイン画面にリダイレクト
      alert('アカウントを削除しました。ご利用ありがとうございました。');
      navigate('/auth');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'アカウント削除に失敗しました'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setPassword('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <UserX className="h-5 w-5" />
            アカウント削除
          </DialogTitle>
          <DialogDescription>
            アカウントを削除すると、全てのデータが失われます。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 警告メッセージ */}
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
                <p className="font-semibold">以下のデータが完全に削除されます：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>すべてのプロジェクト</li>
                  <li>登録済みのパスキー</li>
                  <li>コンパイル使用履歴</li>
                  <li>アカウント情報</li>
                </ul>
                <p className="font-semibold mt-3">
                  ⚠️ この操作は取り消せません
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
              {error}
            </div>
          )}

          {/* パスワード入力 */}
          <div className="space-y-2">
            <Label htmlFor="password">
              パスワードを入力して本人確認してください
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              disabled={isDeleting}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isDeleting) {
                  handleDelete();
                }
              }}
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isDeleting}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !password}
              className="flex-1"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              アカウントを削除
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
