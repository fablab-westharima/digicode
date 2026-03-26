import { useState, useEffect, useCallback } from 'react';
import { Wifi, Clipboard, Clock, Download, Sparkles, Check, Square, CheckSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { HELPER_DOWNLOAD_URL, launchHelper } from '@/services/helperService';

// WiFiデバイス選択で使用するデバイス情報の型（EditorPage.tsxからもimportされる）
export interface Device {
  uuid: string;
  name: string;
  ssid: string;
  lastConnected: string;
  ipAddress?: string;
}

// クリップボードから取得したデバイス情報の型
interface ClipboardDevice {
  type: 'digicode-device';
  name: string;
  ip: string;
  port: number;
  version?: string;
  uuid?: string;
}

// 履歴に保存するデバイス情報
interface RecentDevice {
  name: string;
  ip: string;
  port: number;
  lastUsed: string;
}

const RECENT_DEVICES_KEY = 'digicode-recent-wifi-devices';
const MAX_RECENT_DEVICES = 20; // 教室規模に対応

// LocalStorage から最近使用したデバイスを取得
function getRecentDevices(): RecentDevice[] {
  try {
    const stored = localStorage.getItem(RECENT_DEVICES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[WifiDeviceSelectDialog] Failed to load recent devices:', e);
  }
  return [];
}

// LocalStorage に最近使用したデバイスを保存
function saveRecentDevice(device: RecentDevice): void {
  try {
    const recent = getRecentDevices();
    const filtered = recent.filter(d => d.ip !== device.ip);
    filtered.unshift({ ...device, lastUsed: new Date().toISOString() });
    const trimmed = filtered.slice(0, MAX_RECENT_DEVICES);
    localStorage.setItem(RECENT_DEVICES_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[WifiDeviceSelectDialog] Failed to save recent device:', e);
  }
}

// クリップボードからデバイス情報を読み取り（単一または配列）
async function readClipboardDevices(): Promise<ClipboardDevice[]> {
  try {
    // クリップボード読み取り権限のチェック
    const permission = await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
    console.log('[WifiDeviceSelectDialog] Clipboard permission:', permission.state);

    const text = await navigator.clipboard.readText();
    console.log('[WifiDeviceSelectDialog] Clipboard text:', text);

    if (!text || text.trim() === '') {
      console.log('[WifiDeviceSelectDialog] Clipboard is empty');
      return [];
    }

    const data = JSON.parse(text);

    // 配列形式
    if (Array.isArray(data)) {
      const devices = data.filter(
        (d): d is ClipboardDevice => d.type === 'digicode-device' && d.ip
      );
      console.log('[WifiDeviceSelectDialog] Found', devices.length, 'devices in clipboard array');
      return devices;
    }

    // 単一オブジェクト形式
    if (data.type === 'digicode-device' && data.ip) {
      console.log('[WifiDeviceSelectDialog] Found single device in clipboard');
      return [data as ClipboardDevice];
    }

    console.log('[WifiDeviceSelectDialog] Clipboard data does not match expected format:', data);
  } catch (e) {
    console.error('[WifiDeviceSelectDialog] Clipboard read error:', e);
  }
  return [];
}

interface WifiDeviceSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceSelect: (device: Device) => void;
  // 複数選択モード（一括更新用）
  multiSelect?: boolean;
  onMultiDeviceSelect?: (devices: Device[]) => void;
}

export function WifiDeviceSelectDialog({
  open,
  onOpenChange,
  onDeviceSelect,
  multiSelect = false,
  onMultiDeviceSelect,
}: WifiDeviceSelectDialogProps) {
  const { t } = useTranslation();
  const [clipboardDevices, setClipboardDevices] = useState<ClipboardDevice[]>([]);
  const [recentDevices, setRecentDevices] = useState<RecentDevice[]>([]);
  const [selectedIps, setSelectedIps] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // 全デバイスリスト（クリップボード + 履歴、重複除去）
  const allDevices = useCallback(() => {
    const deviceMap = new Map<string, ClipboardDevice | RecentDevice>();

    // クリップボードのデバイスを先に追加
    clipboardDevices.forEach(d => {
      deviceMap.set(d.ip, d);
    });

    // 履歴のデバイスを追加（重複しない場合のみ）
    recentDevices.forEach(d => {
      if (!deviceMap.has(d.ip)) {
        deviceMap.set(d.ip, d);
      }
    });

    return Array.from(deviceMap.values());
  }, [clipboardDevices, recentDevices]);

  // ダイアログを開いた時にクリップボードと履歴を読み込み
  useEffect(() => {
    if (!open) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setSelectedIps(new Set());

      // クリップボードから読み取り
      const devices = await readClipboardDevices();
      setClipboardDevices(devices);

      // 履歴を読み込み
      const recent = getRecentDevices();
      setRecentDevices(recent);

      // クリップボードにデバイスがあれば自動選択
      if (devices.length > 0) {
        if (multiSelect) {
          // 複数選択モード: 全て選択
          setSelectedIps(new Set(devices.map(d => d.ip)));
        } else {
          // 単一選択モード: 最初の1つを選択
          setSelectedIps(new Set([devices[0].ip]));
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [open, multiSelect]);

  // クリップボード再読み込み
  const handleRefreshClipboard = useCallback(async () => {
    const devices = await readClipboardDevices();
    setClipboardDevices(devices);
    if (devices.length > 0) {
      if (multiSelect) {
        setSelectedIps(new Set(devices.map(d => d.ip)));
      } else {
        setSelectedIps(new Set([devices[0].ip]));
      }
    }
  }, [multiSelect]);

  // デバイス選択（単一選択モード）
  const handleSelectSingle = (ip: string) => {
    setSelectedIps(new Set([ip]));
  };

  // デバイス選択（複数選択モード）
  const handleToggleSelect = (ip: string) => {
    const newSet = new Set(selectedIps);
    if (newSet.has(ip)) {
      newSet.delete(ip);
    } else {
      newSet.add(ip);
    }
    setSelectedIps(newSet);
  };

  // 全選択
  const handleSelectAll = () => {
    const all = allDevices();
    setSelectedIps(new Set(all.map(d => d.ip)));
  };

  // 全解除
  const handleDeselectAll = () => {
    setSelectedIps(new Set());
  };

  // 書込み開始
  const handleStartFlash = () => {
    if (selectedIps.size === 0) return;

    const all = allDevices();
    const selectedDevices: Device[] = [];

    selectedIps.forEach(ip => {
      const device = all.find(d => d.ip === ip);
      if (device) {
        // 履歴に保存
        saveRecentDevice({
          name: device.name,
          ip: device.ip,
          port: device.port,
          lastUsed: new Date().toISOString(),
        });

        selectedDevices.push({
          uuid: device.ip,
          name: device.name || device.ip,
          ipAddress: device.ip,
          ssid: '',
          lastConnected: new Date().toISOString(),
        });
      }
    });

    if (multiSelect && onMultiDeviceSelect) {
      onMultiDeviceSelect(selectedDevices);
    } else if (selectedDevices.length > 0) {
      onDeviceSelect(selectedDevices[0]);
    }
  };

  const devices = allDevices();
  const hasDevices = devices.length > 0;
  const clipboardIps = new Set(clipboardDevices.map(d => d.ip));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={multiSelect ? "sm:max-w-lg" : "sm:max-w-md"}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className={`h-5 w-5 ${multiSelect ? 'text-orange-500' : 'text-purple-500'}`} />
            {multiSelect
              ? t('editor.wifiDeviceSelect.titleBatch', 'WiFiデバイスを選択（一括更新）')
              : t('editor.wifiDeviceSelect.title')}
          </DialogTitle>
          <DialogDescription>
            {multiSelect
              ? t('editor.wifiDeviceSelect.batchDescription', '更新するデバイスをチェックしてください')
              : t('editor.wifiDeviceSelect.clipboardDescription', 'DigiCode Finderでコピーしたデバイス情報を貼り付けてください')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className={`w-6 h-6 border-2 ${multiSelect ? 'border-orange-500' : 'border-purple-500'} border-t-transparent rounded-full animate-spin`} />
            </div>
          ) : (
            <>
              {/* Step 1: DigiCode Finder 起動 */}
              <Button
                variant="outline"
                size="sm"
                onClick={launchHelper}
                className="w-full"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                DigiCode Finder を起動（書込みデバイス選択）
              </Button>

              {/* Step 2: クリップボード読み込み */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshClipboard}
                className="w-full"
              >
                <Clipboard className="w-4 h-4 mr-2" />
                クリップボードを読み込み（選択反映）
              </Button>

              {/* デバイスリスト */}
              {hasDevices ? (
                <div className="space-y-1">
                  {/* 複数選択モード: 全選択/全解除ボタン */}
                  {multiSelect && devices.length > 1 && (
                    <div className="flex gap-2 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="flex-1 text-xs"
                      >
                        <CheckSquare className="w-3 h-3 mr-1" />
                        {t('editor.wifiDeviceSelect.selectAll', '全選択')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="flex-1 text-xs"
                      >
                        <Square className="w-3 h-3 mr-1" />
                        {t('editor.wifiDeviceSelect.deselectAll', '全解除')}
                      </Button>
                    </div>
                  )}

                  {/* コンパクトデバイスリスト */}
                  <div className={`space-y-1 overflow-y-auto ${multiSelect ? 'max-h-64' : 'max-h-48'}`}>
                    {devices.map((device) => {
                      const isSelected = selectedIps.has(device.ip);
                      const isFromClipboard = clipboardIps.has(device.ip);

                      return (
                        <button
                          key={device.ip}
                          onClick={() => multiSelect ? handleToggleSelect(device.ip) : handleSelectSingle(device.ip)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                            isSelected
                              ? multiSelect
                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-950'
                                : 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {/* チェックボックス/ラジオボタン */}
                          <div className={`w-4 h-4 flex-shrink-0 rounded ${multiSelect ? '' : 'rounded-full'} border-2 flex items-center justify-center ${
                            isSelected
                              ? multiSelect
                                ? 'border-orange-500 bg-orange-500'
                                : 'border-purple-500 bg-purple-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          {/* デバイス名 */}
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate flex-1 text-left">
                            {device.name || device.ip}
                          </span>

                          {/* IPアドレス */}
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {device.ip}
                          </span>

                          {/* 新規バッジ */}
                          {isFromClipboard && (
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded flex-shrink-0">
                              {t('editor.wifiDeviceSelect.new', '新規')}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* 選択数表示（複数選択モード） */}
                  {multiSelect && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                      {selectedIps.size} / {devices.length} {t('editor.wifiDeviceSelect.devicesSelected', '台選択中')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <p className="text-xs">
                    {t('editor.wifiDeviceSelect.clipboardHint', 'DigiCode Finderで「書込みデバイス情報を取得」をクリックしてください')}
                  </p>
                </div>
              )}

              {/* DigiCode Finder ダウンロードリンク */}
              <div className="text-center">
                <a
                  href={HELPER_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-xs ${multiSelect ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'} hover:underline`}
                >
                  <Download className="w-3 h-3" />
                  DigiCode Finder をダウンロード
                </a>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleStartFlash}
            disabled={selectedIps.size === 0}
            className={multiSelect ? "bg-orange-600 hover:bg-orange-700" : "bg-purple-600 hover:bg-purple-700"}
          >
            {multiSelect
              ? t('editor.wifiDeviceSelect.startBatchFlash', `${selectedIps.size}台に書込み開始`)
              : t('editor.wifiDeviceSelect.startFlash')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
