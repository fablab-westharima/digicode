/**
 * USBポート解放ダイアログ
 *
 * Windowsでポートが解放されず接続できない場合に使用
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { firmwareService } from '@/services/firmwareService';

interface UsbPortReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsbPortReleaseDialog({ open, onOpenChange }: UsbPortReleaseDialogProps) {
  const { t } = useTranslation();
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseSuccess, setReleaseSuccess] = useState(false);

  const handleReleaseAllPorts = async () => {
    try {
      setIsReleasing(true);
      await firmwareService.releaseAllPorts();
      setReleaseSuccess(true);

      // 3秒後に自動的にリロード
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      alert(`✗ ポート解放エラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
      setIsReleasing(false);
    }
  };

  const handleClose = () => {
    if (!isReleasing) {
      setReleaseSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            {t('usbPortRelease.title', { defaultValue: 'USBポート解放' })}
          </DialogTitle>
          <DialogDescription>
            {t('usbPortRelease.description', { defaultValue: 'すべてのUSBポートを強制的に解放します' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 説明 */}
          <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm">
              {t('usbPortRelease.warning', {
                defaultValue: 'Windowsでポートが解放されず接続できない場合に使用してください。実行後、ページが再読み込みされます。'
              })}
            </AlertDescription>
          </Alert>

          {/* 成功メッセージ */}
          {releaseSuccess && (
            <Alert variant="default" className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-700 dark:text-green-300">
                {t('usbPortRelease.success', {
                  defaultValue: '✓ すべてのポートを解放しました。ページを再読み込みします...'
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* 実行ボタン */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isReleasing}
              className="flex-1"
            >
              {t('common.cancel', { defaultValue: 'キャンセル' })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReleaseAllPorts}
              disabled={isReleasing}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isReleasing
                ? t('usbPortRelease.releasing', { defaultValue: '解放中...' })
                : t('usbPortRelease.releaseAll', { defaultValue: 'すべて解放' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
