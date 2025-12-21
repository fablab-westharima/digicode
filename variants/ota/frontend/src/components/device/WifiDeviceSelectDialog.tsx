import { useState, useEffect } from 'react';
import { Wifi, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useDeviceStore, type Device } from '@/stores/deviceStore';
import { useTranslation } from 'react-i18next';

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
  const { devices: wifiDevices, updateDevice } = useDeviceStore();
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceOnlineStatus, setDeviceOnlineStatus] = useState<Record<string, boolean>>({});

  // ダイアログを開いた時に選択をリセット
  useEffect(() => {
    if (open) {
      setSelectedDevice(null);
    }
  }, [open]);

  // デバイスを検索（localStorageのデバイスのオンライン状態を確認）
  const handleSearchDevices = async () => {
    if (wifiDevices.length === 0) {
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
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          newOnlineStatus[result.value.device.uuid] = result.value.isOnline;
        }
      });

      // デバイスのオンライン状態を更新
      setDeviceOnlineStatus(newOnlineStatus);

      console.log('[SEARCH] Search complete');
    } catch (error) {
      console.error('[SEARCH] Device search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // デバイス選択
  const handleDeviceClick = (device: Device) => {
    setSelectedDevice(device);
  };

  // 書込み開始
  const handleStartFlash = () => {
    if (selectedDevice) {
      onDeviceSelect(selectedDevice);
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
          <DialogDescription>
            {t('editor.wifiDeviceSelect.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* デバイス一覧 */}
          {wifiDevices.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {wifiDevices.map((device) => {
                const isSelected = selectedDevice?.uuid === device.uuid;
                const onlineStatus = deviceOnlineStatus[device.uuid];

                // オンライン状態に基づいて色を決定
                // true: 緑（オンライン）, false: 赤（オフライン）, undefined: 灰色（未検索）
                const statusColor = onlineStatus === true
                  ? 'bg-green-500'
                  : onlineStatus === false
                    ? 'bg-red-500'
                    : 'bg-gray-400';

                return (
                  <button
                    key={device.uuid}
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
                        {device.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {device.ipAddress || t('editor.wifiDeviceSelect.noIp')}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${statusColor}`} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Wifi className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('editor.wifiDeviceSelect.noDevices')}</p>
              <p className="text-xs mt-2">{t('editor.wifiDeviceSelect.registerHint')}</p>
            </div>
          )}

          {/* デバイス検索ボタン */}
          {wifiDevices.length > 0 && (
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
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
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
      </DialogContent>
    </Dialog>
  );
}
