import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Shield } from 'lucide-react';
import { TwoFactorSettingsCard } from './TwoFactorSettingsCard';

interface TwoFactorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TwoFactorSettingsDialog({
  open,
  onOpenChange,
}: TwoFactorSettingsDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('auth.2fa.dialogTitle', '2段階認証設定')}
          </DialogTitle>
          <DialogDescription>
            {t('auth.2fa.dialogDescription', 'パスワードログイン時のセキュリティを強化します。')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <TwoFactorSettingsCard />
        </div>
      </DialogContent>
    </Dialog>
  );
}
