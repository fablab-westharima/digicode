import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIAssistantPanel } from './AIAssistantPanel';

interface AIAssistantDialogProps {
  open: boolean;
  onClose: () => void;
  onAppendBlocks?: (xml: string) => void;
  workspaceXml?: string;
  onClearWorkspace?: () => void;
  isAvailable?: boolean;
  isHelpBotAvailable?: boolean;
  isUpgradeCandidate?: boolean;
  onUpgradePlan?: () => void;
}

export function AIAssistantDialog({
  open,
  onClose,
  onAppendBlocks,
  workspaceXml,
  onClearWorkspace,
  isAvailable,
  isHelpBotAvailable,
  isUpgradeCandidate,
  onUpgradePlan,
}: AIAssistantDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-sm">{t('ai.label')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden border-t border-border">
          <AIAssistantPanel
            onAppendBlocks={onAppendBlocks}
            workspaceXml={workspaceXml}
            onClearWorkspace={onClearWorkspace}
            shouldShowFull={true}
            isAvailable={isAvailable}
            isHelpBotAvailable={isHelpBotAvailable}
            isUpgradeCandidate={isUpgradeCandidate}
            onUpgradePlan={onUpgradePlan}
            showExpandButton={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
