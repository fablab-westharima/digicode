/**
 * OTA接続設定ダイアログ
 *
 * 以下の設定を1つのモーダルにまとめる：
 * 0. AP接続設定（WiFiルーター接続設定）
 * 1. コンパイルサーバー選択
 * 2. 書込み先デバイス選択
 */

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Cloud,
  Server,
  Wifi,
  Usb,
  Check,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { compileService, type CompileServerMode } from '@/services/compileService';
import { useWifiStore } from '@/stores/wifiStore';
import { useSerialStore } from '@/stores/serialStore';
import { useDeviceStore } from '@/stores/deviceStore';

interface DigiCodeDevice {
  name: string;
  ipAddress: string;
  uuid: string;
  url: string;
}

interface WiFiEntry {
  ssid: string;
  isConnected: boolean;
}

interface OtaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OtaSetupDialog({ open, onOpenChange }: OtaSetupDialogProps) {
  const { t } = useTranslation();

  // Stores
  const { setHost, setDeviceName: setWifiDeviceName } = useWifiStore();
  const { status: serialStatus, isSupported: serialSupported, connect: connectSerial, disconnect: disconnectSerial, send, output, resetESP32 } = useSerialStore();
  const { addDevice, devices, clearDevices } = useDeviceStore();

  // Console ref
  const consoleRef = useRef<HTMLDivElement>(null);

  // Auto-check timer ref (複数回のタイマー設定を防ぐ)
  const autoCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AP接続関連のState
  const [apSectionExpanded, setApSectionExpanded] = useState(false);
  const [wifiList, setWifiList] = useState<WiFiEntry[]>([]);
  const [selectedWifi, setSelectedWifi] = useState<string | null>(null);
  const [newWifiSsid, setNewWifiSsid] = useState('');
  const [newWifiPassword, setNewWifiPassword] = useState('');
  const [isLoadingWifi, setIsLoadingWifi] = useState(false);
  const [wifiMessage, setWifiMessage] = useState('');
  const [deviceUuid, setDeviceUuid] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [originalDeviceName, setOriginalDeviceName] = useState('');

  // 固定IP情報（表示用のみ）
  const [staticIp, setStaticIp] = useState('');
  const [gateway, setGateway] = useState('');
  const [subnet, setSubnet] = useState('');

  // OTA設定関連のState
  const [serverMode, setServerMode] = useState<CompileServerMode>('cloud');
  const [selectedOtaDevice, setSelectedOtaDevice] = useState<DigiCodeDevice | null>(null);

  // コンソール自動スクロール
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

  // 初期化とクリーンアップ
  useEffect(() => {
    if (open) {
      setServerMode(compileService.getMode());
    }
    // ダイアログが閉じられる時にタイマーをクリア
    return () => {
      if (autoCheckTimerRef.current) {
        clearTimeout(autoCheckTimerRef.current);
        autoCheckTimerRef.current = null;
      }
    };
  }, [open]);

