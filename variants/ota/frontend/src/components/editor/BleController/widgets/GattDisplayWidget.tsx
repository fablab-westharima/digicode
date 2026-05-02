/**
 * GATT display widget (47.md commit #3, Phase 1)
 *
 * For read-only / notify characteristics. Subscribes to notify when
 * available; falls back to polling readValue every POLL_INTERVAL_MS for
 * read-only characteristics.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GattDisplayWidget as GattDisplayWidgetDef } from '../types';
import type { WebBluetoothClient } from '../webBluetoothClient';

export interface GattDisplayWidgetProps {
  definition: GattDisplayWidgetDef;
  client: WebBluetoothClient;
  isConnected: boolean;
  serviceUuid: string;
}

const POLL_INTERVAL_MS = 1000;

export function GattDisplayWidget({ definition, client, isConnected, serviceUuid }: GattDisplayWidgetProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  // Drive the "last update Ns ago" counter by ticking `now` every second.
  // Pure-render rule: Date.now() must not be called inline during render.
  useEffect(() => {
    if (lastUpdate === null) return;
    const handle = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(handle);
  }, [lastUpdate]);

  useEffect(() => {
    if (!isConnected) return;

    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const onValue = (bytes: Uint8Array): void => {
      if (cancelled) return;
      setValue(client.decodeAscii(bytes));
      setLastUpdate(Date.now());
      setError(null);
    };

    if (definition.notifyEnabled) {
      let unsubscribe: (() => void) | null = null;
      client
        .subscribeNotify(serviceUuid, definition.characteristicUuid, onValue)
        .then((unsub) => {
          if (cancelled) {
            unsub();
          } else {
            unsubscribe = unsub;
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        });
      cleanup = () => {
        cancelled = true;
        unsubscribe?.();
      };
    } else {
      // Polling path for read-only characteristics
      const tick = async () => {
        if (cancelled || !client.isConnected()) return;
        try {
          const bytes = await client.readCharacteristic(serviceUuid, definition.characteristicUuid);
          onValue(bytes);
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        }
      };
      void tick();
      const handle = setInterval(() => void tick(), POLL_INTERVAL_MS);
      cleanup = () => {
        cancelled = true;
        clearInterval(handle);
      };
    }
    return cleanup ?? undefined;
  }, [
    isConnected,
    client,
    serviceUuid,
    definition.characteristicUuid,
    definition.notifyEnabled,
  ]);

  const formattedValue = formatValue(value, definition.dataType);
  const ageSec = lastUpdate ? Math.floor((now - lastUpdate) / 1000) : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>{definition.label}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {definition.dataType}{definition.notifyEnabled ? ' · notify' : ' · poll'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="text-2xl font-medium tabular-nums text-foreground text-center py-2">
          {value === null ? (
            <span className="text-sm text-muted-foreground">
              {isConnected
                ? t('bleController.noData', { defaultValue: 'データ未受信' })
                : t('bleController.notConnected', { defaultValue: '未接続' })}
            </span>
          ) : (
            formattedValue
          )}
        </div>
        {ageSec !== null && (
          <div className="text-xs text-muted-foreground text-center">
            {t('bleController.lastUpdate', { defaultValue: '最終更新' })}: {ageSec}s
          </div>
        )}
        {error && <div className="text-xs text-destructive text-center">{error}</div>}
      </CardContent>
    </Card>
  );
}

function formatValue(raw: string | null, dataType: GattDisplayWidgetDef['dataType']): string {
  if (raw === null) return '';
  if (dataType === 'string') return raw;
  // numeric types: try to parse, fall back to raw on failure
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (dataType === 'float') return n.toFixed(2);
  return String(Math.trunc(n));
}
