import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, Trash2, Plus, Loader2 } from 'lucide-react';
import {
  listPasskeys,
  deletePasskey,
  isPasskeySupported,
} from '@/services/passkeyService';
import { PasskeyRegisterDialog } from './PasskeyRegisterDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PasskeyManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Passkey {
  id: number;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export function PasskeyManagementDialog({
  open,
  onOpenChange,
}: PasskeyManagementDialogProps) {
  const { t } = useTranslation();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supported = isPasskeySupported();

  const loadPasskeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listPasskeys();
      setPasskeys(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.passkey.loadFailed', 'パスキー一覧の取得に失敗しました')
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && supported) {
      loadPasskeys();
    }
  }, [open, supported]);

  const handleDelete = async (id: number) => {
    setIsDeleting(true);
    setError(null);

    try {
      await deletePasskey(id);
      setDeleteConfirm(null);
      await loadPasskeys();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.passkey.deleteFailed', 'パスキーの削除に失敗しました')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return t('auth.passkey.neverUsed', '未使用');
    }
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              {t('auth.passkey.managePasskeys', 'パスキー管理')}
            </DialogTitle>
            <DialogDescription>
              {supported
                ? t(
                    'auth.passkey.manageDesc',
                    '登録済みのパスキーを管理します。不要なパスキーは削除できます。'
                  )
                : t('auth.passkey.notSupported', 'お使いのブラウザはパスキーをサポートしていません')}
            </DialogDescription>
          </DialogHeader>

          {supported && (
            <div className="space-y-4">
              {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : passkeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Fingerprint className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('auth.passkey.noPasskeys', 'パスキーが登録されていません')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {passkey.deviceName || t('auth.passkey.unnamedDevice', '名前なし')}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 mt-1">
                          <div>
                            {t('auth.passkey.createdAt', '登録日時')}:{' '}
                            {formatDate(passkey.createdAt)}
                          </div>
                          <div>
                            {t('auth.passkey.lastUsedAt', '最終使用日時')}:{' '}
                            {formatDate(passkey.lastUsedAt)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(passkey.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => setShowRegisterDialog(true)}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('auth.passkey.registerNewPasskey', '新しいパスキーを登録')}
              </Button>
            </div>
          )}

          {!supported && (
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                {t('common.close', '閉じる')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PasskeyRegisterDialog
        open={showRegisterDialog}
        onOpenChange={setShowRegisterDialog}
        onSuccess={loadPasskeys}
      />

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('auth.passkey.deleteConfirmTitle', 'パスキーを削除しますか？')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'auth.passkey.deleteConfirmDesc',
                'このパスキーを削除すると、このデバイスではパスキーでログインできなくなります。'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('common.cancel', 'キャンセル')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete', '削除')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
