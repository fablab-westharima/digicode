import { useState, useEffect, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Wifi, Plus, Trash2, RefreshCw, Circle, Users } from 'lucide-react';
import { firmwareService } from '@/services/firmwareService';
import { compileService } from '@/services/compileService';

export interface DigiCodeDevice {
  url: string;
  name: string;
  uuid: string;
  ipAddress: string;
  firmwareVersion: string;
  lastSeen: number;
  isOnline?: boolean;
}

interface DeviceSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (device: DigiCodeDevice) => void;
  multiSelect?: boolean;
  onSelectMultiple?: (devices: DigiCodeDevice[]) => void;
}

const STORAGE_KEY = 'digicode-known-devices';

// バックエンドのmDNS探索APIを呼び出す
interface DiscoveredDevice {
  hostname: string;
  ip: string;
  url: string;
  mdnsName: string;
}

async function discoverDevicesViaMdns(): Promise<DiscoveredDevice[]> {
  try {
    const serverUrl = compileService.getServerUrl();
    const response = await fetch(`${serverUrl}/api/discover?timeout=3000`);
    if (!response.ok) {
      console.error('mDNS discovery failed:', response.status);
      return [];
    }
    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('mDNS discovery error:', error);
    return [];
  }
}

// デバイス情報を取得
async function fetchDeviceInfo(url: string): Promise<DigiCodeDevice | null> {
  try {
    // デバイスのルートページからHTMLを取得
    const response = await fetch(url, {
      mode: 'cors',
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) return null;

    const html = await response.text();

    // HTMLからデバイス情報を抽出
    const nameMatch = html.match(/Device Name:\s*([^<]+)/);
    const uuidMatch = html.match(/Device UUID:\s*([^<]+)/);
    const ipMatch = html.match(/IP Address:\s*([^<]+)/);
    const versionMatch = html.match(/Firmware Version:\s*([^<]+)/);

    if (!nameMatch) return null;

    return {
      url,
      name: nameMatch[1].trim(),
      uuid: uuidMatch ? uuidMatch[1].trim() : 'unknown',
      ipAddress: ipMatch ? ipMatch[1].trim() : url.replace('http://', ''),
      firmwareVersion: versionMatch ? versionMatch[1].trim() : 'unknown',
      lastSeen: Date.now()
    };
  } catch (error) {
    console.log(`Device not found at ${url}:`, error);
    return null;
  }
}

export function DeviceSelectDialog({ open, onOpenChange, onSelect, multiSelect = false, onSelectMultiple }: DeviceSelectDialogProps) {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<DigiCodeDevice[]>(() => {
    // 初回 mount 時の localStorage 読み込みを useState 初期化子で実行
    // （以前は useEffect 内で setDevices しており set-state-in-effect を発生させていた）
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load saved devices:', e);
      return [];
    }
  });
  const [scanning, setScanning] = useState(false);
  const [newDeviceUrl, setNewDeviceUrl] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

  // 複数選択モードのトグル
  const toggleDeviceSelection = (url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  // 全デバイスを選択/解除
  const toggleSelectAll = () => {
    const onlineDevices = devices.filter(d => d.isOnline !== false);
    if (selectedUrls.size === onlineDevices.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(onlineDevices.map(d => d.url)));
    }
  };

  // 複数デバイスを確定
  const confirmMultiSelect = () => {
    if (onSelectMultiple && selectedUrls.size > 0) {
      const selectedDevices = devices.filter(d => selectedUrls.has(d.url));
      onSelectMultiple(selectedDevices);
      onOpenChange(false);
    }
  };

  // ダイアログを閉じるときに選択をリセット
  useEffect(() => {
    if (!open) {
      // Props→State sync: open=false 遷移時の選択リセット（意図的）
      setSelectedUrls(new Set());
    }
  }, [open]);

  // デバイスのオンライン状態を確認
  const checkDevicesOnline = useCallback(async (deviceList: DigiCodeDevice[]) => {
    setCheckingStatus(true);
    const updatedDevices = await Promise.all(
      deviceList.map(async (device) => {
        const isOnline = await firmwareService.checkDeviceOnline(device.url, 3000);
        return { ...device, isOnline };
      })
    );
    setDevices(updatedDevices);
    setCheckingStatus(false);
  }, []);

  // （初回 mount 時の localStorage 読み込みは useState 初期化子で実行済み）

  // デバイスリストを保存
  const saveDevices = (deviceList: DigiCodeDevice[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deviceList));
    setDevices(deviceList);
  };

  // mDNS探索でデバイスをスキャン
  const scanDevices = async () => {
    setScanning(true);
    const updatedDevices: DigiCodeDevice[] = [];
    const seenUrls = new Set<string>();

    try {
      // 1. バックエンドのmDNS探索APIを呼び出す
      console.log('Starting mDNS discovery via backend...');
      const discoveredDevices = await discoverDevicesViaMdns();
      console.log('mDNS discovered:', discoveredDevices);

      // 2. 発見したデバイスをリストに追加（詳細取得は任意）
      for (const discovered of discoveredDevices) {
        if (!seenUrls.has(discovered.url)) {
          seenUrls.add(discovered.url);

          // まずmDNS情報でデバイスを追加
          const basicDevice: DigiCodeDevice = {
            url: discovered.url,
            name: discovered.hostname.replace('.local', ''),
            uuid: discovered.hostname.split('-')[1]?.replace('.local', '') || 'unknown',
            ipAddress: discovered.ip,
            firmwareVersion: 'unknown',
            lastSeen: Date.now()
          };

          // 詳細情報の取得を試行（失敗しても基本情報で追加）
          try {
            const info = await fetchDeviceInfo(discovered.url);
            if (info) {
              updatedDevices.push(info);
            } else {
              updatedDevices.push(basicDevice);
            }
          } catch {
            console.log(`Could not fetch details from ${discovered.url}, using mDNS info`);
            updatedDevices.push(basicDevice);
          }
        }
      }

      // 3. 既存の保存済みデバイスも確認（mDNSで見つからなかったもの）
      for (const device of devices) {
        if (!seenUrls.has(device.url)) {
          seenUrls.add(device.url);
          try {
            const info = await fetchDeviceInfo(device.url);
            if (info) {
              updatedDevices.push(info);
            }
          } catch {
            // 保存済みデバイスが応答しない場合はスキップ
          }
        }
      }

      // 4. mDNSで見つからなかった場合のフォールバック
      if (updatedDevices.length === 0) {
        console.log('No devices found via mDNS, trying common hostnames...');
        const commonNames = [
          'http://digicode-robot001.local',
          'http://digicode-robot002.local',
          'http://digicode-robot003.local',
          'http://digicode.local',
        ];

        for (const url of commonNames) {
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            try {
              const info = await fetchDeviceInfo(url);
              if (info) {
                updatedDevices.push(info);
              }
            } catch {
              // 応答なし
            }
          }
        }
      }
    } catch (error) {
      console.error('Scan error:', error);
    }

    saveDevices(updatedDevices);
    setScanning(false);

    // スキャン後にオンライン状態をチェック
    if (updatedDevices.length > 0) {
      checkDevicesOnline(updatedDevices);
    }
  };

  // 新しいデバイスを追加
  const addDevice = async () => {
    if (!newDeviceUrl) return;

    setAddingDevice(true);

    let url = newDeviceUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'http://' + url;
    }

    const info = await fetchDeviceInfo(url);

    if (info) {
      const updatedDevices = devices.filter(d => d.url !== url);
      updatedDevices.push(info);
      saveDevices(updatedDevices);
      setNewDeviceUrl('');
    } else {
      alert(`${t('device.deviceNotFoundAt', { url })}\n\n${t('device.checkDeviceConnection')}`);
    }

    setAddingDevice(false);
  };

  // デバイスを削除
  const removeDevice = (url: string) => {
    const updatedDevices = devices.filter(d => d.url !== url);
    saveDevices(updatedDevices);
  };

  // デバイスを選択
  const handleSelect = (device: DigiCodeDevice) => {
    onSelect(device);
    onOpenChange(false);
  };

  // ダイアログが開いたときにスキャン開始＆オンライン状態チェック
  // devices / scanDevices は意図的に dep から除外: devices を dep に入れると
  // checkDevicesOnline → setDevices → 再実行の無限ループ、scanDevices は未 memo で
  // 毎 render 新参照となり dep に入れても意味がない。open トリガのみで実行する。
  useEffect(() => {
    if (open) {
      if (devices.length === 0) {
        scanDevices();
      } else {
        // 既存のデバイスリストがあれば、オンライン状態をチェック
        checkDevicesOnline(devices);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, checkDevicesOnline]);

  const onlineDevices = devices.filter(d => d.isOnline !== false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {multiSelect ? (
              <Users className="h-5 w-5" />
            ) : (
              <Wifi className="h-5 w-5" />
            )}
            {multiSelect ? t('device.selectBatchWriteDevices') : t('device.selectWriteDevice')}
          </DialogTitle>
          <DialogDescription>
            {multiSelect
              ? t('device.selectBatchDevicesDesc')
              : t('device.selectNetworkDeviceDesc')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* スキャン＆状態確認ボタン */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={scanDevices}
              disabled={scanning || checkingStatus}
              className="flex-1"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {scanning ? t('device.scanning') : t('device.scanDevices')}
            </Button>
            {devices.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => checkDevicesOnline(devices)}
                disabled={scanning || checkingStatus}
                title={t('device.recheckOnline', { defaultValue: 'オンライン状態を再確認' })}
              >
                {checkingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* 複数選択モード: 全選択ボタン */}
          {multiSelect && devices.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                className="h-7 px-2"
              >
                {selectedUrls.size === onlineDevices.length && onlineDevices.length > 0
                  ? t('device.deselectAll')
                  : t('device.selectAll')
                }
              </Button>
              <span className="text-muted-foreground">
                {t('device.devicesSelected', { count: selectedUrls.size, total: onlineDevices.length })}
              </span>
            </div>
          )}

          {/* デバイスリスト */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {devices.length === 0 && !scanning && (
              <div className="text-center text-muted-foreground py-4">
                {t('device.noDevicesFound')}
              </div>
            )}

            {devices.map((device) => (
              <div
                key={device.url}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer group transition-colors ${
                  device.isOnline === false
                    ? 'opacity-60 hover:bg-accent/50'
                    : selectedUrls.has(device.url)
                    ? 'bg-accent border-primary'
                    : 'hover:bg-accent'
                }`}
                onClick={() => {
                  if (multiSelect) {
                    if (device.isOnline !== false) {
                      toggleDeviceSelection(device.url);
                    }
                  } else {
                    handleSelect(device);
                  }
                }}
              >
                {/* 複数選択モード: チェックボックス */}
                {multiSelect && (
                  <Checkbox
                    checked={selectedUrls.has(device.url)}
                    disabled={device.isOnline === false}
                    onCheckedChange={() => {
                      if (device.isOnline !== false) {
                        toggleDeviceSelection(device.url);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0"
                  />
                )}
                {/* オンライン状態インジケーター */}
                <div className="flex-shrink-0">
                  {device.isOnline === undefined ? (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  ) : device.isOnline ? (
                    <Circle className="h-3 w-3 fill-green-500 text-green-500" />
                  ) : (
                    <Circle className="h-3 w-3 fill-red-400 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {device.name}
                    {device.isOnline === false && (
                      <span className="text-xs text-red-500">{t('device.offline')}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {device.ipAddress} · v{device.firmwareVersion}
                  </div>
                </div>
                {!multiSelect && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDevice(device.url);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 複数選択モード: 確定ボタン */}
          {multiSelect && (
            <div className="border-t pt-4">
              <Button
                className="w-full"
                disabled={selectedUrls.size === 0}
                onClick={confirmMultiSelect}
              >
                <Users className="h-4 w-4 mr-2" />
                {selectedUrls.size > 0
                  ? t('device.writeToDevices', { count: selectedUrls.size, defaultValue: '{{count}}台のデバイスに書き込む' })
                  : t('device.selectDevicesFirst', { defaultValue: 'デバイスを選択してください' })
                }
              </Button>
            </div>
          )}

          {/* 新しいデバイスを追加 */}
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">{t('device.manualAddDevice', { defaultValue: '手動でデバイスを追加' })}</div>
            <div className="flex gap-2">
              <Input
                placeholder={t('device.ipOrHostnamePlaceholder', { defaultValue: '192.168.x.x または *.local' })}
                value={newDeviceUrl}
                onChange={(e) => setNewDeviceUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDevice()}
              />
              <Button
                variant="outline"
                onClick={addDevice}
                disabled={addingDevice || !newDeviceUrl}
              >
                {addingDevice ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
