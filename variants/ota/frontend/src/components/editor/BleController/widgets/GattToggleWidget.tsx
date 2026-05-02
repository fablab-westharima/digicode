/**
 * GATT toggle widget (47.md commit #3, Phase 1)
 *
 * For boolean characteristics with WRITE enabled. Sends "1" / "0" as ASCII
 * on toggle. Optimistic UI: state flips immediately, reverts on write
 * failure.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { GattToggleWidget as GattToggleWidgetDef } from '../types';
import type { WebBluetoothClient } from '../webBluetoothClient';
import { describeBleError } from '../errorMessages';

export interface GattToggleWidgetProps {
  definition: GattToggleWidgetDef;
  client: WebBluetoothClient;
  isConnected: boolean;
  serviceUuid: string;
}

export function GattToggleWidget({ definition, client, isConnected, serviceUuid }: GattToggleWidgetProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleChange = useCallback(
    async (next: boolean) => {
      if (!isConnected) return;
      const previous = value;
      setValue(next);
      setPending(true);
      try {
        await client.writeCharacteristic(serviceUuid, definition.characteristicUuid, client.encodeAscii(next));
        setError(null);
      } catch (err) {
        setValue(previous);
        const friendly = describeBleError(err, t);
        setError(friendly?.message ?? null);
      } finally {
        setPending(false);
      }
    },
    [client, definition.characteristicUuid, serviceUuid, isConnected, value, t]
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>{definition.label}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            bool
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <Switch
          checked={value}
          onCheckedChange={(checked) => void handleChange(checked)}
          disabled={!isConnected || pending}
          aria-label={definition.label}
        />
        <div className="text-xs text-muted-foreground tabular-nums">
          {value
            ? t('bleController.toggleOn', { defaultValue: 'ON' })
            : t('bleController.toggleOff', { defaultValue: 'OFF' })}
          {/* ON/OFF intentionally untranslated — Latin abbreviations are the universal UX convention. */}
        </div>
        {error && <div className="text-xs text-destructive">{error}</div>}
      </CardContent>
    </Card>
  );
}
