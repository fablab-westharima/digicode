import { useState } from 'react';
import { Wifi, ChevronDown, Usb, Bluetooth, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeviceStore } from '@/stores/deviceStore';
import { useWifiStore } from '@/stores/wifiStore';
import { useSerialStore } from '@/stores/serialStore';
import { useBluetoothStore } from '@/stores/bluetoothStore';
import { uuidToMdns } from '@/lib/uuid';
import { useTranslation } from 'react-i18next';

type ConnectionType = 'usb' | 'wifi' | 'bluetooth';

interface SelectedDevice {
  type: ConnectionType;
  name: string;
  id: string;  // USB/Bluetoothの場合は'usb'/'bluetooth'、WiFiの場合はuuid
}

export function HeaderDeviceSelector() {
  const { t } = useTranslation();
  const { devices: wifiDevices, clearDevices } = useDeviceStore();
  const {
    status: wifiStatus,
    deviceName: wifiDeviceName,
    host: wifiHost,
    setHost,
    setDeviceName,
    connect: connectWifi,
    disconnect: disconnectWifi
  } = useWifiStore();
  const { status: serialStatus } = useSerialStore();
  const { status: bluetoothStatus } = useBluetoothStore();

  // ユーザーが明示的に選択した接続タイプ
  const [selectedConnectionType, setSelectedConnectionType] = useState<ConnectionType | null>(null);

  // 現在選択中のデバイスを判定
  const getSelectedDevice = (): SelectedDevice | null => {
    // ユーザーが明示的に選択した接続タイプがあれば、それを優先
    if (selectedConnectionType === 'wifi' && wifiStatus === 'connected' && wifiDeviceName) {
      return { type: 'wifi', name: wifiDeviceName, id: wifiHost };
    }
    if (selectedConnectionType === 'usb' && serialStatus === 'connected') {
      return { type: 'usb', name: t('editor.deviceSelector.usbConnection'), id: 'usb' };
    }
    if (selectedConnectionType === 'bluetooth' && bluetoothStatus === 'connected') {
      return { type: 'bluetooth', name: t('editor.deviceSelector.bluetoothConnection'), id: 'bluetooth' };
    }

    // 明示的な選択がない場合は、自動判定
    // WiFi接続を優先（USB接続は電源供給のみの可能性があるため）
    if (wifiStatus === 'connected' && wifiDeviceName) {
      return { type: 'wifi', name: wifiDeviceName, id: wifiHost };
    }
    if (serialStatus === 'connected') {
      return { type: 'usb', name: t('editor.deviceSelector.usbConnection'), id: 'usb' };
    }
    if (bluetoothStatus === 'connected') {
      return { type: 'bluetooth', name: t('editor.deviceSelector.bluetoothConnection'), id: 'bluetooth' };
    }
    return null;
  };

  const selectedDevice = getSelectedDevice();

  // デバイスのホスト名を取得（IPアドレスがあれば優先）
  const getDeviceHost = (device: { uuid: string; ipAddress?: string }) => {
    if (device.ipAddress) {
      return device.ipAddress;
    }
    return uuidToMdns(device.uuid);
  };

  // WiFiデバイス選択
  const handleSelectWifiDevice = async (device: { uuid: string; name: string; ipAddress?: string }) => {
    setHost(getDeviceHost(device));
    setDeviceName(device.name);
    await connectWifi();
    setSelectedConnectionType('wifi'); // ユーザーが明示的にWiFiを選択
  };

  // 選択解除
  const handleDeselect = async () => {
    if (wifiStatus === 'connected') {
      await disconnectWifi();
    }
    setSelectedConnectionType(null); // 明示的な選択をクリア
  };

  // デバイスリストをリフレッシュ
  const handleRefreshDevices = () => {
    if (!confirm(t('device.confirmClearDevices', { defaultValue: 'デバイスリストをクリアして再読み込みしますか？' }))) {
      return;
    }
    clearDevices();
  };

  // 接続アイコンを取得
  const getIcon = (type: ConnectionType) => {
    switch (type) {
      case 'usb':
        return <Usb className="w-3 h-3" />;
      case 'wifi':
        return <Wifi className="w-3 h-3" />;
      case 'bluetooth':
        return <Bluetooth className="w-3 h-3" />;
    }
  };

  // 利用可能なデバイスがあるか
  const hasAvailableDevices =
    serialStatus === 'connected' ||
    bluetoothStatus === 'connected' ||
    wifiDevices.length > 0;

  // デバイスがない場合
  if (!hasAvailableDevices) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-xs px-2 text-gray-400"
        disabled
      >
        <Wifi className="w-3 h-3 mr-1" />
        {t('editor.deviceSelector.noDevice')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs px-2 ${selectedDevice ? 'text-green-600' : ''}`}
        >
          <div className={`w-2 h-2 rounded-full mr-1 ${
            selectedDevice ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          {selectedDevice ? (
            <>
              {getIcon(selectedDevice.type)}
              <span className="ml-1">{selectedDevice.name}</span>
            </>
          ) : (
            t('editor.deviceSelector.writeTarget')
          )}
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.deviceSelector.writeTargetDevice')}</div>

        {/* USB接続中の場合 */}
        {serialStatus === 'connected' && (
          <DropdownMenuItem
            onClick={() => setSelectedConnectionType('usb')}
            className={selectedDevice?.type === 'usb' ? 'bg-green-50' : ''}
          >
            <Usb className="w-4 h-4 mr-2 text-blue-500" />
            {t('editor.deviceSelector.usbConnection')}
            <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
          </DropdownMenuItem>
        )}

        {/* Bluetooth接続中の場合 */}
        {bluetoothStatus === 'connected' && (
          <DropdownMenuItem
            onClick={() => setSelectedConnectionType('bluetooth')}
            className={selectedDevice?.type === 'bluetooth' ? 'bg-green-50' : ''}
          >
            <Bluetooth className="w-4 h-4 mr-2 text-purple-500" />
            {t('editor.deviceSelector.bluetoothConnection')}
            <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
          </DropdownMenuItem>
        )}

        {/* WiFiデバイス */}
        {wifiDevices.length > 0 && (
          <>
            {(serialStatus === 'connected' || bluetoothStatus === 'connected') && (
              <DropdownMenuSeparator />
            )}
            <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.deviceSelector.wifiRegisteredDevices')}</div>
            {wifiDevices.map((device) => {
              const isSelected = wifiStatus === 'connected' && wifiHost === getDeviceHost(device);
              return (
                <DropdownMenuItem
                  key={device.uuid}
                  onClick={() => handleSelectWifiDevice(device)}
                  className={isSelected ? 'bg-green-50' : ''}
                >
                  <Wifi className="w-4 h-4 mr-2 text-green-500" />
                  {device.name}
                  {isSelected && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </>
        )}

        {/* 選択解除（WiFi選択中のみ） */}
        {selectedDevice?.type === 'wifi' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeselect} className="text-red-600">
              {t('editor.deviceSelector.deselect')}
            </DropdownMenuItem>
          </>
        )}

        {/* デバイスリストをリフレッシュ */}
        {wifiDevices.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleRefreshDevices} className="text-blue-600">
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              {t('device.refreshDevices', { defaultValue: '再読み込み' })}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
