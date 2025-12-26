import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!password) {
      setError(t('accountDelete.enterPassword'));
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      // 現在のユーザー情報を取得
      const meResponse = await api.auth.me();
      if (!meResponse.ok) {
        throw new Error(t('accountDelete.getUserFailed'));
      }

      const userData = await meResponse.json();
      const email = userData.user.email;

      // パスワードでログインして本人確認
      const loginResponse = await api.auth.login(email, password);
      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.error || t('accountDelete.incorrectPassword'));
      }

      // アカウント削除APIを呼び出し
      const deleteResponse = await api.auth.deleteAccount();
      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json();
        throw new Error(errorData.error || t('accountDelete.deleteFailed'));
      }

      // 削除成功 - トークンをクリア
      removeToken();

      // ダイアログを閉じる
      onOpenChange(false);

      // ログイン画面にリダイレクト
      alert(t('accountDelete.deleteSuccess'));
      navigate('/auth');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('accountDelete.deleteFailed')
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
            {t('accountDelete.title')}
          </DialogTitle>
          <DialogDescription>
            {t('accountDelete.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 警告メッセージ */}
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-200 space-y-2">
                <p className="font-semibold">{t('accountDelete.warningTitle')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('accountDelete.warningProjects')}</li>
                  <li>{t('accountDelete.warningPasskeys')}</li>
                  <li>{t('accountDelete.warningCompileHistory')}</li>
                  <li>{t('accountDelete.warningAccountInfo')}</li>
                </ul>
                <p className="font-semibold mt-3">
                  ⚠️ {t('accountDelete.irreversible')}
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
              {t('accountDelete.passwordPrompt')}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('accountDelete.passwordPlaceholder')}
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
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || !password}
              className="flex-1"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('accountDelete.deleteButton')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
