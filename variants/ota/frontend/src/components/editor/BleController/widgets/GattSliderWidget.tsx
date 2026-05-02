/**
 * GATT slider widget (47.md commit #3, Phase 1)
 *
 * For numeric characteristics (uint8/16, int8/16, float) with WRITE enabled.
 * Sends the slider value as ASCII number on every change, throttled with a
 * trailing-edge timer so dragging doesn't flood the BLE link.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { GattSliderWidget as GattSliderWidgetDef } from '../types';
import type { WebBluetoothClient } from '../webBluetoothClient';

export interface GattSliderWidgetProps {
  definition: GattSliderWidgetDef;
  client: WebBluetoothClient;
  isConnected: boolean;
  serviceUuid: string;
}

const WRITE_THROTTLE_MS = 50;

export function GattSliderWidget({ definition, client, isConnected, serviceUuid }: GattSliderWidgetProps) {
  const [value, setValue] = useState<number>(definition.min);
  const [error, setError] = useState<string | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValue = useRef<number | null>(null);
  const isFloat = definition.dataType === 'float';
  const step = isFloat ? (definition.max - definition.min) / 100 : 1;

  const flushWrite = useCallback(async () => {
    if (pendingValue.current === null) return;
    const numeric = pendingValue.current;
    pendingValue.current = null;
    try {
      await client.writeCharacteristic(
        serviceUuid,
        definition.characteristicUuid,
        client.encodeAscii(numeric)
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [client, definition.characteristicUuid, serviceUuid]);

  const handleChange = useCallback(
    (next: number[]) => {
      const v = next[0];
      setValue(v);
      if (!isConnected) return;
      pendingValue.current = v;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        void flushWrite();
      }, WRITE_THROTTLE_MS);
    },
    [isConnected, flushWrite]
  );

  // Flush any pending write on unmount or disconnect to avoid losing the
  // user's final position.
  useEffect(() => {
    return () => {
      if (writeTimer.current) {
        clearTimeout(writeTimer.current);
        if (isConnected) void flushWrite();
      }
    };
  }, [flushWrite, isConnected]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span>{definition.label}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {definition.dataType}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Slider
          min={definition.min}
          max={definition.max}
          step={step}
          value={[value]}
          onValueChange={handleChange}
          disabled={!isConnected}
          aria-label={definition.label}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
          <span>{definition.min}</span>
          <span className="text-foreground font-medium">
            {isFloat ? value.toFixed(2) : Math.round(value)}
          </span>
          <span>{definition.max}</span>
        </div>
        {error && <div className="text-xs text-destructive">{error}</div>}
      </CardContent>
    </Card>
  );
}
