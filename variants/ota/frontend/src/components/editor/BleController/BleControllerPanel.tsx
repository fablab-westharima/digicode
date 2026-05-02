/**
 * BleControllerPanel — bottom-panel compact preview (47.md commit #5, Phase 1)
 *
 * Per 47.md §4.2: the bottom panel is "presence + entry point only".
 * Widget operations happen inside the fullscreen Dialog. Here we render:
 *  - Compact connection bar (Connect / Disconnect / Rescan)
 *  - Summary text ("1 chat + 3 GATT widgets")
 *  - "Open fullscreen" button → opens BleControllerDialog
 *  - Schema warnings count (clickable opens Dialog where they are listed)
 *
 * Schema is inferred from the live workspace XML on every change. Inference
 * is cheap (~5ms) so no debouncing is needed; the upstream Blockly
 * onWorkspaceChange already throttles the XML update cadence.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import { BleConnectionBar } from './BleConnectionBar';
import { BleControllerDialog } from './BleControllerDialog';
import { inferUiSchema } from './inferUiSchema';
import { WebBluetoothClient } from './webBluetoothClient';

export interface BleControllerPanelProps {
  /** Current Blockly workspace XML; the panel re-infers the schema when this changes. */
  workspaceXml: string;
  className?: string;
}

export function BleControllerPanel({ workspaceXml, className }: BleControllerPanelProps) {
  const { t } = useTranslation();
  // One client instance for the lifetime of the panel mount; Dialog reuses it
  // so opening/closing does not drop the active connection. Lazy useState init
  // (rather than useRef) keeps the value out of render-time ref access.
  const [client] = useState<WebBluetoothClient>(() => new WebBluetoothClient());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const offConnect = client.on('connected', () => setIsConnected(true));
    const offDisconnect = client.on('disconnected', () => setIsConnected(false));
    return () => {
      offConnect();
      offDisconnect();
    };
  }, [client]);

  const schema = useMemo(() => inferUiSchema(workspaceXml), [workspaceXml]);
  const summary = summarizeWidgets(schema.widgets);

  return (
    <div className={`flex flex-col gap-2 p-2 bg-background ${className ?? ''}`}>
      <BleConnectionBar client={client} schema={schema} isConnected={isConnected} compact />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{summary || t('bleController.noBlocks', { defaultValue: 'ワークスペースに BLE ブロックを追加してください' })}</span>
        {schema.warnings.length > 0 && (
          <span
            className="text-xs text-amber-600 dark:text-amber-400 cursor-pointer"
            onClick={() => setDialogOpen(true)}
            title={schema.warnings.join('\n')}
          >
            ⚠ {t('bleController.warningCount', {
              defaultValue: '{{count}} 件の注意',
              count: schema.warnings.length,
            })}
          </span>
        )}
        <Button
          size="sm"
          variant="default"
          onClick={() => setDialogOpen(true)}
          disabled={schema.widgets.length === 0}
          className="ml-auto"
        >
          <Maximize2 className="w-3.5 h-3.5 mr-1" />
          {t('bleController.openFullscreen', { defaultValue: '全画面で開く' })}
        </Button>
      </div>
      <BleControllerDialog open={dialogOpen} onOpenChange={setDialogOpen} schema={schema} client={client} />
    </div>
  );
}

function summarizeWidgets(widgets: ReturnType<typeof inferUiSchema>['widgets']): string {
  if (widgets.length === 0) return '';
  const counts = { nus: 0, toggle: 0, slider: 0, display: 0 };
  for (const w of widgets) {
    if (w.type === 'nus-uart') counts.nus++;
    else if (w.type === 'gatt-toggle') counts.toggle++;
    else if (w.type === 'gatt-slider') counts.slider++;
    else if (w.type === 'gatt-display') counts.display++;
  }
  const parts: string[] = [];
  if (counts.nus) parts.push(`${counts.nus} chat`);
  const gattCount = counts.toggle + counts.slider + counts.display;
  if (gattCount) {
    const detail: string[] = [];
    if (counts.toggle) detail.push(`${counts.toggle} toggle`);
    if (counts.slider) detail.push(`${counts.slider} slider`);
    if (counts.display) detail.push(`${counts.display} display`);
    parts.push(`${gattCount} GATT (${detail.join(' / ')})`);
  }
  return parts.join(' + ');
}
