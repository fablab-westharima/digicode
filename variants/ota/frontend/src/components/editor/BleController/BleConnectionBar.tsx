/**
 * BLE connection bar (47.md commit #4, Phase 1)
 *
 * Shows the current connection state and offers Connect / Disconnect /
 * Rescan actions. Used inside BleControllerLayout (full mode) and inside
 * BleControllerPanel as the compact preview (commit #5 reuses with
 * `compact` prop).
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BleControllerSchema } from './types';
import { WebBluetoothClient } from './webBluetoothClient';

export interface BleConnectionBarProps {
  client: WebBluetoothClient;
  schema: BleControllerSchema;
  isConnected: boolean;
  /** Compact mode renders smaller controls without descriptive text. */
  compact?: boolean;
}

export function BleConnectionBar({ client, schema, isConnected, compact = false }: BleConnectionBarProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = WebBluetoothClient.isSupported();

  const handleConnect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await client.connect({
        customServiceUuids: schema.device.serviceUuid ? [schema.device.serviceUuid] : [],
      });
    } catch (err) {
      // User-cancelled chooser appears as NotFoundError; suppress as silent.
      if (err instanceof Error && err.name === 'NotFoundError') {
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }, [client, schema.device.serviceUuid]);

  const handleDisconnect = useCallback(async () => {
    setBusy(true);
    try {
      await client.disconnect();
    } finally {
      setBusy(false);
    }
  }, [client]);

  const deviceName = client.getDeviceName();

  return (
    <div
      className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'flex-wrap'} border-b pb-2`}
      data-testid="ble-connection-bar"
    >
      <ConnectionBadge isConnected={isConnected} deviceName={deviceName} t={t} />

      {!isConnected ? (
        <Button
          size={compact ? 'sm' : 'default'}
          onClick={() => void handleConnect()}
          disabled={busy || !supported}
        >
          {busy
            ? t('bleController.connecting', { defaultValue: 'Connecting…' })
            : t('bleController.connect', { defaultValue: 'Connect' })}
        </Button>
      ) : (
        <>
          <Button
            size={compact ? 'sm' : 'default'}
            variant="outline"
            onClick={() => void handleConnect()}
            disabled={busy}
            title={t('bleController.scanAgain', { defaultValue: 'Scan again' })}
          >
            ↻
          </Button>
          <Button
            size={compact ? 'sm' : 'default'}
            variant="destructive"
            onClick={() => void handleDisconnect()}
            disabled={busy}
          >
            {t('bleController.disconnect', { defaultValue: 'Disconnect' })}
          </Button>
        </>
      )}

      {!compact && (
        <span className="text-xs text-muted-foreground ml-auto">
          {schema.widgets.length > 0
            ? t('bleController.widgetSummary', {
                defaultValue: '{{count}} widgets',
                count: schema.widgets.length,
              })
            : t('bleController.noBlocks', {
                defaultValue: 'Add BLE blocks to your workspace',
              })}
        </span>
      )}

      {!supported && (
        <div className="basis-full text-xs text-destructive">
          {t('bleController.noWebBluetooth', {
            defaultValue:
              'Your browser does not support Web Bluetooth. Use Chrome / Edge / Opera on desktop or Android.',
          })}
        </div>
      )}
      {error && (
        <div className="basis-full text-xs text-destructive">{error}</div>
      )}
    </div>
  );
}

function ConnectionBadge({
  isConnected,
  deviceName,
  t,
}: {
  isConnected: boolean;
  deviceName: string | null;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (isConnected && deviceName) {
    return (
      <Badge variant="default" className="bg-emerald-600 text-white hover:bg-emerald-600">
        🔵 {deviceName}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      {t('bleController.notConnected', { defaultValue: 'Not connected' })}
    </Badge>
  );
}
