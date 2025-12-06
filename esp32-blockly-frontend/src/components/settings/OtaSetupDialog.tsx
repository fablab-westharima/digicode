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
  RefreshCw,
  Check,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Trash2,
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
  const { addDevice, devices } = useDeviceStore();

  // Console ref
  const consoleRef = useRef<HTMLDivElement>(null);

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

  // OTA設定関連のState
  const [serverMode, setServerMode] = useState<CompileServerMode>('cloud');
  const [selectedOtaDevice, setSelectedOtaDevice] = useState<DigiCodeDevice | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DigiCodeDevice[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // コンソール自動スクロール
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

  // 初期化
  useEffect(() => {
    if (open) {
      setServerMode(compileService.getMode());
    }
  }, [open]);

  // シリアル接続時にWiFi一覧を読み込み
  useEffect(() => {
    if (serialStatus === 'connected' && open && apSectionExpanded) {
      const timer = setTimeout(async () => {
        await loadDeviceName();
        await loadWiFiList();
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
  }, [serialStatus, open, apSectionExpanded]);

  // サーバーモード変更
  const handleServerModeChange = (mode: CompileServerMode) => {
    setServerMode(mode);
    compileService.setMode(mode);
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
  const loadWiFiList = async () => {
    if (serialStatus !== 'connected') return;

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
      } else {
        setWifiList([]);
        setWifiMessage(t('device.noWifiSaved', { defaultValue: '保存済みのWiFiがありません' }));
      }
    } catch (error) {
      console.error('Load WiFi list error:', error);
      setWifiMessage(t('device.loadWifiFailed', { defaultValue: 'WiFi読み込み失敗' }));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイス名を読み込み
  const loadDeviceName = async () => {
    if (serialStatus !== 'connected') return;

    try {
      let foundName = '';
      let foundUuid = '';
      for (let i = 0; i < 5; i++) {
        const currentOutput = useSerialStore.getState().output;

        const uuidLine = currentOutput.find(line => line.includes('UUID:'));
        if (uuidLine) {
          const uuidMatch = uuidLine.match(/UUID:\s*(.+)/i);
          if (uuidMatch && uuidMatch[1].trim()) {
            foundUuid = uuidMatch[1].trim();
          }
        }

        const nameLine = currentOutput.find(line =>
          line.includes('Name:') && !line.includes('Device Name:')
        ) || currentOutput.find(line => line.includes('Device Name:'));

        if (nameLine) {
          const match = nameLine.match(/Name:\s*(.+)/i);
          if (match && match[1].trim()) {
            foundName = match[1].trim();
          }
        }

        if (foundName && foundUuid) break;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (foundUuid) setDeviceUuid(foundUuid);
      if (foundName) {
        setDeviceName(foundName);
        setOriginalDeviceName(foundName);
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

  // AP設定を保存
  const handleSaveApSettings = async () => {
    const hasNewWifi = newWifiSsid.trim() && newWifiPassword.trim();
    if (!selectedWifi && !hasNewWifi) {
      setWifiMessage(t('device.selectOrEnterWifi', { defaultValue: 'WiFiを選択または入力してください' }));
      return;
    }

    setIsLoadingWifi(true);
    try {
      let needsSaveConfig = false;

      if (deviceName.trim() && deviceName.trim() !== originalDeviceName) {
        await send(`SET_NAME:${deviceName.trim()}\n`);
        await new Promise(resolve => setTimeout(resolve, 100));
        needsSaveConfig = true;
      }

      if (hasNewWifi) {
        await send(`ADD_WIFI:${newWifiSsid.trim()},${newWifiPassword.trim()}\n`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (needsSaveConfig) {
        await send(`SAVE_CONFIG\n`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

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

      await new Promise(resolve => setTimeout(resolve, 500));
      await resetESP32();

      setNewWifiSsid('');
      setNewWifiPassword('');
      setWifiMessage(t('device.savedAndRestarted', { defaultValue: '設定を保存し、デバイスを再起動しました' }));
    } catch (error) {
      console.error('Save settings error:', error);
      setWifiMessage(t('device.settingsSaveFailed', { defaultValue: '設定の保存に失敗しました' }));
    } finally {
      setIsLoadingWifi(false);
    }
  };

  // デバイス検索
  const searchDevices = async () => {
    setIsSearching(true);
    setSearchError(null);
    setDiscoveredDevices([]);

    try {
      // コンパイルサーバーのmDNS検索機能を使用
      const serverUrl = compileService.getServerUrl();
      const response = await fetch(`${serverUrl}/api/discover?timeout=5000`);

      if (response.ok) {
        const data = await response.json();
        if (data.devices && Array.isArray(data.devices)) {
          setDiscoveredDevices(data.devices);
        }
      } else {
        setSearchError('デバイス検索に失敗しました');
      }
    } catch (error) {
      console.error('Device search error:', error);
      setSearchError('デバイス検索中にエラーが発生しました');
    } finally {
      setIsSearching(false);
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
              className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-lg"
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
                      {t('device.saveSettings', { defaultValue: '設定を保存して再起動' })}
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
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">2</span>
                {t('otaSetup.step2.title', { defaultValue: '書込み先デバイス' })}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('otaSetup.step2.description', { defaultValue: 'WiFi経由で書き込むデバイスを選択' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={searchDevices}
                  disabled={isSearching}
                  className="w-full"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('otaSetup.searching', { defaultValue: '検索中...' })}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('otaSetup.searchDevices', { defaultValue: 'デバイスを検索' })}
                    </>
                  )}
                </Button>

                {searchError && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    {searchError}
                  </div>
                )}

                {discoveredDevices.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {discoveredDevices.map((device) => (
                      <button
                        key={device.uuid}
                        onClick={() => handleOtaDeviceSelect(device)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          selectedOtaDevice?.uuid === device.uuid
                            ? 'border-green-400 bg-green-50 dark:bg-green-950'
                            : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-medium text-sm">{device.name}</div>
                          <div className="text-xs text-gray-500">{device.ipAddress}</div>
                        </div>
                        {selectedOtaDevice?.uuid === device.uuid && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* 保存済みデバイス */}
                {devices.length > 0 && discoveredDevices.length === 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">{t('otaSetup.savedDevices', { defaultValue: '保存済みデバイス' })}</div>
                    {devices.slice(0, 3).map((device) => (
                      <button
                        key={device.uuid}
                        onClick={() => handleOtaDeviceSelect({
                          name: device.name,
                          ipAddress: device.ipAddress || '',
                          uuid: device.uuid,
                          url: `http://${device.ipAddress}`
                        })}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          selectedOtaDevice?.uuid === device.uuid
                            ? 'border-green-400 bg-green-50 dark:bg-green-950'
                            : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                        }`}
                      >
                        <div className="text-left">
                          <div className="font-medium text-sm">{device.name}</div>
                          <div className="text-xs text-gray-500">{device.ipAddress}</div>
                        </div>
                        {selectedOtaDevice?.uuid === device.uuid && (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                    ))}
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
