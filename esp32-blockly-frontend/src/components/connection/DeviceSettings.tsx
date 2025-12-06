/**
 * デバイス設定コンポーネント
 * デバイス名登録とWiFi設定（接続ダイアログ内で使用）
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSerialStore } from '@/stores/serialStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { generateShortUuid, uuidToSsid, uuidToMdns } from '@/lib/uuid';
import { Trash2, Plus, Wifi, AlertCircle, CheckCircle2, Edit2, Check } from 'lucide-react';

export function DeviceSettings() {
  const { t } = useTranslation();
  const { status, send, output } = useSerialStore();
  const { devices, addDevice, updateDevice, removeDevice } = useDeviceStore();

  const [deviceName, setDeviceName] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // WiFi設定
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiList, setWifiList] = useState<{ ssid: string; isConnected: boolean }[]>([]);
  const [isLoadingWifi, setIsLoadingWifi] = useState(false);

  // IPアドレス編集
  const [editingIpDevice, setEditingIpDevice] = useState<string | null>(null);
  const [editingIpValue, setEditingIpValue] = useState('');

  const isConnected = status === 'connected';

  // USB接続時にWiFi一覧を読み込み
  useEffect(() => {
    if (isConnected) {
      const timer = setTimeout(() => {
        loadWiFiList();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setWifiList([]);
    }
  }, [status]);

  // WiFi一覧を読み込み
  const loadWiFiList = async () => {
    if (!isConnected) return;

    setIsLoadingWifi(true);
    try {
      await send('LIST_WIFI\n');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const outputText = output.join('\n');
      const wifiLines = outputText.match(/\[\d+\]\s+(.+?)\s+\(password:/g);

      if (wifiLines) {
        const parsedWifi = wifiLines.map(line => {
          const match = line.match(/\[\d+\]\s+(.+?)\s+\(password:/);
          const ssid = match ? match[1].trim() : '';
          const isConnected = line.includes('[CONNECTED]');
          return { ssid, isConnected };
        });
        setWifiList(parsedWifi);
      } else {
        setWifiList([]);
      }
    } catch (error) {
      console.error('Load WiFi list error:', error);
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイス登録（UUID自動生成）
  const handleRegisterDevice = async () => {
    if (!deviceName.trim()) {
      setMessage({ type: 'error', text: t('device.enterDeviceName') });
      return;
    }

    if (!isConnected) {
      setMessage({ type: 'error', text: t('device.connectUsb') });
      return;
    }

    setIsWriting(true);
    setMessage(null);

    try {
      // UUID自動生成
      const uuid = generateShortUuid();

      // ESP32に書き込み
      await send(`SET_UUID:${uuid}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));

      // ローカルに保存
      addDevice({
        uuid,
        name: deviceName.trim(),
        createdAt: new Date().toISOString(),
      });

      setMessage({
        type: 'success',
        text: `${t('device.deviceRegistered', { name: deviceName })}\nSSID: ${uuidToSsid(uuid)}`
      });
      setDeviceName('');
    } catch (error) {
      setMessage({ type: 'error', text: t('device.registrationFailed') });
    } finally {
      setIsWriting(false);
    }
  };

  // デバイス削除
  const handleRemoveDevice = (uuid: string) => {
    const device = devices.find(d => d.uuid === uuid);
    if (confirm(t('device.confirmDeleteDevice', { name: device?.name }))) {
      removeDevice(uuid);
    }
  };

  // IPアドレス編集開始
  const handleStartEditIp = (uuid: string, currentIp?: string) => {
    setEditingIpDevice(uuid);
    setEditingIpValue(currentIp || '');
  };

  // IPアドレス保存
  const handleSaveIp = (uuid: string) => {
    updateDevice(uuid, { ipAddress: editingIpValue.trim() || undefined });
    setEditingIpDevice(null);
    setEditingIpValue('');
    setMessage({ type: 'success', text: t('device.ipSaved') });
  };

  // WiFi追加
  const handleAddWiFi = async () => {
    if (!wifiSsid.trim() || !wifiPassword.trim()) {
      setMessage({ type: 'error', text: t('device.enterSsidPassword') });
      return;
    }

    if (!isConnected) {
      setMessage({ type: 'error', text: t('device.connectUsb') });
      return;
    }

    setIsLoadingWifi(true);
    try {
      await send(`ADD_WIFI:${wifiSsid},${wifiPassword}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));

      setWifiSsid('');
      setWifiPassword('');
      setMessage({ type: 'success', text: t('device.wifiAdded') });

      await loadWiFiList();
    } catch (error) {
      setMessage({ type: 'error', text: t('device.wifiAddFailed') });
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // WiFi削除
  const handleRemoveWiFi = async (ssid: string) => {
    if (!confirm(t('device.confirmDeleteWifi', { ssid }))) return;

    setIsLoadingWifi(true);
    try {
      await send(`REMOVE_WIFI:${ssid}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadWiFiList();
    } catch (error) {
      setMessage({ type: 'error', text: t('device.wifiDeleteFailed') });
    } finally {
      setIsLoadingWifi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 接続状態 */}
      {!isConnected && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {t('device.usbRequired')}
        </div>
      )}

      {/* メッセージ表示 */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700' :
          message.type === 'error' ? 'bg-red-50 text-red-700' :
          'bg-blue-50 text-blue-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="whitespace-pre-line">{message.text}</span>
        </div>
      )}

      {/* デバイス登録 */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">{t('device.newDeviceRegistration')}</Label>
        <div className="flex gap-2">
          <Input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder={t('device.deviceNameExample')}
            disabled={!isConnected || isWriting}
            className="flex-1"
          />
          <Button
            onClick={handleRegisterDevice}
            disabled={!isConnected || isWriting || !deviceName.trim()}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('device.register')}
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          {t('device.uuidAutoGenerated')}
        </p>
      </div>

      {/* 登録済みデバイス一覧 */}
      {devices.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">{t('device.registeredDevices')}</Label>
          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.uuid}
                className="p-2 bg-gray-50 rounded-lg text-sm space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{device.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({uuidToSsid(device.uuid)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDevice(device.uuid)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* IPアドレス編集 */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">IP:</span>
                  {editingIpDevice === device.uuid ? (
                    <>
                      <Input
                        value={editingIpValue}
                        onChange={(e) => setEditingIpValue(e.target.value)}
                        placeholder="192.168.x.x"
                        className="h-6 text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveIp(device.uuid)}
                        className="h-6 w-6 p-0 text-green-600"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-600">
                        {device.ipAddress || uuidToMdns(device.uuid)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEditIp(device.uuid, device.ipAddress)}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WiFi設定（ホームルーター） */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-gray-500" />
          <Label className="text-sm font-semibold">{t('device.homeRouterWifi')}</Label>
        </div>

        {/* 保存済みWiFi一覧 */}
        {wifiList.length > 0 && (
          <div className="space-y-1">
            {wifiList.map((wifi, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  {wifi.isConnected && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                  <span>{wifi.ssid}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveWiFi(wifi.ssid)}
                  disabled={isLoadingWifi}
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 新規WiFi追加 */}
        <div className="space-y-2">
          <Input
            value={wifiSsid}
            onChange={(e) => setWifiSsid(e.target.value)}
            placeholder={t('device.ssid')}
            disabled={!isConnected || isLoadingWifi}
            className="h-8 text-sm"
          />
          <Input
            type="password"
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
            placeholder={t('device.passwordLabel')}
            disabled={!isConnected || isLoadingWifi}
            className="h-8 text-sm"
          />
          <Button
            onClick={handleAddWiFi}
            disabled={!isConnected || isLoadingWifi || !wifiSsid.trim() || !wifiPassword.trim()}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('device.addWifi')}
          </Button>
        </div>
      </div>
    </div>
  );
}
