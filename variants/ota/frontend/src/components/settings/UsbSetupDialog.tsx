/**
 * USB有線接続ダイアログ
 *
 * USB経由でESP32に接続し、ファームウェアの書き込みや設定を行う
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Usb,
  Check,
  AlertCircle,
  Terminal,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useSerialStore } from '@/stores/serialStore';
import { firmwareService } from '@/services/firmwareService';

interface UsbSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsbSetupDialog({ open, onOpenChange }: UsbSetupDialogProps) {
  const { t } = useTranslation();
  const { status, isSupported, connect, disconnect, output, clearOutput, resetESP32 } = useSerialStore();

  const [showConsole, setShowConsole] = useState(true);
  const [isReleasingPorts, setIsReleasingPorts] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);

  // ポート解放処理
  const handleReleaseAllPorts = async () => {
    try {
      setIsReleasingPorts(true);
      await firmwareService.releaseAllPorts();
      alert('✓ すべてのポートを解放しました。\nページを再読み込みしてください。');
      // ページをリロード（状態をクリアするため）
      window.location.reload();
    } catch (error) {
      alert(`✗ ポート解放エラー:\n${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsReleasingPorts(false);
    }
  };

  // コンソール自動スクロール
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

  if (!isSupported) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Usb className="w-5 h-5 text-blue-600" />
              {t('usbSetup.title', { defaultValue: 'USB有線接続' })}
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('device.webSerialNotSupported', { defaultValue: 'お使いのブラウザはWebSerialをサポートしていません。Chrome、Edge、またはOperaをお使いください。' })}
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
            <Usb className="w-5 h-5 text-blue-600" />
            {t('usbSetup.title', { defaultValue: 'USB有線接続' })}
          </DialogTitle>
          <DialogDescription>
            {t('usbSetup.description', { defaultValue: 'USBケーブルでESP32に接続します' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* USB接続状態 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
                {t('usbSetup.step1.title', { defaultValue: 'USB接続' })}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('usbSetup.step1.description', { defaultValue: 'ESP32をUSBケーブルでPCに接続してください' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-[#0D1117]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#161B22]">
                    <Usb className="w-5 h-5 text-[#8B949E]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E6EDF3]">
                      {status === 'connected' ? t('device.connectedToEsp32', { defaultValue: 'ESP32に接続中' }) :
                       status === 'connecting' ? t('device.processing', { defaultValue: '処理中...' }) :
                       t('device.connectEsp32Usb', { defaultValue: 'ESP32をUSBで接続' })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'connected' ? 'bg-green-500' :
                        status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        'bg-gray-500'
                      }`} />
                      <span className="text-xs text-[#8B949E]">
                        {status === 'connected' ? t('device.connected', { defaultValue: '接続済み' }) :
                         status === 'connecting' ? t('device.processing', { defaultValue: '処理中...' }) :
                         t('device.disconnected', { defaultValue: '未接続' })}
                      </span>
                    </div>
                  </div>
                </div>
                {status === 'connected' ? (
                  <Button variant="outline" size="sm" onClick={async () => await disconnect()}>
                    {t('device.disconnect', { defaultValue: '切断' })}
                  </Button>
                ) : (
                  <Button size="sm" onClick={async () => await connect()} disabled={status === 'connecting'}>
                    {status === 'connecting' ? t('device.connecting', { defaultValue: '接続中...' }) : t('device.connect', { defaultValue: '接続' })}
                  </Button>
                )}
              </div>

              {/* ポート解放ボタン（Windows対策） */}
              <div className="mt-3 pt-3 border-t border-[#2E333D]">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#161B22]">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-[#E6EDF3] font-medium mb-1">
                      ポートが解放されない場合
                    </p>
                    <p className="text-xs text-[#8B949E] mb-2">
                      Windowsでポートが解放されず接続できない場合、このボタンで強制解放できます。
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReleaseAllPorts}
                      disabled={isReleasingPorts}
                      className="text-xs h-7 text-red-500 hover:text-red-600 border-red-500/30 hover:border-red-500/50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {isReleasingPorts ? '解放中...' : 'すべてのポートを解放'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* デバイス操作（接続時のみ表示） */}
          {status === 'connected' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
                  {t('usbSetup.step2.title', { defaultValue: 'デバイス操作' })}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('usbSetup.step2.description', { defaultValue: '接続中のデバイスを操作します' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => await resetESP32()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('usbSetup.resetDevice', { defaultValue: 'デバイスをリセット' })}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t('usbSetup.resetDesc', { defaultValue: 'デバイスを再起動します。プログラムの動作確認などに使用してください。' })}
                </p>
              </CardContent>
            </Card>
          )}

          {/* シリアルコンソール */}
          {status === 'connected' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  {t('device.serialConsole', { defaultValue: 'シリアルコンソール' })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowConsole(!showConsole)}
                    className="text-xs h-7"
                  >
                    {showConsole ? t('device.hide', { defaultValue: '非表示' }) : t('device.show', { defaultValue: '表示' })}
                  </Button>
                  {showConsole && (
                    <Button variant="outline" size="sm" onClick={clearOutput} className="text-xs h-7">
                      {t('device.clear', { defaultValue: 'クリア' })}
                    </Button>
                  )}
                </div>
                {showConsole && (
                  <div
                    ref={consoleRef}
                    className="bg-black text-green-400 font-mono text-xs p-3 rounded h-40 overflow-y-auto"
                  >
                    {output.length === 0 ? (
                      <div className="text-gray-500">{t('device.waitingOutput', { defaultValue: '出力待ち...' })}</div>
                    ) : (
                      output.map((line, index) => (
                        <div key={index}>{line}</div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 接続状態表示 */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-500">
              {status === 'connected' ? (
                <span className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4" />
                  {t('usbSetup.connected', { defaultValue: 'USB接続中' })}
                </span>
              ) : (
                t('usbSetup.notConnected', { defaultValue: 'USB未接続' })
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
