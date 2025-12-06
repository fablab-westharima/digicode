import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWifiStore } from '@/stores/wifiStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { uuidToMdns } from '@/lib/uuid';

export function WifiConnection() {
  const { t } = useTranslation();
  const {
    status,
    connect,
    disconnect,
    setHost,
    setDeviceName,
    deviceName,
  } = useWifiStore();

  const { devices } = useDeviceStore();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  // 登録済みデバイスから選択
  const handleSelectDevice = (deviceUuid: string) => {
    setSelectedDeviceId(deviceUuid);
    const device = devices.find(d => d.uuid === deviceUuid);
    if (device) {
      // mDNSホスト名を設定
      setHost(uuidToMdns(device.uuid));
      setDeviceName(device.name);
    }
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  // 選択中のデバイス名を取得
  const getSelectedDeviceName = () => {
    return deviceName || '';
  };

  return (
    <div className="space-y-4">
      {/* 書込み先デバイス選択 */}
      <div className="space-y-2">
        <Label>{t('device.writeTargetDevice')}</Label>
        <Select
          value={selectedDeviceId}
          onValueChange={handleSelectDevice}
          disabled={isConnected}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('device.selectDevicePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {devices.length > 0 ? (
              devices.map((device) => (
                <SelectItem key={device.uuid} value={device.uuid}>
                  {device.name}
                </SelectItem>
              ))
            ) : (
              <div className="py-2 px-2 text-sm text-gray-500">
                {t('device.noDevicesRegistered')}
              </div>
            )}
          </SelectContent>
        </Select>
        {devices.length === 0 && (
          <p className="text-xs text-amber-600">
            {t('device.deviceNotRegistered')}
          </p>
        )}
      </div>

      {/* 接続/切断ボタン */}
      <div className="flex gap-2">
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isConnecting || !selectedDeviceId}
            className="w-full"
          >
            {isConnecting ? t('device.connecting') : t('device.setAsWriteTarget')}
          </Button>
        ) : (
          <Button
            onClick={handleDisconnect}
            variant="destructive"
            className="w-full"
          >
            {t('device.disconnect')}
          </Button>
        )}
      </div>

      {/* ステータス表示 */}
      <div className={`text-sm font-medium flex items-center gap-2 ${
        status === 'connected' ? 'text-green-600' :
        status === 'connecting' ? 'text-yellow-600' :
        status === 'error' ? 'text-red-600' :
        'text-gray-500'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-green-500' :
          status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
          status === 'error' ? 'bg-red-500' :
          'bg-gray-300'
        }`} />
        {status === 'connected' ? t('device.connectedTo', { name: getSelectedDeviceName() }) :
         status === 'connecting' ? t('device.connecting') :
         status === 'error' ? t('device.connectionError') :
         t('device.disconnected')}
      </div>
    </div>
  );
}