  // シリアル接続時にWiFi一覧を読み込み、WiFi接続されていれば自動的にIP固定化
  useEffect(() => {
    if (serialStatus === 'connected' && open) {
      const timer = setTimeout(async () => {
        await loadDeviceName();
        const wifiEntries = await loadWiFiList();

        // WiFi接続が確認できたら自動的にIP固定化（再起動時のIPバッティング回避）
        const isWifiConnected = wifiEntries.some(w => w.isConnected);
        if (isWifiConnected) {
          console.log('[AUTO-IP] WiFi connected detected on serial connection. Auto-fixing IP...');

          // 少し待ってからIP固定化を実行
          setTimeout(async () => {
            try {
              const startIndex = useSerialStore.getState().output.length;
              await send('USE_CURRENT_IP\n');
              await new Promise(resolve => setTimeout(resolve, 500));

              // 固定IP情報を取得
              await send('GET_CONFIG\n');
              await waitForResponse('OK:UUID=', startIndex, 5000);

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
                console.log('[AUTO-IP] Static IP set:', foundIp);

                // デバイスストアを更新
                const currentOutput = useSerialStore.getState().output;
                const currentDeviceUuid = [...currentOutput]
                  .reverse()
                  .find(line => line.includes('Device UUID:'))
                  ?.match(/Device UUID:\s*(.+)/)?.[1]?.trim();

                const currentDeviceName = [...currentOutput]
                  .reverse()
                  .find(line => line.includes('Device Name:'))
                  ?.match(/Device Name:\s*(.+)/)?.[1]?.trim();

                if (currentDeviceUuid && currentDeviceName) {
                  addDevice({
                    uuid: currentDeviceUuid,
                    name: currentDeviceName,
                    ssid: wifiEntries.find(w => w.isConnected)?.ssid || '',
                    lastConnected: new Date().toISOString(),
                    ipAddress: foundIp,
                    gateway: foundGateway,
                    subnet: foundSubnet,
                  });
                  console.log('[AUTO-IP] Device store updated:', currentDeviceUuid, foundIp);
                }
              }
            } catch (error) {
              console.error('[AUTO-IP] Failed to set static IP:', error);
            }
          }, 1000);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (serialStatus !== 'connected') {
      setWifiList([]);
      setWifiMessage('');
      setSelectedWifi(null);
      setNewWifiSsid('');
      setNewWifiPassword('');
      setDeviceName('');
      setOriginalDeviceName('');
    }
  }, [serialStatus, open]);

  // サーバーモード変更
  const handleServerModeChange = (mode: CompileServerMode) => {
    setServerMode(mode);
    compileService.setMode(mode);
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

  // 応答を待つヘルパー関数
  const waitForResponse = async (keyword: string, startIndex: number, maxWaitMs: number = 10000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const currentOutput = useSerialStore.getState().output;
      const newOutput = currentOutput.slice(startIndex);
      if (newOutput.some(line => line.includes(keyword))) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return false;
  };

  // WiFi一覧を読み込み
  const loadWiFiList = async (): Promise<WiFiEntry[]> => {
    if (serialStatus !== 'connected') return [];

    setIsLoadingWifi(true);
    setWifiMessage(t('device.loadingWifi', { defaultValue: 'WiFi設定を読み込み中...' }));

    try {
      const startIndex = useSerialStore.getState().output.length;
      await send('LIST_WIFI\n');
      const gotResponse = await waitForResponse('OK:WIFI_LIST_SHOWN', startIndex, 10000);

      if (!gotResponse) {
        setWifiMessage(t('device.loadWifiTimeout', { defaultValue: 'WiFi読み込みタイムアウト' }));
        setIsLoadingWifi(false);
        return;
      }

      const currentOutput = useSerialStore.getState().output;
      // startIndex以降の出力だけを見る（古いWiFiリストを除外）
      const newOutput = currentOutput.slice(startIndex);

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

        const connectedWifi = uniqueWifi.find(w => w.isConnected);
        if (connectedWifi) {
          setSelectedWifi(connectedWifi.ssid);
        } else if (uniqueWifi.length > 0) {
          setSelectedWifi(uniqueWifi[0].ssid);
        }
        return uniqueWifi;
      } else {
        setWifiList([]);
        setWifiMessage(t('device.noWifiSaved', { defaultValue: '保存済みのWiFiがありません' }));
        return [];
      }
    } catch (error) {
      console.error('Load WiFi list error:', error);
      setWifiMessage(t('device.loadWifiFailed', { defaultValue: 'WiFi読み込み失敗' }));
      return [];
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイス名と固定IP情報を読み込み
  const loadDeviceName = async () => {
    if (serialStatus !== 'connected') return;

    try {
      let foundName = '';
      let foundUuid = '';
      let foundStaticIp = '';
      let foundGateway = '';
      let foundSubnet = '';

      for (let i = 0; i < 5; i++) {
        const currentOutput = useSerialStore.getState().output;

        // 最新のUUID（"Device UUID:" の行）を探す（古いログの影響を避けるため逆順検索）
        const uuidLine = [...currentOutput].reverse().find(line => line.includes('Device UUID:'));
        if (uuidLine) {
          const uuidMatch = uuidLine.match(/Device UUID:\s*(.+)/i);
          if (uuidMatch && uuidMatch[1].trim()) {
            foundUuid = uuidMatch[1].trim();
          }
        }

        // 最新のデバイス名を探す（逆順検索）
        const nameLine = [...currentOutput].reverse().find(line => line.includes('Device Name:'));
        if (nameLine) {
          const match = nameLine.match(/Device Name:\s*(.+)/i);
          if (match && match[1].trim()) {
            foundName = match[1].trim();
          }
        }

        if (foundName && foundUuid) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // UUIDが "robot001" の場合は新しいランダムUUIDを生成して送信
      if (foundUuid === 'robot001') {
        const newUuid = generateRandomUuid();
        console.log(`[UUID] Detected default UUID "robot001", generating new UUID: ${newUuid}`);

        try {
          await send(`SET_UUID:${newUuid}\n`);
          await new Promise(resolve => setTimeout(resolve, 200));

          // 送信後、新しいUUIDを状態に反映
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
      }

      // GET_CONFIGで固定IP情報を取得
      try {
        const startIndex = useSerialStore.getState().output.length;
        await send('GET_CONFIG\n');
        await waitForResponse('OK:UUID=', startIndex, 3000);

        const newOutput = useSerialStore.getState().output.slice(startIndex);
        for (const line of newOutput) {
          if (line.includes('OK:STATIC_IP=')) {
            foundStaticIp = line.split('OK:STATIC_IP=')[1]?.trim() || '';
          } else if (line.includes('OK:GATEWAY=')) {
            foundGateway = line.split('OK:GATEWAY=')[1]?.trim() || '';
          } else if (line.includes('OK:SUBNET=')) {
            foundSubnet = line.split('OK:SUBNET=')[1]?.trim() || '';
          }
        }

        if (foundStaticIp) setStaticIp(foundStaticIp);
        if (foundGateway) setGateway(foundGateway);
        if (foundSubnet) setSubnet(foundSubnet);
      } catch (error) {
        console.error('[loadDeviceName] Failed to get static IP config:', error);
      }
    } catch (error) {
      console.error('Load device name error:', error);
    }
  };

  // WiFiを削除
  const handleRemoveWiFi = async (ssid: string) => {
    if (!confirm(t('device.confirmDeleteWifi', { ssid, defaultValue: `${ssid}を削除しますか？` }))) {
      return;
    }

    setIsLoadingWifi(true);
    try {
      await send(`REMOVE_WIFI:${ssid}\n`);
      await new Promise(resolve => setTimeout(resolve, 500));
      if (selectedWifi === ssid) setSelectedWifi(null);
      await loadWiFiList();
    } catch (error) {
      console.error('Remove WiFi error:', error);
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // AP設定を保存（DHCP IPを自動的に固定化）
  const handleSaveApSettings = async () => {
    const hasNewWifi = newWifiSsid.trim() && newWifiPassword.trim();
    if (!selectedWifi && !hasNewWifi) {
      setWifiMessage(t('device.selectOrEnterWifi', { defaultValue: 'WiFiを選択または入力してください' }));
      return;
    }

    setIsLoadingWifi(true);
    try {
      let needsSaveConfig = false;

      // デバイス名を変更
      if (deviceName.trim() && deviceName.trim() !== originalDeviceName) {
        await send(`SET_NAME:${deviceName.trim()}\n`);
        await new Promise(resolve => setTimeout(resolve, 100));
        needsSaveConfig = true;
      }

      // WiFiを追加
      if (hasNewWifi) {
        await send(`ADD_WIFI:${newWifiSsid.trim()},${newWifiPassword.trim()}\n`);
        await new Promise(resolve => setTimeout(resolve, 500));
        needsSaveConfig = true;
      }

      // 設定を保存
      if (needsSaveConfig) {
        await send(`SAVE_CONFIG\n`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // ESP32をリセット
      await new Promise(resolve => setTimeout(resolve, 500));
      await resetESP32();

      setNewWifiSsid('');
      setNewWifiPassword('');

      // WiFi接続成功 + 固定IP設定を待つ
      const autoCheckDelayMs = 10000; // ESP32起動 + WiFi接続完了を待つ
      setWifiMessage(t('device.savedRestartingForWifi', { defaultValue: `WiFi設定を保存しました。${autoCheckDelayMs / 1000}秒後に接続確認とIP固定化を行います...` }));

      // 既存のタイマーをクリア
      if (autoCheckTimerRef.current) {
        clearTimeout(autoCheckTimerRef.current);
        autoCheckTimerRef.current = null;
      }

      // WiFi接続確認 + DHCP IP自動固定化
      autoCheckTimerRef.current = setTimeout(async () => {
        console.log('[AUTO-CHECK] Auto-checking connection and setting static IP...');
        await handleCheckConnection();
        autoCheckTimerRef.current = null;
      }, autoCheckDelayMs);
    } catch (error) {
      console.error('Save settings error:', error);
      setWifiMessage(t('device.settingsSaveFailed', { defaultValue: '設定の保存に失敗しました' }));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // 接続状態を確認し、WiFi接続成功時は自動的にDHCP IPを固定化
  const handleCheckConnection = async () => {
    setIsLoadingWifi(true);
    setWifiMessage(t('device.checkingConnection', { defaultValue: '接続状態を確認中...' }));
    try {
      await loadDeviceName();
      const wifiEntries = await loadWiFiList();

      // WiFi接続を確認（loadWiFiListの戻り値から判定）
      const isWifiConnected = wifiEntries.some(w => w.isConnected);

      console.log('[handleCheckConnection] WiFi entries:', wifiEntries);
      console.log('[handleCheckConnection] Is WiFi connected:', isWifiConnected);

      if (isWifiConnected) {
        // 自動的にDHCP IPを固定化
        setWifiMessage(t('device.settingStaticIp', { defaultValue: 'WiFi接続成功。DHCPで取得したIPを固定化中...' }));

        const startIndex = useSerialStore.getState().output.length;
        await send('USE_CURRENT_IP\n');
        await new Promise(resolve => setTimeout(resolve, 500));

        // 固定IP情報を取得
        await send('GET_CONFIG\n');
        await waitForResponse('OK:UUID=', startIndex, 5000);

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

          // デバイスストアを更新
          if (deviceUuid && deviceName) {
            addDevice({
              uuid: deviceUuid,
              name: deviceName,
              ssid: wifiEntries.find(w => w.isConnected)?.ssid || '',
              lastConnected: new Date().toISOString(),
              ipAddress: foundIp,
              gateway: foundGateway,
              subnet: foundSubnet,
            });
          }

          setWifiMessage(t('device.staticIpSet', { ip: foundIp, defaultValue: `固定IP設定完了: ${foundIp}` }));
        } else {
          setWifiMessage(t('device.connectionChecked', { defaultValue: '接続状態を更新しました' }));
        }
      } else {
        setWifiMessage(t('device.connectionChecked', { defaultValue: '接続状態を更新しました' }));
      }
    } catch (error) {
      console.error('Check connection error:', error);
      setWifiMessage(t('device.checkConnectionFailed', { defaultValue: '接続状態の確認に失敗しました' }));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイスリストをクリアして再読み込み
  const handleRefreshDevices = async () => {
    if (serialStatus !== 'connected') {
      alert(t('device.connectFirst', { defaultValue: 'まずUSB接続してください' }));
      return;
    }

    if (!confirm(t('device.confirmClearDevices', { defaultValue: 'デバイスリストをクリアして再読み込みしますか？' }))) {
      return;
    }

    // デバイスリストをクリア
    clearDevices();
    setSelectedOtaDevice(null);

    // 現在のデバイス情報を再読み込み
    await loadDeviceName();
    const wifiEntries = await loadWiFiList();

    // WiFi接続されていれば自動的にデバイスを登録
    const isWifiConnected = wifiEntries.some(w => w.isConnected);
    if (isWifiConnected && deviceUuid && deviceName && staticIp) {
      addDevice({
        uuid: deviceUuid,
        name: deviceName,
        ssid: wifiEntries.find(w => w.isConnected)?.ssid || '',
        lastConnected: new Date().toISOString(),
        ipAddress: staticIp,
        gateway: gateway,
        subnet: subnet,
      });
      console.log('[REFRESH] Device list refreshed and current device added');
    }
  };

  // OTAデバイス選択
  const handleOtaDeviceSelect = async (device: DigiCodeDevice) => {
    setSelectedOtaDevice(device);

    // deviceStoreに追加
    addDevice({
      uuid: device.uuid,
      name: device.name,
      ssid: '',
      lastConnected: new Date().toISOString(),
      ipAddress: device.ipAddress
    });

    // WiFiストアに設定
    setHost(device.ipAddress);
    setWifiDeviceName(device.name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-purple-500" />
            {t('otaSetup.title', { defaultValue: 'OTA接続設定' })}
          </DialogTitle>
          <DialogDescription>
            {t('otaSetup.description', { defaultValue: 'コンパイル＆書き込みの設定を行います' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 0: AP接続設定（折りたたみ可能） */}
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-gray-500/10 dark:hover:bg-gray-800 rounded-t-lg"
              onClick={() => setApSectionExpanded(!apSectionExpanded)}
            >
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 text-xs font-bold">0</span>
                  {t('otaSetup.step0.title', { defaultValue: 'AP接続設定（初回設定）' })}
                </div>
                {apSectionExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('otaSetup.step0.description', { defaultValue: 'デバイスのWiFi接続を設定（USBケーブル必要）' })}
              </CardDescription>
            </CardHeader>

            {apSectionExpanded && (
              <CardContent className="pt-0 space-y-4">
                {/* USB接続 */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('device.usbConnection', { defaultValue: 'USB接続' })}</Label>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-[#0D1117]">
                    <div className="flex items-center gap-3">
                      <Usb className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">
                          {serialStatus === 'connected' ? t('device.connectedToEsp32', { defaultValue: 'ESP32に接続中' }) :
                           serialStatus === 'connecting' ? t('device.processing', { defaultValue: '処理中...' }) :
                           t('device.connectEsp32Usb', { defaultValue: 'ESP32をUSBで接続' })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            serialStatus === 'connected' ? 'bg-green-500' :
                            serialStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-xs text-gray-500">
                            {serialStatus === 'connected' ? t('device.connected', { defaultValue: '接続済み' }) :
                             serialStatus === 'connecting' ? t('device.processing', { defaultValue: '処理中...' }) :
                             t('device.disconnected', { defaultValue: '未接続' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {serialStatus === 'connected' ? (
                      <Button variant="outline" size="sm" onClick={async () => await disconnectSerial()}>
                        {t('device.disconnect', { defaultValue: '切断' })}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={async () => await connectSerial()} disabled={serialStatus === 'connecting' || !serialSupported}>
                        {serialStatus === 'connecting' ? t('device.connecting', { defaultValue: '接続中...' }) : t('device.connect', { defaultValue: '接続' })}
                      </Button>
                    )}
                  </div>
                </div>

                {/* コンソール出力（USB接続時のみ表示） */}
                {serialStatus === 'connected' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">{t('device.console', { defaultValue: 'コンソール' })}</Label>
                    <div
                      ref={consoleRef}
                      className="bg-[#0D1117] border border-gray-700 rounded-lg p-3 h-32 overflow-y-auto font-mono text-xs"
                    >
                      {output.length > 0 ? (
                        output.slice(-50).map((line, index) => (
                          <div key={index} className={`whitespace-pre-wrap ${
                            line.includes('ERROR') ? 'text-red-400' :
                            line.includes('OK:') ? 'text-green-400' :
                            line.includes('INFO:') ? 'text-blue-400' :
                            'text-gray-300'
                          }`}>
                            {line}
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500">{t('device.waitingForOutput', { defaultValue: '出力を待機中...' })}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* WiFi設定（USB接続時のみ表示） */}
                {serialStatus === 'connected' && (
                  <>
                    {/* 保存済みWiFi一覧 */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">{t('device.accessPointSelect', { defaultValue: 'アクセスポイント選択' })}</Label>
                      {wifiList.length > 0 && (
                        <div className="space-y-1">
                          {wifiList.map((wifi, index) => (
                            <div
                              key={index}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                selectedWifi === wifi.ssid
                                  ? 'bg-blue-600/20 border-2 border-blue-500'
                                  : 'bg-[#161B22] border border-gray-700 hover:bg-[#21262D]'
                              }`}
                              onClick={() => {
                                setSelectedWifi(wifi.ssid);
                                setNewWifiSsid('');
                                setNewWifiPassword('');
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Wifi className={`w-4 h-4 ${selectedWifi === wifi.ssid ? 'text-blue-400' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium">{wifi.ssid}</span>
                                {wifi.isConnected && (
                                  <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                                    {t('device.wifiConnected', { defaultValue: '接続中' })}
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
                      )}

                      {/* 新規WiFi入力 */}
                      {wifiList.length < 5 && (
                        <div className="space-y-2 mt-3">
                          <Label className="text-xs text-gray-500">
                            {wifiList.length > 0 ? t('device.newWifiConnect', { defaultValue: '新しいWiFiを追加' }) : t('device.wifiToConnect', { defaultValue: '接続するWiFi' })}
                          </Label>
                          <Input
                            placeholder={t('device.wifiSsidPlaceholder', { defaultValue: 'WiFi名（SSID）' })}
                            value={newWifiSsid}
                            onChange={(e) => {
                              setNewWifiSsid(e.target.value);
                              if (e.target.value) setSelectedWifi(null);
                            }}
                            disabled={isLoadingWifi}
                            className="text-sm h-9"
                          />
                          <Input
                            type="password"
                            placeholder={t('device.wifiPasswordPlaceholder', { defaultValue: 'パスワード' })}
                            value={newWifiPassword}
                            onChange={(e) => setNewWifiPassword(e.target.value)}
                            disabled={isLoadingWifi}
                            className="text-sm h-9"
                          />
                        </div>
                      )}

                      {isLoadingWifi && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t('common.loading', { defaultValue: '読み込み中...' })}
                        </div>
                      )}
                    </div>

                    {/* デバイス名入力 */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">{t('device.deviceNameStep', { defaultValue: 'デバイス名' })}</Label>
                      <Input
                        placeholder={t('device.deviceNamePlaceholder', { defaultValue: 'デバイス名を入力' })}
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>

                    {/* 固定IP情報（自動設定） */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">{t('device.staticIpInfo', { defaultValue: '固定IP情報' })}</Label>

                      {staticIp ? (
                        <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">{t('device.fixedIp', { defaultValue: '固定IP:' })}</span>
                              <span className="font-mono font-bold text-green-700 dark:text-green-300">{staticIp}</span>
                            </div>
                            {gateway && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t('device.gateway', { defaultValue: 'ゲートウェイ:' })}</span>
                                <span className="font-mono text-gray-700 dark:text-gray-300">{gateway}</span>
                              </div>
                            )}
                            {subnet && (
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">{t('device.subnet', { defaultValue: 'サブネット:' })}</span>
                                <span className="font-mono text-gray-700 dark:text-gray-300">{subnet}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('device.staticIpAutoSet', { defaultValue: 'WiFi接続後、DHCPで取得したIPが自動的に固定されます' })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* メッセージ */}
                    {wifiMessage && (
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <AlertCircle className="w-4 h-4" />
                        {wifiMessage}
                      </div>
                    )}

                    {/* 保存ボタン */}
                    <Button
                      onClick={handleSaveApSettings}
                      disabled={isLoadingWifi || (!selectedWifi && !(newWifiSsid.trim() && newWifiPassword.trim()))}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      {wifiList.some(w => w.isConnected)
                        ? t('device.saveSettings', { defaultValue: '設定を保存して再起動' })
                        : t('device.saveWifiAndRestart', { defaultValue: 'WiFi設定を保存して再起動' })}
                    </Button>

                    {/* 接続確認ボタン */}
                    <Button
                      onClick={handleCheckConnection}
                      disabled={isLoadingWifi}
                      variant="outline"
                      className="w-full"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingWifi ? 'animate-spin' : ''}`} />
                      {t('device.checkConnection', { defaultValue: '接続状態を確認' })}
                    </Button>
                  </>
                )}
              </CardContent>
            )}
          </Card>

          {/* Step 1: コンパイルサーバー選択 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">1</span>
                {t('otaSetup.step1.title', { defaultValue: 'コンパイルサーバー' })}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('otaSetup.step1.description', { defaultValue: 'コードをコンパイルするサーバーを選択' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleServerModeChange('cloud')}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    serverMode === 'cloud'
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <Cloud className={`w-5 h-5 ${serverMode === 'cloud' ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className={`font-medium text-sm ${serverMode === 'cloud' ? 'text-blue-600' : ''}`}>
                      {t('otaSetup.server.cloud', { defaultValue: 'クラウド' })}
                    </div>
                    <div className="text-xs text-gray-500">{t('otaSetup.server.cloudDesc', { defaultValue: '推奨' })}</div>
                  </div>
                  {serverMode === 'cloud' && <Check className="w-4 h-4 text-blue-600 ml-auto" />}
                </button>

                <button
                  onClick={() => handleServerModeChange('local')}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    serverMode === 'local'
                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  }`}
                >
                  <Server className={`w-5 h-5 ${serverMode === 'local' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className={`font-medium text-sm ${serverMode === 'local' ? 'text-purple-600' : ''}`}>
                      {t('otaSetup.server.local', { defaultValue: 'ローカル' })}
                    </div>
                    <div className="text-xs text-gray-500">{t('otaSetup.server.localDesc', { defaultValue: '無制限' })}</div>
                  </div>
                  {serverMode === 'local' && <Check className="w-4 h-4 text-purple-600 ml-auto" />}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: 書込み先デバイス選択 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">2</span>
                  {t('otaSetup.step2.title', { defaultValue: '書込み先デバイス' })}
                </CardTitle>
                <Button
                  onClick={handleRefreshDevices}
                  disabled={serialStatus !== 'connected'}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  {t('device.refreshDevices', { defaultValue: '再読み込み' })}
                </Button>
              </div>
              <CardDescription className="text-xs">
                {t('otaSetup.step2.descriptionSaved', { defaultValue: 'AP接続設定で登録したデバイスを選択' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* 保存済みデバイス一覧 */}
                {devices.length > 0 ? (
                  <div className="space-y-2">
                    {devices.map((device) => (
                      <button
                        key={device.uuid}
                        onClick={() => device.ipAddress && handleOtaDeviceSelect({
                          name: device.name,
                          ipAddress: device.ipAddress,
                          uuid: device.uuid,
                          url: `http://${device.ipAddress}`
                        })}
                        disabled={!device.ipAddress}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          !device.ipAddress
                            ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950 opacity-60 cursor-not-allowed'
                            : selectedOtaDevice?.uuid === device.uuid
                              ? 'border-green-400 bg-green-50 dark:bg-green-950'
                              : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-medium text-sm">{device.name}</div>
                          <div className="text-xs text-gray-500">
                            {device.ipAddress || t('otaSetup.noStaticIp', { defaultValue: '固定IP未設定（AP接続設定で設定してください）' })}
                          </div>
                        </div>
                        {device.ipAddress && selectedOtaDevice?.uuid === device.uuid && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                        {!device.ipAddress && (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">
                    <Wifi className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>{t('otaSetup.noSavedDevices', { defaultValue: 'デバイスが登録されていません' })}</p>
                    <p className="text-xs mt-1">{t('otaSetup.registerDeviceHint', { defaultValue: '上の「AP接続設定」でデバイスを登録してください' })}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* フッター */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-500">
              {selectedOtaDevice ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4" />
                  {selectedOtaDevice.name} {t('otaSetup.selected', { defaultValue: 'を選択中' })}
                </span>
              ) : (
                t('otaSetup.noDeviceSelected', { defaultValue: 'デバイス未選択' })
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.close', { defaultValue: '閉じる' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
