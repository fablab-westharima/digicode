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
  const { addDevice } = useDeviceStore();

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
        // デバイス名はブートログにあるので、LIST_WIFI送信前に取得
        await loadDeviceName();
        await loadWiFiList();
      }, 500);
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

  // WiFi一覧を読み込み
  const loadWiFiList = async () => {
    if (status !== 'connected') return;

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
        return;
      }

      // outputから最新の状態を取得
      const currentOutput = useSerialStore.getState().output;

      // WiFiエントリを含む行を探す: [数字] SSID (password: xxx)
      // 先頭の空白を許容し、trimして処理
      const wifiLines = currentOutput.filter(line => {
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
      } else {
        setWifiList([]);
        setWifiMessage(t('device.noWifiSaved'));
      }
    } catch (error) {
      console.error('Load WiFi list error:', error);
      setWifiMessage(t('device.loadWifiFailed'));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイス名を読み込み（コンソール出力からパース）
  const loadDeviceName = async () => {
    if (status !== 'connected') return;

    setIsLoadingDeviceName(true);

    try {
      // リトライ付きでデバイス名とUUIDを検索（ブート完了を待つため）
      let foundName = '';
      let foundUuid = '';
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

        if (foundName && foundUuid) break;

        // 見つからなければ500ms待ってリトライ
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (foundUuid) {
        setDeviceUuid(foundUuid);
      }
      if (foundName) {
        setDeviceName(foundName);
        setOriginalDeviceName(foundName);
      } else {
        setDeviceName('');
        setOriginalDeviceName('');
      }
    } catch (error) {
      console.error('Load device name error:', error);
    } finally {
      setIsLoadingDeviceName(false);
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
      await send(`REMOVE_WIFI:${ssid}\n`);
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

      // デバイスをdeviceStoreに登録（書込み先デバイスとして使えるように）
      const finalDeviceName = deviceName.trim() || originalDeviceName;
      const connectedSsid = selectedWifi || newWifiSsid.trim();
      if (deviceUuid && finalDeviceName) {
        addDevice({
          uuid: deviceUuid,
          name: finalDeviceName,
          ssid: connectedSsid,
          lastConnected: new Date().toISOString(),
        });
      }

      // ESP32を自動リセット
      await new Promise(resolve => setTimeout(resolve, 500));
      await resetESP32();

      // リセット後、ESP32の再起動を待ってからデバイス情報を再読み込み
      setWifiMessage(t('device.waitingForRestart'));
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒待つ

      // デバイス名とWiFi一覧を再読み込みしてUIを更新
      setWifiMessage(t('device.updatingInfo'));
      await loadDeviceName();
      await loadWiFiList();

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
              <div className="p-3 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
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
