import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, Circle } from 'lucide-react';
import { firmwareService, type FlashProgress } from '@/services/firmwareService';
import type { DigiCodeDevice } from './DeviceSelectDialog';

interface BatchUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: DigiCodeDevice[];
  binData: Blob | null;
  onComplete: (results: Map<string, boolean>) => void;
}

interface DeviceStatus {
  progress: FlashProgress;
  completed: boolean;
  success?: boolean;
}

export function BatchUpdateDialog({
  open,
  onOpenChange,
  devices,
  binData,
  onComplete,
}: BatchUpdateDialogProps) {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [deviceStatuses, setDeviceStatuses] = useState<Map<string, DeviceStatus>>(new Map());
  const [completedCount, setCompletedCount] = useState(0);
  const [results, setResults] = useState<Map<string, boolean> | null>(null);
  const hasStartedRef = useRef(false);

  // バッチ更新関数
  const startBatchUpdate = useCallback(async () => {
    if (!binData) return;

    setIsUpdating(true);
    setCompletedCount(0);
    setResults(null);

    // 初期状態を設定
    const initialStatuses = new Map<string, DeviceStatus>();
    devices.forEach((device) => {
      initialStatuses.set(device.url, {
        progress: { stage: 'connecting', percent: 0, message: t('device.batchUpdate.waiting', { defaultValue: '待機中...' }) },
        completed: false,
      });
    });
    setDeviceStatuses(initialStatuses);

    // バッチ更新実行
    const updateResults = await firmwareService.batchOtaUpdate(
      devices,
      binData,
      (deviceUrl, progress) => {
        setDeviceStatuses((prev) => {
          const next = new Map(prev);
          const current = next.get(deviceUrl);
          if (current) {
            next.set(deviceUrl, {
              ...current,
              progress,
              completed: progress.stage === 'complete' || progress.stage === 'error',
              success: progress.stage === 'complete',
            });
          }
          return next;
        });
      },
      (completed, _total) => {
        setCompletedCount(completed);
      }
    );

    setResults(updateResults);
    setIsUpdating(false);
    onComplete(updateResults);
  }, [binData, devices, onComplete, t]);

  // 更新開始
  useEffect(() => {
    if (open && binData && devices.length > 0 && !hasStartedRef.current) {
      hasStartedRef.current = true;
      // hasStartedRef で 1 回だけ実行をガード。startBatchUpdate 内部で setState するが意図的。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startBatchUpdate();
    }
    if (!open) {
      hasStartedRef.current = false;
    }
  }, [open, binData, devices, startBatchUpdate]);

  // ダイアログを閉じる
  const handleClose = () => {
    if (!isUpdating) {
      onOpenChange(false);
      // リセット
      setDeviceStatuses(new Map());
      setCompletedCount(0);
      setResults(null);
    }
  };

  // 成功・失敗の集計
  const successCount = results ? Array.from(results.values()).filter((v) => v).length : 0;
  const failCount = results ? Array.from(results.values()).filter((v) => !v).length : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => isUpdating && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isUpdating
              ? t('device.batchUpdate.updatingProgress', { completed: completedCount, total: devices.length, defaultValue: '一括OTA更新中... ({{completed}}/{{total}})' })
              : results
              ? t('device.batchUpdate.completed', { defaultValue: '一括OTA更新完了' })
              : t('device.batchUpdate.preparing', { defaultValue: '一括OTA更新準備中' })
            }
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 全体進捗 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('device.batchUpdate.overallProgress', { defaultValue: '全体進捗' })}</span>
              <span>{t('device.batchUpdate.completeCount', { completed: completedCount, total: devices.length, defaultValue: '{{completed}} / {{total}} 台完了' })}</span>
            </div>
            <Progress value={(completedCount / devices.length) * 100} />
          </div>

          {/* 結果サマリー */}
          {results && (
            <div className="flex gap-4 justify-center py-2 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{t('device.batchUpdate.successCount', { count: successCount, defaultValue: '{{count}} 台成功' })}</span>
              </div>
              {failCount > 0 && (
                <div className="flex items-center gap-2 text-red-500">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{t('device.batchUpdate.failCount', { count: failCount, defaultValue: '{{count}} 台失敗' })}</span>
                </div>
              )}
            </div>
          )}

          {/* デバイスごとの進捗 */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {devices.map((device) => {
              const status = deviceStatuses.get(device.url);
              return (
                <div
                  key={device.url}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  {/* ステータスアイコン */}
                  <div className="flex-shrink-0">
                    {!status || !status.completed ? (
                      status?.progress.stage === 'connecting' ||
                      status?.progress.stage === 'flashing' ||
                      status?.progress.stage === 'verifying' ? (
                        <Loader2 className="h-5 w-5 text-green-500 animate-spin" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )
                    ) : status.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>

                  {/* デバイス情報 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{device.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {status?.progress.message || device.ipAddress}
                    </div>
                  </div>

                  {/* 進捗バー */}
                  {status && !status.completed && status.progress.percent > 0 && (
                    <div className="w-20 flex-shrink-0">
                      <Progress value={status.progress.percent} className="h-2" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 閉じるボタン */}
          {results && (
            <Button onClick={handleClose} className="w-full">
              {t('common.close', { defaultValue: '閉じる' })}
            </Button>
          )}

          {/* 更新中の警告 */}
          {isUpdating && (
            <p className="text-xs text-center text-muted-foreground">
              {t('device.batchUpdate.warningDoNotPowerOff', { defaultValue: '更新中はデバイスの電源を切らないでください' })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
