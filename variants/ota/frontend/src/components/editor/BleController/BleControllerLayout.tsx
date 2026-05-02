/**
 * BleControllerLayout — reusable core (47.md commit #4, Phase 1)
 *
 * Renders a controller schema with the connection bar + widget grid. This
 * is the component reused across all 3 distribution forms:
 *  - Phase 1: wrapped by BleControllerDialog (commit #5)
 *  - Phase 2: wrapped by /control/<projectId> page
 *  - Phase 3: bundled into a single-file HTML download
 *
 * Layout (per 47.md §4.3):
 *  - NUS UART chat on the left (~40%, only when present in schema)
 *  - GATT widget grid on the right (~60%, auto-fill grid)
 *  - Stack vertically below 768px width
 *  - Empty state when widgets[] is empty
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BleControllerSchema, WidgetDefinition } from './types';
import { WebBluetoothClient } from './webBluetoothClient';
import { BleConnectionBar } from './BleConnectionBar';
import { NusChatWidget } from './widgets/NusChatWidget';
import { GattToggleWidget } from './widgets/GattToggleWidget';
import { GattSliderWidget } from './widgets/GattSliderWidget';
import { GattDisplayWidget } from './widgets/GattDisplayWidget';

export interface BleControllerLayoutProps {
  schema: BleControllerSchema;
  /** Optional injected client (Phase 2/3 may pre-create it; Phase 1 creates internally). */
  client?: WebBluetoothClient;
  /** Outer wrapper class for parent-controlled sizing. */
  className?: string;
  /** Notify parent on connection state changes (e.g., editor StatusBar sync). */
  onConnectionChange?: (isConnected: boolean) => void;
}

export function BleControllerLayout({
  schema,
  client: injectedClient,
  className,
  onConnectionChange,
}: BleControllerLayoutProps) {
  const { t } = useTranslation();
  const internalClientRef = useRef<WebBluetoothClient | null>(null);
  if (!internalClientRef.current && !injectedClient) {
    internalClientRef.current = new WebBluetoothClient();
  }
  const client = injectedClient ?? internalClientRef.current!;
  const [isConnected, setIsConnected] = useState<boolean>(client.isConnected());

  useEffect(() => {
    const offConnect = client.on('connected', () => {
      setIsConnected(true);
      onConnectionChange?.(true);
    });
    const offDisconnect = client.on('disconnected', () => {
      setIsConnected(false);
      onConnectionChange?.(false);
    });
    return () => {
      offConnect();
      offDisconnect();
    };
  }, [client, onConnectionChange]);

  // Disconnect on unmount (cleanup)
  useEffect(() => {
    return () => {
      if (client.isConnected()) {
        void client.disconnect();
      }
    };
  }, [client]);

  const { nusWidget, gattWidgets } = useMemo(() => splitWidgets(schema.widgets), [schema.widgets]);
  const hasGatt = gattWidgets.length > 0;
  const hasNus = !!nusWidget;
  const serviceUuid = schema.device.serviceUuid ?? '';

  return (
    <div className={`flex flex-col gap-3 p-3 ${className ?? ''}`} data-testid="ble-controller-layout">
      <BleConnectionBar client={client} schema={schema} isConnected={isConnected} />

      {schema.warnings.length > 0 && (
        <div className="border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
          <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
            {t('bleController.warningsHeader', { defaultValue: 'Notes' })}
          </div>
          <ul className="text-xs text-amber-900 dark:text-amber-300 list-disc list-inside space-y-0.5">
            {schema.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {schema.widgets.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 grid gap-3 md:grid-cols-[2fr_3fr] md:auto-rows-min">
          {hasNus && (
            <div className="md:row-span-1">
              <NusChatWidget
                definition={nusWidget!}
                client={client}
                isConnected={isConnected}
              />
            </div>
          )}
          {hasGatt && (
            <div className={`grid gap-3 grid-cols-1 sm:grid-cols-2 auto-rows-min ${hasNus ? '' : 'md:col-span-2'}`}>
              {gattWidgets.map((widget) => (
                <GattWidgetByType
                  key={widget.id}
                  widget={widget}
                  client={client}
                  isConnected={isConnected}
                  serviceUuid={serviceUuid}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center min-h-[160px] text-sm text-muted-foreground text-center px-4">
      {t('bleController.noBlocks', { defaultValue: 'Add BLE blocks to your workspace to see widgets here.' })}
    </div>
  );
}

function splitWidgets(widgets: WidgetDefinition[]): {
  nusWidget: Extract<WidgetDefinition, { type: 'nus-uart' }> | undefined;
  gattWidgets: Exclude<WidgetDefinition, { type: 'nus-uart' }>[];
} {
  let nusWidget: Extract<WidgetDefinition, { type: 'nus-uart' }> | undefined;
  const gattWidgets: Exclude<WidgetDefinition, { type: 'nus-uart' }>[] = [];
  for (const w of widgets) {
    if (w.type === 'nus-uart') {
      if (!nusWidget) nusWidget = w;
    } else {
      gattWidgets.push(w);
    }
  }
  return { nusWidget, gattWidgets };
}

interface GattWidgetByTypeProps {
  widget: Exclude<WidgetDefinition, { type: 'nus-uart' }>;
  client: WebBluetoothClient;
  isConnected: boolean;
  serviceUuid: string;
}

function GattWidgetByType({ widget, client, isConnected, serviceUuid }: GattWidgetByTypeProps) {
  switch (widget.type) {
    case 'gatt-toggle':
      return <GattToggleWidget definition={widget} client={client} isConnected={isConnected} serviceUuid={serviceUuid} />;
    case 'gatt-slider':
      return <GattSliderWidget definition={widget} client={client} isConnected={isConnected} serviceUuid={serviceUuid} />;
    case 'gatt-display':
      return <GattDisplayWidget definition={widget} client={client} isConnected={isConnected} serviceUuid={serviceUuid} />;
  }
}
