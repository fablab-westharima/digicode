import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SerialConnection } from '@/components/serial/SerialConnection';
import { WifiConnection } from './WifiConnection';
import { BluetoothConnection } from './BluetoothConnection';

export type ConnectionType = 'serial' | 'wifi' | 'bluetooth';

export function ConnectionSelector() {
  const [activeTab, setActiveTab] = useState<ConnectionType>('serial');

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConnectionType)}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="serial" className="text-xs px-2">
          USB
        </TabsTrigger>
        <TabsTrigger value="wifi" className="text-xs px-2">
          ワイヤレス
        </TabsTrigger>
        <TabsTrigger value="bluetooth" className="text-xs px-2">
          Bluetooth
        </TabsTrigger>
      </TabsList>

      <TabsContent value="serial" className="mt-4">
        <SerialConnection />
      </TabsContent>

      <TabsContent value="wifi" className="mt-4">
        <WifiConnection />
      </TabsContent>

      <TabsContent value="bluetooth" className="mt-4">
        <BluetoothConnection />
      </TabsContent>
    </Tabs>
  );
}
