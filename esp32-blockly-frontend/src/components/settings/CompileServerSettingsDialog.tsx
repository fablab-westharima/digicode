/**
 * コンパイルサーバー設定ダイアログ
 * モーダル形式で表示
 */
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CompileServerSettings } from './CompileServerSettings';

interface CompileServerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompileServerSettingsDialog({
  open,
  onOpenChange,
}: CompileServerSettingsDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('settings.compileServer', { defaultValue: 'コンパイルサーバー設定' })}
          </DialogTitle>
          <DialogDescription>
            {t('settings.compileServerDesc', { defaultValue: 'コンパイルに使用するサーバーを選択してください' })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CompileServerSettings />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CompileServerSettingsDialog;
