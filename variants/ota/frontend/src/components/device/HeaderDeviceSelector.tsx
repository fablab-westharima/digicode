import { useState } from 'react';
import { Wifi, ChevronDown, Search, AlertTriangle } from 'lucide-react';
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
import { uuidToMdns } from '@/lib/uuid';
import { useTranslation } from 'react-i18next';
import { firmwareService } from '@/services/firmwareService';

interface SelectedDevice {
  name: string;
  id: string;  // WiFiデバイスのuuidまたはホスト
}

export function HeaderDeviceSelector() {
  const { t } = useTranslation();
  const { devices: wifiDevices, updateDevice } = useDeviceStore();
  const [isSearching, setIsSearching] = useState(false);
  const {
    status: wifiStatus,
    deviceName: wifiDeviceName,
    host: wifiHost,
    setHost,
    setDeviceName,
    connect: connectWifi,
    disconnect: disconnectWifi
  } = useWifiStore();

  // デバイスのオンライン状態を保持（デバイス検索結果）
  // { uuid: true/false } - true: オンライン, false: オフライン, undefined: 未検索
  const [deviceOnlineStatus, setDeviceOnlineStatus] = useState<Record<string, boolean>>({});

  // 現在選択中のデバイスを判定
  const getSelectedDevice = (): SelectedDevice | null => {
    if (wifiStatus === 'connected' && wifiDeviceName) {
      return { name: wifiDeviceName, id: wifiHost };
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

  // WiFiデバイス選択中のフラグ
  const [isSelectingDevice, setIsSelectingDevice] = useState(false);

  // WiFiデバイス選択（到達性チェック付き）
  const handleSelectWifiDevice = async (device: { uuid: string; name: string; ipAddress?: string }) => {
    if (!device.ipAddress) {
      alert(t('editor.deviceSelector.noIpAddress'));
      return;
    }

    setIsSelectingDevice(true);

    try {
      // 到達性チェック（3秒タイムアウト）
      const deviceUrl = `http://${device.ipAddress}`;
      const isOnline = await firmwareService.checkDeviceOnline(deviceUrl, 3000);

      if (!isOnline) {
        // オフラインの場合、オンライン状態を更新してから警告
        setDeviceOnlineStatus(prev => ({ ...prev, [device.uuid]: false }));

        const shouldContinue = window.confirm(
          `${t('editor.deviceSelector.deviceOffline', { name: device.name })}\n\n` +
          `IP: ${device.ipAddress}\n\n` +
          t('editor.deviceSelector.offlineWarning')
        );

        if (!shouldContinue) {
          setIsSelectingDevice(false);
          return;
        }
      } else {
        // オンラインの場合、状態を更新
        setDeviceOnlineStatus(prev => ({ ...prev, [device.uuid]: true }));
      }

      // デバイスを選択
      setHost(device.ipAddress);
      setDeviceName(device.name);
      await connectWifi();
    } catch (error) {
      console.error('[SELECT] Device selection error:', error);
      alert(t('editor.deviceSelector.selectionError'));
    } finally {
      setIsSelectingDevice(false);
    }
  };

  // 選択解除
  const handleDeselect = async () => {
    if (wifiStatus === 'connected') {
      await disconnectWifi();
    }
  };

  // デバイスを検索（localStorageのデバイスのオンライン状態を確認）
  const handleSearchDevices = async () => {
    if (wifiDevices.length === 0) {
      alert(t('editor.deviceSelector.registerFromWifi'));
      return;
    }

    setIsSearching(true);
    console.log('[SEARCH] Starting device search...');

    try {
      const results = await Promise.allSettled(
        wifiDevices.map(async (device) => {
          console.log(`[SEARCH] Checking device: ${device.name} (${device.ipAddress})`);

          // リトライロジック: 最大3回試行、1回でも成功すればオンライン
          const maxRetries = 3;
          const retryDelay = 2000; // 2秒
          let isOnline = false;

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              console.log(`[SEARCH] Attempt ${attempt}/${maxRetries} for ${device.name}`);

              // デバイスのHTTPサーバーにアクセス
              // タイムアウトを10秒に設定（ESP32起動後のWiFi接続待ち時間を考慮）
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);

              const response = await fetch(`http://${device.ipAddress}/`, {
                signal: controller.signal,
                mode: 'no-cors', // CORSエラーを回避
              });

              clearTimeout(timeoutId);

              // no-corsモードではresponse.okが常にfalseなので、エラーがなければオンラインと判定
              console.log(`[SEARCH] Device ${device.name} is ONLINE (attempt ${attempt})`);

              // デバイス情報を更新（オンライン状態を記録）
              updateDevice(device.uuid, {
                lastConnected: new Date().toISOString(),
              });

              isOnline = true;
              break; // 成功したらリトライ終了
            } catch (error) {
              console.log(`[SEARCH] Attempt ${attempt}/${maxRetries} failed for ${device.name}:`, error);

              // 最後の試行でなければ待機してリトライ
              if (attempt < maxRetries) {
                console.log(`[SEARCH] Waiting ${retryDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }

          if (isOnline) {
            return { device, isOnline: true };
          } else {
            console.log(`[SEARCH] Device ${device.name} is OFFLINE after ${maxRetries} attempts`);
            return { device, isOnline: false };
          }
        })
      );

      // 結果を集計してオンライン状態を更新
      const newOnlineStatus: Record<string, boolean> = {};
      const onlineDevices = results.filter(
        (result) => {
          if (result.status === 'fulfilled') {
            newOnlineStatus[result.value.device.uuid] = result.value.isOnline;
            return result.value.isOnline;
          }
          return false;
        }
      );
      const offlineDevices = results.filter(
        (result) => result.status === 'fulfilled' && !result.value.isOnline
      );

      // デバイスのオンライン状態を更新
      setDeviceOnlineStatus(newOnlineStatus);

      console.log(`[SEARCH] Search complete: ${onlineDevices.length} online, ${offlineDevices.length} offline`);

      // 結果を表示
      if (onlineDevices.length > 0) {
        const onlineNames = onlineDevices
          .map((r) => r.status === 'fulfilled' ? r.value.device.name : '')
          .filter(Boolean)
          .join(', ');
        alert(`${t('editor.deviceSelector.onlineDevices', { count: onlineDevices.length })}\n${onlineNames}`);
      } else {
        alert(t('editor.deviceSelector.noOnlineDevices'));
      }
    } catch (error) {
      console.error('[SEARCH] Device search error:', error);
      alert(t('editor.deviceSelector.searchError'));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
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
                <Wifi className="w-3 h-3" />
                <span className="ml-1">{selectedDevice.name}</span>
              </>
            ) : (
              t('editor.deviceSelector.writeTarget')
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {/* WiFiデバイス */}
        {wifiDevices.length > 0 ? (
          <>
            <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.deviceSelector.wifiRegisteredDevices')}</div>
            {wifiDevices.map((device) => {
              const isSelected = wifiStatus === 'connected' && wifiHost === getDeviceHost(device);
              const onlineStatus = deviceOnlineStatus[device.uuid];

              // オンライン状態に基づいて色を決定
              // true: 緑（オンライン）, false: 赤（オフライン）, undefined: 灰色（未検索）
              const statusColor = onlineStatus === true
                ? 'bg-green-500'
                : onlineStatus === false
                  ? 'bg-red-500'
                  : 'bg-gray-400';

              return (
                <DropdownMenuItem
                  key={device.uuid}
                  onClick={() => handleSelectWifiDevice(device)}
                  className={isSelected ? 'bg-green-500/10 text-green-400 font-semibold' : ''}
                >
                  <Wifi className="w-4 h-4 mr-2 text-green-500" />
                  {device.name}
                  <div className={`ml-auto w-2 h-2 rounded-full ${statusColor}`} />
                </DropdownMenuItem>
              );
            })}
          </>
        ) : (
          <div className="px-2 py-1.5 text-xs text-gray-500">
            {t('editor.deviceSelector.registerFromWifi')}
          </div>
        )}

        {/* デバイス検索（WiFiデバイスがある場合のみ） */}
        {wifiDevices.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSearchDevices}
              disabled={isSearching}
              className="text-green-600 hover:text-green-700"
            >
              <Search className="w-4 h-4 mr-2" />
              {isSearching ? t('editor.deviceSelector.searching') : t('editor.deviceSelector.searchDevice')}
            </DropdownMenuItem>
          </>
        )}

        {/* 選択解除（WiFi選択中のみ） */}
        {selectedDevice && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDeselect} className="text-red-600">
              {t('editor.deviceSelector.deselect')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  );
}
