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
import { describeBleError, isIosBrowser } from './errorMessages';

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
      const friendly = describeBleError(err, t);
      // null = user cancelled chooser → silent; otherwise show the localized message.
      setError(friendly?.message ?? null);
    } finally {
      setBusy(false);
    }
  }, [client, schema.device.serviceUuid, t]);

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
            ? t('bleController.connecting', { defaultValue: '接続中…' })
            : t('bleController.connect', { defaultValue: '接続' })}
        </Button>
      ) : (
        <>
          <Button
            size={compact ? 'sm' : 'default'}
            variant="outline"
            onClick={() => void handleConnect()}
            disabled={busy}
            title={t('bleController.scanAgain', { defaultValue: '再スキャン' })}
          >
            ↻
          </Button>
          <Button
            size={compact ? 'sm' : 'default'}
            variant="destructive"
            onClick={() => void handleDisconnect()}
            disabled={busy}
          >
            {t('bleController.disconnect', { defaultValue: '切断' })}
          </Button>
        </>
      )}

      {!compact && (
        <span className="text-xs text-muted-foreground ml-auto">
          {schema.widgets.length > 0
            ? t('bleController.widgetSummary', {
                defaultValue: 'ウィジェット {{count}} 個',
                count: schema.widgets.length,
              })
            : t('bleController.noBlocks', {
                defaultValue: 'ワークスペースに BLE ブロックを追加してください',
              })}
        </span>
      )}

      {!supported && (
        <div className="basis-full text-xs text-destructive">
          {isIosBrowser()
            ? t('bleController.iosNotSupported', {
                defaultValue:
                  'iOS は Web Bluetooth に非対応です。Android Chrome / Edge、または Bluefy 等のサードパーティアプリをご利用ください。',
              })
            : t('bleController.noWebBluetooth', {
                defaultValue:
                  'お使いのブラウザは Web Bluetooth に非対応です。Chrome / Edge / Opera (デスクトップまたは Android) をご利用ください。',
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
      {t('bleController.notConnected', { defaultValue: '未接続' })}
    </Badge>
  );
}
