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
import { Fingerprint, Trash2, Plus, Loader2, AlertTriangle, Shield, KeyRound } from 'lucide-react';
import {
  listPasskeys,
  deletePasskey,
  isPasskeySupported,
  setPasskeyOnlyMode,
  generateRecoveryCodes,
  getRecoveryCodesCount,
  regenerateRecoveryCodes,
} from '@/services/passkeyService';
import { PasskeyRegisterDialog } from './PasskeyRegisterDialog';
import { RecoveryCodesDisplay } from './RecoveryCodesDisplay';

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
  const [passkeyOnlyMode, setPasskeyOnlyModeState] = useState(false);
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesCount, setRecoveryCodesCount] = useState<number>(0);
  const [showRecoveryCodesDisplay, setShowRecoveryCodesDisplay] = useState(false);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  const supported = isPasskeySupported();

  const loadPasskeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listPasskeys();
      setPasskeys(result);

      // パスキーのみモードの状態を取得（userオブジェクトから）
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setPasskeyOnlyModeState(user.passkeyOnly === 1);
      }

      // リカバリーコード数を取得
      try {
        const count = await getRecoveryCodesCount();
        setRecoveryCodesCount(count);
      } catch {
        // リカバリーコード数取得エラーは無視（未実装の可能性）
        setRecoveryCodesCount(0);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.passkey.loadFailed', { defaultValue: 'パスキー一覧の取得に失敗しました' })
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
          : t('auth.passkey.deleteFailed', { defaultValue: 'パスキーの削除に失敗しました' })
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePasskeyOnly = async () => {
    if (passkeys.length === 0) {
      return;
    }

    setIsTogglingMode(true);
    setError(null);

    try {
      const newMode = !passkeyOnlyMode;
      await setPasskeyOnlyMode(newMode);
      setPasskeyOnlyModeState(newMode);

      // localStorageのuserオブジェクトも更新
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.passkeyOnly = newMode ? 1 : 0;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.passkey.setOnlyModeFailed', { defaultValue: 'パスキーのみモードの設定に失敗しました' })
      );
    } finally {
      setIsTogglingMode(false);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    setIsGeneratingCodes(true);
    setError(null);

    try {
      const codes = await generateRecoveryCodes();
      setRecoveryCodes(codes);
      setShowRecoveryCodesDisplay(true);
      await loadPasskeys(); // リカバリーコード数を更新
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.passkey.generateCodesFailed')
      );
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    if (!confirm(t('auth.passkey.regenerateCodesConfirm'))) {
      return;
    }

    setIsGeneratingCodes(true);
    setError(null);

    try {
      const codes = await regenerateRecoveryCodes();
      setRecoveryCodes(codes);
      setShowRecoveryCodesDisplay(true);
      await loadPasskeys(); // リカバリーコード数を更新
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('auth.passkey.regenerateCodesFailed')
      );
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return t('auth.passkey.neverUsed', { defaultValue: '未使用' });
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
        <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              {t('auth.passkey.managePasskeys', { defaultValue: 'パスキー管理' })}
            </DialogTitle>
            <DialogDescription>
              {supported
                ? t('auth.passkey.manageDesc', { defaultValue: '登録済みのパスキーを管理します。不要なパスキーは削除できます。' })
                : t('auth.passkey.notSupported', { defaultValue: 'お使いのブラウザはパスキーをサポートしていません' })}
            </DialogDescription>
          </DialogHeader>

          {supported && (
            <div className="space-y-4">
              {error && (
                <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* 削除確認UI（インライン表示） */}
              {deleteConfirm !== null && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-red-800 dark:text-red-200">
                        {t('auth.passkey.deleteConfirmTitle', { defaultValue: 'パスキーを削除しますか？' })}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {t('auth.passkey.deleteConfirmDesc', { defaultValue: 'このパスキーを削除すると、このデバイスではパスキーでログインできなくなります。' })}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={isDeleting}
                        >
                          {t('common.cancel', { defaultValue: 'キャンセル' })}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(deleteConfirm)}
                          disabled={isDeleting}
                        >
                          {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('common.delete', { defaultValue: '削除' })}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : passkeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Fingerprint className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('auth.passkey.noPasskeys', { defaultValue: 'パスキーが登録されていません' })}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        deleteConfirm === passkey.id ? 'border-red-300 bg-red-50' : 'bg-card'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {passkey.deviceName || t('auth.passkey.unnamedDevice', { defaultValue: '名前なし' })}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1 mt-1">
                          <div>
                            {t('auth.passkey.createdAt', { defaultValue: '登録日時' })}:{' '}
                            {formatDate(passkey.createdAt)}
                          </div>
                          <div>
                            {t('auth.passkey.lastUsedAt', { defaultValue: '最終使用日時' })}:{' '}
                            {formatDate(passkey.lastUsedAt)}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(passkey.id)}
                        disabled={isDeleting || deleteConfirm !== null}
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
                {t('auth.passkey.registerNewPasskey', { defaultValue: '新しいパスキーを登録' })}
              </Button>

              {/* パスキーのみモード設定 */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      {t('auth.passkey.passkeyOnlyMode', { defaultValue: 'パスキーのみでログイン' })}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {t('auth.passkey.passkeyOnlyModeDesc', { defaultValue: 'パスワードログインを無効化し、パスキーのみでログインします。セキュリティが大幅に向上します。' })}
                    </p>
                    <div className="mt-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={passkeyOnlyMode}
                          onChange={handleTogglePasskeyOnly}
                          disabled={passkeys.length === 0 || isTogglingMode}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-sm font-medium">
                          {t('auth.passkey.enablePasskeyOnlyMode', { defaultValue: 'パスキーのみモードを有効化' })}
                        </span>
                      </label>
                      {passkeys.length === 0 && (
                        <p className="text-xs text-red-600 mt-2">
                          {t('auth.passkey.passkeyOnlyModeRequirement', { defaultValue: '※パスキーを最低1つ登録してから有効化してください' })}
                        </p>
                      )}
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        {t('auth.passkey.recoveryNote', { defaultValue: '※パスキーを失った場合は、リカバリーコードまたはメールで復旧できます' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* リカバリーコード管理 */}
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <KeyRound className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900 dark:text-green-100">
                      {t('auth.passkey.recoveryCodeTitle')}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {t('auth.passkey.recoveryCodeDesc')}
                    </p>

                    {recoveryCodesCount > 0 ? (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          {t('auth.passkey.remainingCodes', { count: recoveryCodesCount, total: 10 })}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerateRecoveryCodes}
                          disabled={isGeneratingCodes}
                          className="mt-2"
                        >
                          {isGeneratingCodes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('auth.passkey.regenerateCodes')}
                        </Button>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          {t('auth.passkey.regenerateCodesNote')}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="text-sm text-orange-600 font-medium">
                          {t('auth.passkey.noRecoveryCodes')}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateRecoveryCodes}
                          disabled={isGeneratingCodes || passkeys.length === 0}
                          className="mt-2"
                        >
                          {isGeneratingCodes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t('auth.passkey.generateCodes')}
                        </Button>
                        {passkeys.length === 0 && (
                          <p className="text-xs text-red-600 mt-2">
                            {t('auth.passkey.generateCodesRequirement')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!supported && (
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>
                {t('common.close', { defaultValue: '閉じる' })}
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

      <RecoveryCodesDisplay
        open={showRecoveryCodesDisplay}
        onOpenChange={setShowRecoveryCodesDisplay}
        codes={recoveryCodes}
      />
    </>
  );
}
