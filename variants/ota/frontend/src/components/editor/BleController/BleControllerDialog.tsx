/**
 * BleControllerDialog (47.md commit #5, Phase 1)
 *
 * Full-screen Dialog wrapper around BleControllerLayout. The Dialog frame
 * is the only thing that differs between this Phase 1 use and the Phase 2
 * shared URL page (which wraps the same BleControllerLayout in a normal
 * Page component instead).
 *
 * The schema is inferred upstream by BleControllerPanel and passed in,
 * so the Dialog itself is a pure render of the layout in a chrome.
 */
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BleControllerLayout } from './BleControllerLayout';
import { WebBluetoothClient } from './webBluetoothClient';
import type { BleControllerSchema } from './types';

export interface BleControllerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: BleControllerSchema;
  /** Shared client so Dialog open/close does not drop the active connection. */
  client: WebBluetoothClient;
}

export function BleControllerDialog({ open, onOpenChange, schema, client }: BleControllerDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b shrink-0">
          <DialogTitle className="text-base font-medium flex items-center gap-2">
            <span>📶</span>
            <span>{t('bleController.dialogTitle', { defaultValue: 'BLE Controller' })}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <BleControllerLayout schema={schema} client={client} className="h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
