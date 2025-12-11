import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useBluetoothStore } from '@/stores/bluetoothStore';

export function BluetoothConnection() {
  const { t } = useTranslation();
  const {
    status,
    isSupported,
    connect,
    disconnect,
  } = useBluetoothStore();

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-red-50 rounded-md text-sm">
        <p className="font-semibold text-red-800">
          ⚠️ {t('bluetooth.notSupported')}
        </p>
        <p className="text-red-700 mt-2">
          {t('bluetooth.notSupportedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-green-50 rounded-md text-sm space-y-2">
        <p className="font-semibold">📱 {t('bluetooth.connectionSteps')}</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>{t('bluetooth.step1')}</li>
          <li>{t('bluetooth.step2')}</li>
          <li>{t('bluetooth.step3')}</li>
          <li>{t('bluetooth.step4')}</li>
        </ol>
      </div>

      <div className="flex gap-2">
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? t('bluetooth.selectingDevice') : t('bluetooth.connect')}
          </Button>
        ) : (
          <Button
            onClick={handleDisconnect}
            variant="destructive"
            className="w-full"
          >
            {t('bluetooth.disconnect')}
          </Button>
        )}
      </div>

      <div className={`text-sm font-medium ${
        status === 'connected' ? 'text-green-600' :
        status === 'connecting' ? 'text-yellow-600' :
        status === 'error' ? 'text-red-600' :
        'text-gray-600'
      }`}>
        {t('bluetooth.status')}: {
          status === 'connected' ? t('bluetooth.connected') :
          status === 'connecting' ? t('bluetooth.selectingDevice') :
          status === 'error' ? t('bluetooth.error') :
          t('bluetooth.disconnected')
        }
      </div>

      <div className="p-3 bg-yellow-50 rounded-md text-xs">
        <p className="font-semibold text-yellow-800">
          💡 {t('bluetooth.hint')}
        </p>
        <p className="text-yellow-700 mt-1">
          {t('bluetooth.hintDesc')}
          <br />
          Service UUID: 6e400001-b5a3-f393-e0a9-e50e24dcca9e
        </p>
      </div>
    </div>
  );
}
