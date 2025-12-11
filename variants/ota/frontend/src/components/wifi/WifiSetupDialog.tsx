import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSerialStore } from '@/stores/serialStore';
import { useDeviceStore } from '@/stores/deviceStore';
import { Trash2, AlertCircle, Terminal, Wifi, Usb, Check } from 'lucide-react';

interface WifiSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WiFiEntry {
  ssid: string;
  isConnected: boolean;
}

export function WifiSetupDialog({ open, onOpenChange }: WifiSetupDialogProps) {
  const { t } = useTranslation();
  const { status, isSupported, connect, disconnect, send, output, clearOutput, resetESP32 } = useSerialStore();
  const { addDevice, removeDevice, clearDevices } = useDeviceStore();

  const [showConsole, setShowConsole] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);

  // WiFi管理用のstate
  const [wifiList, setWifiList] = useState<WiFiEntry[]>([]);
  const [selectedWifi, setSelectedWifi] = useState<string | null>(null);
  const [newWifiSsid, setNewWifiSsid] = useState('');
  const [newWifiPassword, setNewWifiPassword] = useState('');
  const [isLoadingWifi, setIsLoadingWifi] = useState(false);
  const [wifiMessage, setWifiMessage] = useState('');

  // デバイス情報
  const [deviceUuid, setDeviceUuid] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [originalDeviceName, setOriginalDeviceName] = useState('');
  const [isLoadingDeviceName, setIsLoadingDeviceName] = useState(false);

  // 固定IP情報（表示用）
  const [staticIp, setStaticIp] = useState('');
  const [gateway, setGateway] = useState('');
  const [subnet, setSubnet] = useState('');

  // コンソール自動スクロール
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

  // WiFi接続成功を検知
  useEffect(() => {
    if (wifiMessage.includes('WiFi')) {
      const lastOutputs = output.slice(-10).join('\n');
      if (lastOutputs.includes('HTTP server started') || lastOutputs.includes('WiFi connected')) {
        setWifiMessage(t('device.connectionSuccess'));
      }
    }
  }, [output, wifiMessage, t]);

  // 接続時にWiFi一覧とデバイス名を読み込み
  useEffect(() => {
    if (status === 'connected' && open) {
      // デバイス名を先に読み込む（ブートログから取得するため）
      // その後WiFi一覧を取得（コマンド送信が必要）
      const timer = setTimeout(async () => {
        // ESP32の起動完了を待つ（シリアル接続でリセットされるため）
        // WiFi接続・固定IP設定完了まで時間がかかるので余裕を持たせる
        await loadDeviceName();
        await loadWiFiList();
      }, 5000);
      return () => clearTimeout(timer);
    } else if (status !== 'connected') {
      setWifiList([]);
      setWifiMessage('');
      setSelectedWifi(null);
      setNewWifiSsid('');
      setNewWifiPassword('');
      setDeviceName('');
      setOriginalDeviceName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, open]);

  // 応答を待つヘルパー関数（startIndexより後の出力のみチェック）
  const waitForResponse = async (keyword: string, startIndex: number, maxWaitMs: number = 10000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const currentOutput = useSerialStore.getState().output;
      // startIndex以降の新しい出力のみをチェック
      const newOutput = currentOutput.slice(startIndex);
      if (newOutput.some(line => line.includes(keyword))) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return false;
  };

  // ランダムな8桁英数字UUIDを生成
  const generateRandomUuid = (): string => {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let uuid = '';
    for (let i = 0; i < 8; i++) {
      uuid += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return uuid;
  };

  // WiFi一覧を読み込み
  const loadWiFiList = async (): Promise<WiFiEntry[]> => {
    if (status !== 'connected') return [];

    setIsLoadingWifi(true);
    setWifiMessage(t('device.loadingWifi'));

    try {
      // 送信前のoutputのインデックスを記録
      const startIndex = useSerialStore.getState().output.length;

      await send('LIST_WIFI\n');

      // OK:WIFI_LIST_SHOWN が来るまで待つ（最大10秒）
      const gotResponse = await waitForResponse('OK:WIFI_LIST_SHOWN', startIndex, 10000);

      if (!gotResponse) {
        console.log('LIST_WIFI response timeout');
        setWifiMessage(t('device.loadWifiTimeout'));
        setIsLoadingWifi(false);
        return [];
      }

      // outputから最新の状態を取得
      const currentOutput = useSerialStore.getState().output;

      // startIndex以降の新しい出力だけを対象にする（古いLIST_WIFI結果を除外）
      const newOutput = currentOutput.slice(startIndex);

      // WiFiエントリを含む行を探す: [数字] SSID (password: xxx)
      // 先頭の空白を許容し、trimして処理
      const wifiLines = newOutput.filter(line => {
        const trimmed = line.trim();
        return /^\[\d+\]/.test(trimmed) && trimmed.includes('(password:');
      });

      if (wifiLines.length > 0) {
        const parsedWifi: WiFiEntry[] = wifiLines.map(line => {
          const trimmed = line.trim();
          const match = trimmed.match(/^\[\d+\]\s+(.+?)\s+\(password:/);
          const ssid = match ? match[1].trim() : '';
          const isConnected = trimmed.includes('[CONNECTED]');
          return { ssid, isConnected };
        });

        // 重複を除去（最後の出現を優先）
        const uniqueWifi = parsedWifi.reduce((acc, wifi) => {
          if (!wifi.ssid) return acc;
          const existing = acc.findIndex(w => w.ssid === wifi.ssid);
          if (existing >= 0) {
            acc[existing] = wifi;
          } else {
            acc.push(wifi);
          }
          return acc;
        }, [] as WiFiEntry[]);

        setWifiList(uniqueWifi);
        setWifiMessage('');

        // 接続中のWiFiを自動選択
        const connectedWifi = uniqueWifi.find(w => w.isConnected);
        if (connectedWifi) {
          setSelectedWifi(connectedWifi.ssid);
        } else if (uniqueWifi.length > 0) {
          setSelectedWifi(uniqueWifi[0].ssid);
        }

        return uniqueWifi;
      } else {
        setWifiList([]);
        setWifiMessage(t('device.noWifiSaved'));
        return [];
      }
    } catch (error) {
      console.error('Load WiFi list error:', error);
      setWifiMessage(t('device.loadWifiFailed'));
      return [];
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイス名を読み込み（コンソール出力からパース）
  const loadDeviceName = async (): Promise<{ uuid: string; name: string; ip: string; gateway: string; subnet: string; ssid: string } | null> => {
    if (status !== 'connected') return null;

    setIsLoadingDeviceName(true);

    try {
      // リトライ付きでデバイス名とUUIDを検索（ブート完了を待つため）
      let foundName = '';
      let foundUuid = '';
      let foundSsid = '';

      for (let i = 0; i < 5; i++) {
        const currentOutput = useSerialStore.getState().output;

        // 最新の情報を取得するため、逆順で検索
        const reversedOutput = [...currentOutput].reverse();

        // "Device UUID: xxx" または "UUID: xxx" 形式の行を探す（最新のものを優先）
        const uuidLine = reversedOutput.find(line =>
          line.includes('Device UUID:') || line.includes('UUID:')
        );
        if (uuidLine) {
          const uuidMatch = uuidLine.match(/UUID:\s*(.+)/i);
          if (uuidMatch && uuidMatch[1].trim()) {
            foundUuid = uuidMatch[1].trim();
          }
        }

        // "Device Name: xxx" を最優先で探す（最新のものを優先）
        const deviceNameLine = reversedOutput.find(line => line.includes('Device Name:'));
        if (deviceNameLine) {
          const match = deviceNameLine.match(/Device Name:\s*(.+)/i);
          if (match && match[1].trim()) {
            foundName = match[1].trim();
          }
        } else {
          // "Device Name:" がなければ "Name: xxx" を探す
          const nameLine = reversedOutput.find(line =>
            line.includes('Name:') && !line.includes('Device Name:')
          );
          if (nameLine) {
            const match = nameLine.match(/Name:\s*(.+)/i);
            if (match && match[1].trim()) {
              foundName = match[1].trim();
            }
          }
        }

        // "SSID: xxx" を探す（WiFi接続情報から）
        const ssidLine = reversedOutput.find(line => line.includes('SSID:') && !line.includes('Target SSID:'));
        if (ssidLine) {
          const match = ssidLine.match(/SSID:\s*(.+)/i);
          if (match && match[1].trim()) {
            foundSsid = match[1].trim();
          }
        }

        if (foundName && foundUuid) break;

        // 見つからなければ500ms待ってリトライ
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // UUIDが "robot001" の場合は新しいランダムUUIDを生成して送信
      if (foundUuid === 'robot001') {
        const newUuid = generateRandomUuid();
        console.log(`[UUID] Detected default UUID "robot001", generating new UUID: ${newUuid}`);

        try {
          // 古いrobot001デバイスがdeviceStoreに存在すれば削除
          removeDevice('robot001');
          console.log(`[UUID] Removed old robot001 device from store`);

          await send(`SET_UUID:${newUuid}\n`);
          await new Promise(resolve => setTimeout(resolve, 200));

          // 送信後、新しいUUIDを状態に反映
          foundUuid = newUuid;
          setDeviceUuid(newUuid);

          // SAVE_CONFIGを送信して永続化
          await send('SAVE_CONFIG\n');
          await new Promise(resolve => setTimeout(resolve, 200));

          console.log(`[UUID] Successfully set new UUID: ${newUuid}`);
        } catch (error) {
          console.error('[UUID] Failed to set new UUID:', error);
          // エラーでも既存のUUIDは設定しておく
          setDeviceUuid(foundUuid);
        }
      } else if (foundUuid) {
        setDeviceUuid(foundUuid);
      }

      if (foundName) {
        setDeviceName(foundName);
        setOriginalDeviceName(foundName);
      } else {
        setDeviceName('');
        setOriginalDeviceName('');
      }

      // GET_CONFIGで固定IP情報も取得（WiFi接続済みの場合に表示）
      const startIndex = useSerialStore.getState().output.length;
      await send('GET_CONFIG\n');
      const gotResponse = await waitForResponse('OK:UUID=', startIndex, 3000);

      if (gotResponse) {
        const newOutput = useSerialStore.getState().output.slice(startIndex);
        let foundStaticIp = '';
        let foundGateway = '';
        let foundSubnet = '';

        for (const line of newOutput) {
          if (line.includes('OK:STATIC_IP=')) {
            foundStaticIp = line.split('OK:STATIC_IP=')[1]?.trim() || '';
          } else if (line.includes('OK:GATEWAY=')) {
            foundGateway = line.split('OK:GATEWAY=')[1]?.trim() || '';
          } else if (line.includes('OK:SUBNET=')) {
            foundSubnet = line.split('OK:SUBNET=')[1]?.trim() || '';
          }
        }

        if (foundStaticIp) {
          setStaticIp(foundStaticIp);
          setGateway(foundGateway);
          setSubnet(foundSubnet);

          // 固定IP情報があり、デバイス情報も揃っていればデバイスを登録
          if (foundUuid && foundName && foundSsid) {
            console.log('[loadDeviceName] Registering device to store:', {
              uuid: foundUuid,
              name: foundName,
              ssid: foundSsid,
              ipAddress: foundStaticIp,
            });

            addDevice({
              uuid: foundUuid,
              name: foundName,
              ssid: foundSsid,
              lastConnected: new Date().toISOString(),
              ipAddress: foundStaticIp,
              gateway: foundGateway,
              subnet: foundSubnet,
            });

            return {
              uuid: foundUuid,
              name: foundName,
              ip: foundStaticIp,
              gateway: foundGateway,
              subnet: foundSubnet,
              ssid: foundSsid,
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Load device name error:', error);
      return null;
    } finally {
      setIsLoadingDeviceName(false);
    }
  };

  // 自動的にDHCP IPを固定化
  const autoSetStaticIp = async (): Promise<{ ip: string; gateway: string; subnet: string } | null> => {
    if (status !== 'connected') return null;

    try {
      const startIndex = useSerialStore.getState().output.length;

      // USE_CURRENT_IPコマンドでDHCPで取得したIPを固定化
      await send('USE_CURRENT_IP\n');
      await new Promise(resolve => setTimeout(resolve, 500));

      // GET_CONFIGで固定IP情報を取得
      await send('GET_CONFIG\n');
      const gotResponse = await waitForResponse('OK:UUID=', startIndex, 5000);

      if (!gotResponse) {
        console.warn('GET_CONFIG response timeout');
        return null;
      }

      const newOutput = useSerialStore.getState().output.slice(startIndex);
      let foundIp = '';
      let foundGateway = '';
      let foundSubnet = '';

      for (const line of newOutput) {
        if (line.includes('OK:STATIC_IP=')) {
          foundIp = line.split('OK:STATIC_IP=')[1]?.trim() || '';
        } else if (line.includes('OK:GATEWAY=')) {
          foundGateway = line.split('OK:GATEWAY=')[1]?.trim() || '';
        } else if (line.includes('OK:SUBNET=')) {
          foundSubnet = line.split('OK:SUBNET=')[1]?.trim() || '';
        }
      }

      if (foundIp) {
        setStaticIp(foundIp);
        setGateway(foundGateway);
        setSubnet(foundSubnet);
        console.log('[autoSetStaticIp] Static IP configured:', { foundIp, foundGateway, foundSubnet });
        return { ip: foundIp, gateway: foundGateway, subnet: foundSubnet };
      }
      return null;
    } catch (error) {
      console.error('Auto set static IP error:', error);
      return null;
    }
  };

  // デバイスリストをクリアして再読み込み
  const handleRefreshDevices = async () => {
    if (status !== 'connected') {
      alert(t('device.connectFirst', { defaultValue: 'まずUSB接続してください' }));
      return;
    }

    if (!confirm(t('device.confirmClearDevices', { defaultValue: 'デバイスリストをクリアして再読み込みしますか？ 現在接続中のデバイスのみが再登録されます。' }))) {
      return;
    }

    setIsLoadingWifi(true);
    try {
      // デバイスリストをクリア
      clearDevices();
      console.log('[REFRESH] Device list cleared');

      // 現在のデバイス情報を再読み込み
      setWifiMessage(t('device.updatingInfo', { defaultValue: 'デバイス情報を更新中...' }));
      await loadDeviceName();
      const wifiEntries = await loadWiFiList();

      // WiFi接続されていれば自動的にデバイスを登録
      const isWifiConnected = wifiEntries.some(w => w.isConnected);
      if (isWifiConnected && deviceUuid && deviceName && staticIp) {
        const connectedSsid = wifiEntries.find(w => w.isConnected)?.ssid || '';
        addDevice({
          uuid: deviceUuid,
          name: deviceName,
          ssid: connectedSsid,
          lastConnected: new Date().toISOString(),
          ipAddress: staticIp,
          gateway: gateway,
          subnet: subnet,
        });
        console.log('[REFRESH] Device list refreshed and current device added');
        setWifiMessage(t('device.deviceListRefreshed', { defaultValue: 'デバイスリストを更新しました' }));
      } else {
        setWifiMessage(t('device.noDeviceToRegister', { defaultValue: 'WiFi接続されていないため、デバイスは登録されませんでした' }));
      }
    } catch (error) {
      console.error('Refresh devices error:', error);
      setWifiMessage(t('device.refreshFailed', { defaultValue: 'デバイスリスト更新に失敗しました' }));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // WiFiを削除
  const handleRemoveWiFi = async (ssid: string) => {
    if (!confirm(t('device.confirmDeleteWifi', { ssid }))) {
      return;
    }

    setIsLoadingWifi(true);
    setWifiMessage('');

    try {
      // 送信前のoutputのインデックスを記録
      const startIndex = useSerialStore.getState().output.length;

      await send(`REMOVE_WIFI:${ssid}\n`);

      // OK:WIFI_REMOVED の応答を待つ（最大5秒）
      const gotResponse = await waitForResponse('OK:WIFI_REMOVED', startIndex, 5000);

      if (!gotResponse) {
        console.warn('REMOVE_WIFI response timeout');
        // タイムアウトしても処理は続行（削除自体は成功している可能性がある）
      }

      // さらに500ms待機してフラッシュ書き込みを確実に完了させる
      await new Promise(resolve => setTimeout(resolve, 500));

      if (selectedWifi === ssid) {
        setSelectedWifi(null);
      }
      setWifiMessage(t('device.wifiDeleted'));

      await loadWiFiList();
    } catch (error) {
      console.error('Remove WiFi error:', error);
      setWifiMessage(t('device.wifiDeleteFailed'));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // 設定を保存して接続
  const handleSaveAndConnect = async () => {
    const hasNewWifi = newWifiSsid.trim() && newWifiPassword.trim();

    if (!selectedWifi && !hasNewWifi) {
      setWifiMessage(t('device.selectOrEnterWifi'));
      return;
    }

    setIsLoadingWifi(true);
    setWifiMessage('');

    try {
      let needsSaveConfig = false;

      // デバイス名を保存（新規または変更があれば）
      if (deviceName.trim() && deviceName.trim() !== originalDeviceName) {
        setWifiMessage(t('device.savingDeviceName'));
        await send(`SET_NAME:${deviceName.trim()}\n`);
        await new Promise(resolve => setTimeout(resolve, 100));
        needsSaveConfig = true;
      }

      // 新規WiFiがある場合は追加
      if (hasNewWifi) {
        setWifiMessage(t('device.savingWifiSettings'));
        await send(`ADD_WIFI:${newWifiSsid.trim()},${newWifiPassword.trim()}\n`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 設定を保存（SAVE_CONFIGでフラッシュに書き込み）
      if (needsSaveConfig) {
        setWifiMessage(t('device.savingToFlash'));
        await send(`SAVE_CONFIG\n`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setWifiMessage(t('device.savedRestartingEsp32'));

      // デバイス情報を準備（IP固定化後にdeviceStoreに登録）
      const finalDeviceName = deviceName.trim() || originalDeviceName;
      const connectedSsid = selectedWifi || newWifiSsid.trim();

      // ESP32を自動リセット
      await new Promise(resolve => setTimeout(resolve, 500));
      await resetESP32();

      // リセット後、ESP32の再起動を待ってからデバイス情報を再読み込み
      setWifiMessage(t('device.waitingForRestart'));
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待つ（WiFi接続完了まで）

      // デバイス名とWiFi一覧を再読み込みしてUIを更新
      setWifiMessage(t('device.updatingInfo'));
      await loadDeviceName();
      const wifiEntries = await loadWiFiList();

      // WiFi接続成功時は自動的にDHCP IPを固定化
      const isWifiConnected = wifiEntries.some(w => w.isConnected);
      if (isWifiConnected) {
        setWifiMessage('WiFi接続成功。DHCPで取得したIPを固定化中...');
        const ipInfo = await autoSetStaticIp();

        // IP固定化が成功した場合、デバイスストアを更新
        if (ipInfo && deviceUuid && finalDeviceName) {
          const deviceData = {
            uuid: deviceUuid,
            name: finalDeviceName,
            ssid: connectedSsid,
            lastConnected: new Date().toISOString(),
            ipAddress: ipInfo.ip,
            gateway: ipInfo.gateway,
            subnet: ipInfo.subnet,
          };
          console.log('[handleSaveAndConnect] Adding device to store:', deviceData);
          addDevice(deviceData);
          console.log('[handleSaveAndConnect] Device registered successfully');
        } else {
          console.warn('[handleSaveAndConnect] Missing data for device registration:', {
            hasIpInfo: !!ipInfo,
            deviceUuid,
            finalDeviceName,
          });
        }
      }

      setWifiMessage(t('device.connectionSuccess'));

      // 入力をクリア
      setNewWifiSsid('');
      setNewWifiPassword('');

      setWifiMessage(t('device.savedAndRestarted'));
    } catch (error) {
      console.error('Save settings error:', error);
      setWifiMessage(t('device.settingsSaveFailed'));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // ステップの完了状態
  const isStep1Complete = status === 'connected';
  const isStep2Complete = selectedWifi !== null || (newWifiSsid.trim() && newWifiPassword.trim());
  const isStep3Complete = deviceName.trim().length > 0;

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-yellow-600" />
              {t('device.wifiRouterConnect')}
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('device.webSerialNotSupported')}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-yellow-600" />
            {t('device.wifiRouterConnect')}
          </DialogTitle>
          <DialogDescription>
            {t('device.wifiRouterConnectDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* STEP 1: USB接続 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${isStep1Complete ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                {t('device.step')} 1
              </span>
              {t('device.usbConnection')}
              {isStep1Complete && <Check className="w-4 h-4 text-green-500" />}
            </h3>
            <div className="p-3 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#161B22]">
                    <Usb className="w-5 h-5 text-[#8B949E]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E6EDF3]">
                      {status === 'connected' ? t('device.connectedToEsp32') :
                       status === 'connecting' ? t('device.processing') :
                       t('device.connectEsp32Usb')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'connected' ? 'bg-green-500' :
                        status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        'bg-gray-500'
                      }`} />
                      <span className="text-xs text-[#8B949E]">
                        {status === 'connected' ? t('device.connected') :
                         status === 'connecting' ? t('device.processing') :
                         t('device.disconnected')}
                      </span>
                    </div>
                  </div>
                </div>
                {status === 'connected' ? (
                  <Button variant="outline" size="sm" onClick={async () => await disconnect()}>
                    {t('device.disconnect')}
                  </Button>
                ) : (
                  <Button size="sm" onClick={async () => await connect()} disabled={status === 'connecting'}>
                    {status === 'connecting' ? t('device.connecting') : t('device.connect')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: アクセスポイント選択 */}
          {status === 'connected' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${isStep2Complete ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {t('device.step')} 2
                </span>
                {t('device.accessPointSelect')}
                {isStep2Complete && <Check className="w-4 h-4 text-green-500" />}
              </h3>
              <div className="p-3 rounded-lg border-2 border-[#2E333D] bg-[#0D1117] space-y-3">
                {/* 保存済みWiFi一覧 */}
                {wifiList.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8B949E]">{t('device.savedWifi')} ({wifiList.length}/5)</Label>
                    <div className="space-y-1">
                      {wifiList.map((wifi, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                            selectedWifi === wifi.ssid
                              ? 'bg-blue-600/20 border-2 border-blue-500'
                              : 'bg-[#161B22] border border-[#2E333D] hover:bg-[#21262D]'
                          }`}
                          onClick={() => {
                            setSelectedWifi(wifi.ssid);
                            // 保存済みWiFiを選択したら新規入力をクリア
                            setNewWifiSsid('');
                            setNewWifiPassword('');
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Wifi className={`w-4 h-4 ${selectedWifi === wifi.ssid ? 'text-blue-400' : 'text-[#8B949E]'}`} />
                            <span className="text-sm font-medium text-[#E6EDF3]">{wifi.ssid}</span>
                            {wifi.isConnected && (
                              <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                                {t('device.wifiConnected')}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); handleRemoveWiFi(wifi.ssid); }}
                            disabled={isLoadingWifi}
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 新規WiFi入力フォーム（常に表示、5個未満の場合） */}
                {wifiList.length < 5 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-[#8B949E]">
                      {wifiList.length > 0 ? t('device.newWifiConnect') : t('device.wifiToConnect')}
                    </Label>
                    <Input
                      placeholder={t('device.wifiSsidPlaceholder')}
                      value={newWifiSsid}
                      onChange={(e) => {
                        setNewWifiSsid(e.target.value);
                        // 新規入力を始めたら保存済みの選択を解除
                        if (e.target.value) setSelectedWifi(null);
                      }}
                      disabled={isLoadingWifi}
                      className="text-sm h-9"
                    />
                    <Input
                      type="password"
                      placeholder={t('device.wifiPasswordPlaceholder')}
                      value={newWifiPassword}
                      onChange={(e) => setNewWifiPassword(e.target.value)}
                      disabled={isLoadingWifi}
                      className="text-sm h-9"
                    />
                  </div>
                )}

                {wifiList.length >= 5 && !selectedWifi && (
                  <p className="text-xs text-amber-600">
                    {t('device.wifiMaxReached')}
                  </p>
                )}

                {isLoadingWifi && (
                  <div className="text-center text-sm text-[#8B949E] py-2">
                    {t('common.loading')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: デバイス名入力 */}
          {status === 'connected' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${isStep3Complete ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {t('device.step')} 3
                </span>
                {t('device.deviceNameStep')}
                {isStep3Complete && <Check className="w-4 h-4 text-green-500" />}
                {originalDeviceName && <span className="text-xs text-[#8B949E]">（{t('device.configured')}）</span>}
              </h3>
              <div className="p-3 rounded-lg border-2 border-[#2E333D] bg-[#0D1117] space-y-3">
                <div>
                  <Input
                    placeholder={t('device.deviceNamePlaceholder')}
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    disabled={isLoadingDeviceName}
                    className="text-sm h-9 bg-[#161B22] border-[#2E333D] text-[#E6EDF3]"
                  />
                  <p className="text-xs text-[#8B949E] mt-2">
                    {t('device.deviceNameDesc')}
                  </p>
                </div>

                {/* 固定IP情報の表示 */}
                {staticIp && (
                  <div className="pt-3 border-t border-[#2E333D]">
                    <Label className="text-xs text-[#8B949E] mb-2 block">固定IP設定（確定済み）</Label>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between bg-[#161B22] px-3 py-2 rounded border border-[#2E333D]">
                        <span className="text-[#8B949E]">Static IP:</span>
                        <span className="text-[#E6EDF3] font-mono">{staticIp}</span>
                      </div>
                      {gateway && (
                        <div className="flex items-center justify-between bg-[#161B22] px-3 py-2 rounded border border-[#2E333D]">
                          <span className="text-[#8B949E]">Gateway:</span>
                          <span className="text-[#E6EDF3] font-mono">{gateway}</span>
                        </div>
                      )}
                      {subnet && (
                        <div className="flex items-center justify-between bg-[#161B22] px-3 py-2 rounded border border-[#2E333D]">
                          <span className="text-[#8B949E]">Subnet:</span>
                          <span className="text-[#E6EDF3] font-mono">{subnet}</span>
                        </div>
                      )}
                      <p className="text-xs text-[#8B949E] mt-2 italic">
                        💡 再起動時にリセットされ、DHCPで新規取得したIPが自動的に固定化されます
                      </p>
                    </div>
                  </div>
                )}

                {/* デバイスリスト再読み込みボタン */}
                {staticIp && (
                  <div className="pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshDevices}
                      disabled={isLoadingWifi || status !== 'connected'}
                      className="w-full text-xs"
                    >
                      デバイスリストを再読み込み
                    </Button>
                    <p className="text-xs text-[#8B949E] mt-1.5">
                      ※ localStorageのデバイスリストをクリアし、現在接続中のデバイスのみを再登録します
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* メッセージ */}
          {wifiMessage && (
            <Alert className="py-2">
              <AlertDescription className="text-sm">{wifiMessage}</AlertDescription>
            </Alert>
          )}

          {/* 接続ボタン */}
          {status === 'connected' && (
            <Button
              onClick={handleSaveAndConnect}
              disabled={isLoadingWifi || (!selectedWifi && !(newWifiSsid.trim() && newWifiPassword.trim()))}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {t('device.saveSettings')}
            </Button>
          )}

          {/* シリアルコンソール */}
          {status === 'connected' && (
            <div className="space-y-2 border-t border-[#2E333D] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#8B949E]">
                  <Terminal className="w-4 h-4" />
                  {t('device.serialConsole')}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConsole(!showConsole)}
                    className="text-xs h-7"
                  >
                    {showConsole ? t('device.hide') : t('device.show')}
                  </Button>
                  {showConsole && (
                    <Button variant="outline" size="sm" onClick={clearOutput} className="text-xs h-7">
                      {t('device.clear')}
                    </Button>
                  )}
                </div>
              </div>
              {showConsole && (
                <div
                  ref={consoleRef}
                  className="bg-black text-green-400 font-mono text-xs p-3 rounded h-28 overflow-y-auto"
                >
                  {output.length === 0 ? (
                    <div className="text-gray-500">{t('device.waitingOutput')}</div>
                  ) : (
                    output.map((line, index) => (
                      <div key={index}>{line}</div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
