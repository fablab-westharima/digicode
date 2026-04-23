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
import { Trash2, AlertCircle, Terminal, Wifi, Usb, Check } from 'lucide-react';

interface WifiSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WiFiEntry {
  ssid: string;
  isConnected: boolean;
  staticIp?: string;
  gateway?: string;
  subnet?: string;
}

export function WifiSetupDialog({ open, onOpenChange }: WifiSetupDialogProps) {
  const { t } = useTranslation();
  const { status, isSupported, connect, disconnect, send, output, clearOutput, resetESP32 } = useSerialStore();

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
  const [deviceName, setDeviceName] = useState('');
  const [originalDeviceName, setOriginalDeviceName] = useState('');
  const [isLoadingDeviceName, setIsLoadingDeviceName] = useState(false);
  const [deviceNameError, setDeviceNameError] = useState<string | null>(null);

  // デバイス名バリデーション関数
  const validateDeviceName = (name: string): { valid: boolean; error?: string } => {
    // 空の場合は必須エラー
    if (!name || !name.trim()) {
      return { valid: false, error: 'required' };
    }
    // 長さチェック（1〜32文字）
    if (name.length > 32) {
      return { valid: false, error: 'tooLong' };
    }
    // 使用可能文字チェック（英数字とハイフンのみ）
    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      return { valid: false, error: 'invalidChars' };
    }
    // 先頭ハイフンチェック
    if (name.startsWith('-')) {
      return { valid: false, error: 'startWithHyphen' };
    }
    // 末尾ハイフンチェック
    if (name.endsWith('-')) {
      return { valid: false, error: 'endWithHyphen' };
    }
    return { valid: true };
  };

  // デバイス名変更時のバリデーション
  const handleDeviceNameChange = (value: string) => {
    setDeviceName(value);
    if (value) {
      const result = validateDeviceName(value);
      if (!result.valid && result.error) {
        setDeviceNameError(result.error);
      } else {
        setDeviceNameError(null);
      }
    } else {
      setDeviceNameError('required');
    }
  };

  // 固定IP情報（表示用）
  const [staticIp, setStaticIp] = useState('');
  const [gateway, setGateway] = useState('');
  const [subnet, setSubnet] = useState('');

  // ESP32起動完了フラグ
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  // 接続後リセット済みフラグ
  const hasResetOnConnect = useRef(false);

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

  // USB接続後に一度リセットをかける（ファームウェア書き込み直後対策）
  useEffect(() => {
    if (status === 'connected' && open && !hasResetOnConnect.current) {
      hasResetOnConnect.current = true;
      console.log('[WifiSetupDialog] Resetting ESP32 after connection');
      setWifiMessage(t('device.nameDialog.status.resetting', { defaultValue: 'ESP32をリセット中...' }));
      resetESP32();
    }
  }, [status, open, resetESP32, t]);

  // ESP32起動完了を検知（"System Ready!" を監視）
  useEffect(() => {
    if (status === 'connected' && !isDeviceReady) {
      const lastOutputs = output.slice(-20).join('\n');
      if (lastOutputs.includes('System Ready!') || lastOutputs.includes('User setup completed')) {
        console.log('[WifiSetupDialog] ESP32 ready detected');
        setIsDeviceReady(true);
      }
    }
  }, [output, status, isDeviceReady]);

  // ESP32起動完了後にデバイス情報を読み込み
  useEffect(() => {
    if (status === 'connected' && open && isDeviceReady) {
      const loadInfo = async () => {
        console.log('[WifiSetupDialog] Loading device info after ready');
        await loadDeviceName();
        await loadWiFiList();
      };
      loadInfo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeviceReady, open]);

  // 切断時に状態をリセット
  useEffect(() => {
    if (status !== 'connected') {
      setIsDeviceReady(false);
      hasResetOnConnect.current = false;
      setWifiList([]);
      setWifiMessage('');
      setSelectedWifi(null);
      setNewWifiSsid('');
      setNewWifiPassword('');
      setDeviceName('');
      setOriginalDeviceName('');
      // 注意: staticIp, gateway, subnetはクリアしない
      // deviceStore（localStorage）のキャッシュは意図的に残す設計
      // ヘッダーメニューからデバイス選択してOTA書込みするために必要
    }
  }, [status]);

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

          // [Static: xxx] をパース
          const staticMatch = trimmed.match(/\[Static:\s*([^\]]+)\]/);
          const staticIp = staticMatch ? staticMatch[1].trim() : undefined;

          return { ssid, isConnected, staticIp };
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

          // 接続中WiFiの固定IP情報をstateに設定（GET_CONFIGのバックアップ）
          if (connectedWifi.staticIp) {
            console.log('[loadWiFiList] Found static IP from LIST_WIFI:', connectedWifi.staticIp);
            setStaticIp(connectedWifi.staticIp);
            // gateway/subnetはLIST_WIFIには含まれないため、GET_CONFIGから取得済みの値を維持
            // または、後続のGET_CONFIGで上書きされる
          }
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
          await send(`SET_UUID:${newUuid}\n`);
          await new Promise(resolve => setTimeout(resolve, 200));

          // 送信後、新しいUUIDをローカル変数に反映
          foundUuid = newUuid;

          // SAVE_CONFIGを送信して永続化
          await send('SAVE_CONFIG\n');
          await new Promise(resolve => setTimeout(resolve, 200));

          console.log(`[UUID] Successfully set new UUID: ${newUuid}`);
        } catch (error) {
          console.error('[UUID] Failed to set new UUID:', error);
        }
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

          // 固定IP情報があり、デバイス情報も揃っていれば返す
          if (foundUuid && foundName && foundSsid) {
            return {
              uuid: foundUuid,
              name: foundName,
              ip: foundStaticIp,
              gateway: foundGateway,
              subnet: foundSubnet,
              ssid: foundSsid,
            };
          }
        } else {
          // WiFi未接続時は古いIP情報をクリア
          setStaticIp('');
          setGateway('');
          setSubnet('');
        }
      } else {
        // タイムアウト時（Flash消去後など）も古いIP情報をクリア
        setStaticIp('');
        setGateway('');
        setSubnet('');
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

    // デバイス名バリデーション
    if (!deviceName.trim()) {
      setWifiMessage(t('device.deviceNameError.required', { defaultValue: 'デバイス名を入力してください' }));
      return;
    }
    const validation = validateDeviceName(deviceName.trim());
    if (!validation.valid) {
      setWifiMessage(t(`device.deviceNameError.${validation.error}`, { defaultValue: '無効なデバイス名です' }));
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

      // 新規WiFiがある場合は接続テスト付きで追加
      if (hasNewWifi) {
        setWifiMessage(t('device.testingWifiConnection'));
        const addWifiStartIndex = useSerialStore.getState().output.length;
        await send(`ADD_WIFI:${newWifiSsid.trim()},${newWifiPassword.trim()}\n`);

        // 接続テスト結果を待つ（最大15秒）
        const checkResult = async (): Promise<'success' | 'failed' | 'timeout'> => {
          const maxWait = 15000;
          const checkInterval = 200;
          let elapsed = 0;

          while (elapsed < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsed += checkInterval;

            const currentOutput = useSerialStore.getState().output;
            const newLines = currentOutput.slice(addWifiStartIndex).join('\n');

            if (newLines.includes('OK:WIFI_ADDED:CONNECTED')) {
              return 'success';
            }
            if (newLines.includes('ERROR:WIFI_TEST_FAILED')) {
              return 'failed';
            }
          }
          return 'timeout';
        };

        const result = await checkResult();

        if (result === 'failed') {
          // 接続テスト失敗 - エラー表示して中断
          const currentOutput = useSerialStore.getState().output;
          const newLines = currentOutput.slice(addWifiStartIndex).join('\n');
          let errorReason = 'Unknown error';
          if (newLines.includes('SSID not found')) {
            errorReason = t('device.wifiErrorSsidNotFound');
          } else if (newLines.includes('Wrong password')) {
            errorReason = t('device.wifiErrorWrongPassword');
          }
          setWifiMessage(`❌ ${t('device.wifiConnectionFailed')}: ${errorReason}`);
          console.error('[saveAndRestart] WiFi connection test failed');
          return;
        }

        if (result === 'timeout') {
          setWifiMessage(`❌ ${t('device.wifiConnectionTimeout')}`);
          console.error('[saveAndRestart] WiFi connection test timeout');
          return;
        }

        // 接続成功
        setWifiMessage(t('device.wifiConnectionSuccess'));
        needsSaveConfig = true;
      }

      // 設定を保存（SAVE_CONFIGでフラッシュに書き込み）
      if (needsSaveConfig) {
        setWifiMessage(t('device.savingToFlash'));
        await send(`SAVE_CONFIG\n`);
        // Flash書き込み完了を待つ（1秒）
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setWifiMessage(t('device.savedRestartingEsp32'));

      // ESP32を自動リセット
      setIsDeviceReady(false);
      await resetESP32();

      // リセット後、"System Ready!" を待つ（最大30秒）
      setWifiMessage(t('device.waitingForRestart'));
      const startIndex = useSerialStore.getState().output.length;
      const ready = await waitForResponse('System Ready!', startIndex, 30000);

      if (!ready) {
        console.warn('[saveAndRestart] System Ready! timeout');
        setWifiMessage(t('wifiSetup.bootTimeout', { defaultValue: 'ESP32の起動がタイムアウトしました' }));
        return;
      }

      setIsDeviceReady(true);
      console.log('[saveAndRestart] System Ready! detected');

      // デバイス名とWiFi一覧を再読み込みしてUIを更新
      setWifiMessage(t('device.updatingInfo'));
      await loadDeviceName();
      const wifiEntries = await loadWiFiList();

      // WiFi接続成功時は自動的にDHCP IPを固定化
      const isWifiConnected = wifiEntries.some(w => w.isConnected);
      if (isWifiConnected) {
        setWifiMessage(t('wifiSetup.connectingSuccess', { defaultValue: 'WiFi接続成功。DHCPで取得したIPを固定化中...' }));
        await autoSetStaticIp();
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
  const isStep3Complete = deviceName.trim().length > 0 && !deviceNameError;

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
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
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

          {/* ESP32起動待ち中 */}
          {status === 'connected' && !isDeviceReady && (
            <div className="p-4 rounded-lg border-2 border-yellow-600/50 bg-yellow-900/20">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">{t('device.nameDialog.waitingForBoot', { defaultValue: 'ESP32起動待ち中...' })}</p>
                  <p className="text-xs text-[#8B949E]">{t('wifiSetup.waitingSystemReady', { defaultValue: '「System Ready!」を検知するまでお待ちください' })}</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: アクセスポイント選択 */}
          {status === 'connected' && isDeviceReady && (
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
          {status === 'connected' && isDeviceReady && (
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
                    onChange={(e) => handleDeviceNameChange(e.target.value)}
                    disabled={isLoadingDeviceName}
                    className={`text-sm h-9 bg-[#161B22] border-[#2E333D] text-[#E6EDF3] ${
                      deviceNameError ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                  />

                  {/* mDNSホスト名プレビュー */}
                  {deviceName && !deviceNameError && (
                    <p className="text-xs text-green-400 mt-2 font-mono">
                      {t('device.mdnsPreview', { name: deviceName, defaultValue: 'mDNSホスト名: digicode-{{name}}.local' })}
                    </p>
                  )}

                  {/* バリデーションエラー表示 */}
                  {deviceNameError && (
                    <p className="text-xs text-red-400 mt-2">
                      {t(`device.deviceNameError.${deviceNameError}`, {
                        defaultValue: deviceNameError === 'required' ? 'デバイス名を入力してください' :
                                      deviceNameError === 'invalidChars' ? '英数字とハイフンのみ使用できます' :
                                      deviceNameError === 'startWithHyphen' ? '先頭にハイフンは使用できません' :
                                      deviceNameError === 'endWithHyphen' ? '末尾にハイフンは使用できません' :
                                      deviceNameError === 'tooLong' ? '32文字以内で入力してください' : ''
                      })}
                    </p>
                  )}

                  {/* 説明文（エラーがない場合のみ表示） */}
                  {!deviceNameError && (
                    <p className="text-xs text-[#8B949E] mt-2">
                      {t('device.deviceNameDesc')}
                    </p>
                  )}
                </div>

                {/* 固定IP情報の表示 */}
                {staticIp && (
                  <div className="pt-3 border-t border-[#2E333D]">
                    <Label className="text-xs text-[#8B949E] mb-2 block">{t('wifiSetup.staticIpConfirmed', { defaultValue: '固定IP設定（確定済み）' })}</Label>
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
                        {t('wifiSetup.staticIpAutoHint', { defaultValue: '💡 再起動時にリセットされ、DHCPで新規取得したIPが自動的に固定化されます' })}
                      </p>
                    </div>
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
          {status === 'connected' && isDeviceReady && (
            <Button
              onClick={handleSaveAndConnect}
              disabled={
                isLoadingWifi ||
                (!selectedWifi && !(newWifiSsid.trim() && newWifiPassword.trim())) ||
                !deviceName.trim() ||
                deviceNameError !== null
              }
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
