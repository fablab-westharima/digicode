import { useState, useEffect, useCallback } from 'react';
import { Wifi, Search, Loader2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Device } from '@/stores/deviceStore';
import { useTranslation } from 'react-i18next';
import {
  checkHelperAvailable,
  getHelperDevices,
  triggerHelperSearch,
  launchAndWaitHelper,
  convertToDevice,
  HELPER_DOWNLOAD_URL,
} from '@/services/helperService';
import type { HelperDevice } from '@/services/helperService';

type HelperState = 'checking' | 'launching' | 'ready' | 'failed';

interface WifiDeviceSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceSelect: (device: Device) => void;
}

export function WifiDeviceSelectDialog({
  open,
  onOpenChange,
  onDeviceSelect,
}: WifiDeviceSelectDialogProps) {
  const { t } = useTranslation();
  const [helperState, setHelperState] = useState<HelperState>('checking');
  const [launchProgress, setLaunchProgress] = useState(0);
  const [devices, setDevices] = useState<HelperDevice[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<HelperDevice | null>(null);

  // デバイス読み込み
  const loadDevices = useCallback(async () => {
    console.log('[WifiDeviceSelectDialog] loadDevices called');
    const helperDevices = await getHelperDevices();
    console.log('[WifiDeviceSelectDialog] getHelperDevices returned:', helperDevices.length, 'devices');
    setDevices(helperDevices);
    // Note: deviceStore への保存は削除（useEffect再実行の原因になる）
  }, []);

  // ダイアログ open 時の処理（ユーザージェスチャー直後）
  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    // Helper 起動確認 → 未起動なら自動起動
    const initHelper = async () => {
      // ダイアログを開いた時に状態をリセット
      setHelperState('checking');
      setLaunchProgress(0);
      setDevices([]);
      setSelectedDevice(null);

      const available = await checkHelperAvailable();
      if (cancelled) return;

      if (available) {
        setHelperState('ready');
        loadDevices();
        return;
      }

      // 自動起動を試みる（ユーザージェスチャー継続中）
      setHelperState('launching');

      const success = await launchAndWaitHelper((attempt, max) => {
        if (!cancelled) {
          setLaunchProgress((attempt / max) * 100);
        }
      });
      if (cancelled) return;

      if (success) {
        setHelperState('ready');
        loadDevices();
      } else {
        setHelperState('failed');
      }
    };

    initHelper();

    return () => {
      cancelled = true;
    };
  }, [open, loadDevices]);

  // 再試行
  const handleRetry = useCallback(async () => {
    setHelperState('launching');
    setLaunchProgress(0);

    const success = await launchAndWaitHelper((attempt, max) => {
      setLaunchProgress((attempt / max) * 100);
    });

    if (success) {
      setHelperState('ready');
      loadDevices();
    } else {
      setHelperState('failed');
    }
  }, [loadDevices]);

  // デバイス検索
  const handleSearchDevices = async () => {
    setIsSearching(true);

    // Helper が起動しているか確認
    const available = await checkHelperAvailable();
    if (!available) {
      // Helper が起動していない場合は再起動を試みる
      setHelperState('launching');
      setLaunchProgress(0);

      const success = await launchAndWaitHelper((attempt, max) => {
        setLaunchProgress((attempt / max) * 100);
      });

      if (!success) {
        setHelperState('failed');
        setIsSearching(false);
        return;
      }

      setHelperState('ready');
    }

    // Helper に検索を要求
    await triggerHelperSearch();
    await new Promise(r => setTimeout(r, 3000)); // 検索待機
    await loadDevices();
    setIsSearching(false);
  };

  // デバイス選択
  const handleDeviceClick = (device: HelperDevice) => {
    setSelectedDevice(device);
  };

  // 書込み開始
  const handleStartFlash = () => {
    if (selectedDevice) {
      const device = convertToDevice(selectedDevice);
      // Device 型に変換して渡す
      onDeviceSelect({
        uuid: device.uuid,
        name: device.name,
        ipAddress: device.ipAddress,
        ssid: device.ssid,
        lastConnected: device.lastConnected,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-purple-500" />
            {t('editor.wifiDeviceSelect.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* 状態: 確認中 */}
          {helperState === 'checking' && (
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('helper.status.checking')}</span>
            </div>
          )}

          {/* 状態: 自動起動中 */}
          {helperState === 'launching' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{t('helper.status.launching')}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all"
                  style={{ width: `${launchProgress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                {t('helper.status.launchingHint')}
              </p>
            </div>
          )}

          {/* 状態: 起動失敗 */}
          {helperState === 'failed' && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-700 dark:text-red-400">
                    {t('helper.status.failed')}
                  </p>
                  <p className="text-red-600 dark:text-red-500 mt-1">
                    {t('helper.status.failedHint')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  {t('helper.action.retry')}
                </Button>
                <Button asChild className="flex-1">
                  <a href={HELPER_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    {t('helper.action.download')}
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* 状態: 準備完了 → デバイス選択 */}
          {helperState === 'ready' && (
            <>
              <DialogDescription>
                {t('editor.wifiDeviceSelect.helperDescription')}
              </DialogDescription>

              {/* デバイス一覧 */}
              {devices.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {devices.map((device) => {
                    const isSelected = selectedDevice?.name === device.name;
                    // mDNS フルネーム (UNKO-009._digicode._tcp.local.) から表示名を抽出
                    const displayName = device.name
                      .replace(/\._digicode\._tcp\.local\.?$/, '')
                      .replace(/^digicode-/, '');
                    const ipAddress = device.addresses[0] || '';

                    return (
                      <button
                        key={device.name}
                        onClick={() => handleDeviceClick(device)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-purple-50 dark:hover:bg-purple-950 hover:border-purple-300 dark:hover:border-purple-700 ${
                          isSelected
                            ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-950'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Wifi className="w-5 h-5 text-purple-500" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {displayName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {ipAddress}
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Wifi className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t('editor.wifiDeviceSelect.noDevicesHelper')}</p>
                  <p className="text-xs mt-2">{t('editor.wifiDeviceSelect.searchHint')}</p>
                </div>
              )}

              {/* デバイス検索ボタン */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearchDevices}
                disabled={isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('editor.deviceSelector.searching')}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    {t('editor.deviceSelector.searchDevice')}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* フッター（準備完了時のみ） */}
        {helperState === 'ready' && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleStartFlash}
              disabled={!selectedDevice}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {t('editor.wifiDeviceSelect.startFlash')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
