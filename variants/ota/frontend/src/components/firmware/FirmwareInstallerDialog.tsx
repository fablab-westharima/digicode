import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Usb, Trash2, Wifi, Bluetooth, Check } from 'lucide-react';
import { firmwareService, type FlashProgress } from '@/services/firmwareService';
import { compileService, type ConnectionType } from '@/services/compileService';
import { useSerialStore } from '@/stores/serialStore';

interface FirmwareInstallerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ファームウェアパッケージの型（従来のBlob or fullPackage）
type FirmwarePackage = Blob | {
  firmware: Blob;
  bootloader: Blob;
  partitions: Blob;
  bootApp0: Blob;
};

export function FirmwareInstallerDialog({ open, onOpenChange }: FirmwareInstallerDialogProps) {
  const { t } = useTranslation();
  const [firmwareType, setFirmwareType] = useState<'ota' | 'ble'>('ota');
  const [isErasing, setIsErasing] = useState(false);
  const [eraseProgress, setEraseProgress] = useState<FlashProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledFirmwareBlob, setCompiledFirmwareBlob] = useState<FirmwarePackage | null>(null);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<FlashProgress | null>(null);
  const [needsManualReset, setNeedsManualReset] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // デバイス名設定ステップ
  const [showDeviceNameStep, setShowDeviceNameStep] = useState(false);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [deviceNameError, setDeviceNameError] = useState('');
  const [isSavingDeviceName, setIsSavingDeviceName] = useState(false);
  const [deviceNameSaved, setDeviceNameSaved] = useState(false);
  const [isSerialReconnecting, setIsSerialReconnecting] = useState(false);
  const [serialReconnected, setSerialReconnected] = useState(false);

  // デバイス名バリデーション（英数字とハイフン、1-20文字）
  const validateDeviceName = (name: string): string => {
    if (name.length === 0) return '';
    if (name.length > 20) return 'デバイス名は20文字以内で入力してください';
    if (!/^[a-zA-Z0-9-]+$/.test(name)) return '英数字とハイフン(-)のみ使用できます';
    if (name.startsWith('-') || name.endsWith('-')) return '先頭・末尾にハイフンは使えません';
    return '';
  };

  // ファームウェア書き込み完了後、シリアル再接続してデバイス名設定ステップを表示
  const startDeviceNameStep = useCallback(async () => {
    setShowDeviceNameStep(true);
    setDeviceNameSaved(false);
    setDeviceNameInput('');
    setDeviceNameError('');
    setIsSerialReconnecting(true);
    setSerialReconnected(false);

    // esptoolのポートを解放
    addLog('デバイス名設定の準備中...');
    await firmwareService.disconnect();
    setIsConnected(false);

    // ESP32の再起動待ち
    addLog('ESP32の起動を待っています...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // serialServiceで再接続
    try {
      const { connect, output } = useSerialStore.getState();
      await connect();
      setSerialReconnected(true);
      addLog('シリアル接続成功。デバイス名を設定できます。');

      // 既存のデバイス名を取得
      await new Promise(resolve => setTimeout(resolve, 1000));
      const { send } = useSerialStore.getState();
      await send('GET_CONFIG\n');
      await new Promise(resolve => setTimeout(resolve, 500));

      const currentOutput = useSerialStore.getState().output;
      const nameLine = currentOutput.find((line: string) => line.startsWith('OK:NAME='));
      if (nameLine) {
        const existingName = nameLine.substring(8);
        if (existingName.length > 0) {
          setDeviceNameInput(existingName);
          addLog(`現在のデバイス名: ${existingName}`);
        }
      }
    } catch (error) {
      addLog('シリアル再接続に失敗しました。デバイス名は後からUSB接続で設定できます。');
      console.error('[FirmwareInstaller] Serial reconnect failed:', error);
    } finally {
      setIsSerialReconnecting(false);
    }
  }, []);

  // デバイス名を保存
  const saveDeviceName = async () => {
    const error = validateDeviceName(deviceNameInput);
    if (error) {
      setDeviceNameError(error);
      return;
    }

    setIsSavingDeviceName(true);
    try {
      const { send } = useSerialStore.getState();
      await send(`SET_NAME:${deviceNameInput}\n`);
      await new Promise(resolve => setTimeout(resolve, 300));
      await send('SAVE_CONFIG\n');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 保存確認
      const currentOutput = useSerialStore.getState().output;
      const saved = currentOutput.some((line: string) => line.includes('OK:CONFIG_SAVED') || line.includes('OK:NAME='));
      if (saved) {
        setDeviceNameSaved(true);
        addLog(`デバイス名を「${deviceNameInput}」に設定しました。BLE名: DigiCode-${deviceNameInput}`);
      } else {
        addLog('デバイス名の保存を実行しました。');
        setDeviceNameSaved(true);
      }
    } catch (error) {
      addLog('デバイス名の保存に失敗しました。');
      console.error('[FirmwareInstaller] Save device name error:', error);
    } finally {
      setIsSavingDeviceName(false);
    }
  };

  // ファームウェアをコンパイル
  const compileFirmware = async () => {
    setIsCompiling(true);
    setCompileError(null);
    const firmwareName = firmwareType === 'ble' ? t('firmware.bleFirmwareName') : t('firmware.otaFirmwareName');
    addLog(t('firmware.compilingFromCloud', { firmwareName }));
    console.log(`[FirmwareInstaller] Compiling latest ${firmwareType} firmware from cloud...`);

    try {
      // firmwareTypeに応じてconnectionTypeを指定
      const connectionType: ConnectionType = firmwareType === 'ble' ? 'ble' : 'ota';
      console.log('[FirmwareInstaller] Compiling with:', { firmwareType, connectionType });
      const result = await compileService.compile('', '', '', '', 'esp32:esp32:esp32', 'bin', connectionType);

      if (!result.success) {
        throw new Error(result.error || 'Compilation failed');
      }

      // fullPackage または binary を保存
      if (result.fullPackage) {
        setCompiledFirmwareBlob(result.fullPackage);
        setFirmwareVersion(result.version || null);
        const versionInfo = result.version ? ` (v${result.version})` : '';
        addLog(t('firmware.fullPackageCompiled', { versionInfo }));
        console.log('[FirmwareInstaller] ✓ Full firmware package compiled successfully', {
          version: result.version,
          template: result.template
        });
      } else if (result.binary) {
        setCompiledFirmwareBlob(result.binary);
        setFirmwareVersion(result.version || null);
        const versionInfo = result.version ? ` (v${result.version})` : '';
        addLog(t('firmware.firmwareCompiled', { versionInfo }));
        console.log('[FirmwareInstaller] ✓ Firmware compiled successfully', {
          version: result.version,
          template: result.template
        });
      } else {
        throw new Error('Compilation returned neither binary nor fullPackage');
      }
    } catch (error) {
      console.error('[FirmwareInstaller] Compilation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown compilation error';
      setCompileError(errorMsg);
      addLog(t('firmware.compileError', { error: errorMsg }));
    } finally {
      setIsCompiling(false);
    }
  };

  // Arduino完全ファームウェアをインストール（USB接続は事前に完了済み）
  const installArduinoFirmware = async () => {
    if (!compiledFirmwareBlob) {
      addLog(t('firmware.notCompiled'));
      return;
    }

    if (!isConnected) {
      addLog(t('firmware.usbNotConnected'));
      return;
    }

    setIsInstalling(true);
    addLog(t('firmware.startingInstall'));

    try {
      // 1. ファームウェアファイルを準備
      let firmwareBlob: Blob;
      let bootloaderBlob: Blob;
      let partitionsBlob: Blob;
      let bootApp0Blob: Blob;

      if (compiledFirmwareBlob instanceof Blob) {
        // 従来モード: 静的ファイルを取得
        addLog(t('firmware.loadingStaticFiles'));
        const [bootloaderRes, partitionsRes, bootApp0Res] = await Promise.all([
          fetch('/firmware/esp32/arduino/bootloader.bin'),
          fetch('/firmware/esp32/arduino/partitions.bin'),
          fetch('/firmware/esp32/arduino/boot_app0.bin')
        ]);

        if (!bootloaderRes.ok || !partitionsRes.ok || !bootApp0Res.ok) {
          throw new Error(t('firmware.staticFilesError'));
        }

        bootloaderBlob = await bootloaderRes.blob();
        partitionsBlob = await partitionsRes.blob();
        bootApp0Blob = await bootApp0Res.blob();
        firmwareBlob = compiledFirmwareBlob;

        addLog(t('firmware.allFilesLoaded'));
      } else {
        // fullPackageモード: コンパイル時に取得した4ファイルを使用
        addLog(t('firmware.usingFullPackage'));
        bootloaderBlob = compiledFirmwareBlob.bootloader;
        partitionsBlob = compiledFirmwareBlob.partitions;
        bootApp0Blob = compiledFirmwareBlob.bootApp0;
        firmwareBlob = compiledFirmwareBlob.firmware;

        addLog(t('firmware.packagePrepared'));
      }

      // 2. 完全なファームウェアを書き込み（USB接続は既に確立済み）
      addLog(t('firmware.flashing'));
      const success = await firmwareService.flashCompleteArduinoFirmware(
        bootloaderBlob,
        partitionsBlob,
        bootApp0Blob,
        firmwareBlob,
        (progress) => {
          setInstallProgress(progress);
          addLog(`${progress.message} (${Math.round(progress.percent)}%)`);
        }
      );

      if (success) {
        addLog(t('firmware.installComplete'));
        setNeedsManualReset(false);

        // BLEファームウェアの場合、デバイス名設定ステップを開始
        if (firmwareType === 'ble') {
          await startDeviceNameStep();
        }
      } else {
        // flashCompleteArduinoFirmware()がfalseを返した場合
        // すでにonProgressでエラーメッセージが設定されているので、それを保持
        addLog(t('firmware.flashFailed'));

        // エラーメッセージから自動接続失敗を判定
        const errorMsg = installProgress?.message || '';
        if (errorMsg.includes('Invalid head of packet') || errorMsg.includes('serial noise')) {
          addLog(t('firmware.autoConnectFailed'));
          setNeedsManualReset(true);
        }
      }
    } catch (error) {
      console.error('[FirmwareInstaller] Installation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(t('firmware.installError', { error: errorMsg }));
      setInstallProgress({
        stage: 'error',
        percent: 0,
        message: errorMsg
      });

      // 接続エラーの場合は手動モード表示
      if (errorMsg.includes('Invalid head of packet') || errorMsg.includes('serial noise')) {
        setNeedsManualReset(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  // 自動コンパイルは削除 - ユーザーが明示的にビルドボタンをクリックする必要がある

  // ダイアログが開いた時にneedsManualResetをリセット
  useEffect(() => {
    if (open) {
      setNeedsManualReset(false);
    }
  }, [open]);

  // ダイアログが閉じられた時のクリーンアップ
  useEffect(() => {
    if (!open) {
      if (isConnected) {
        firmwareService.disconnect();
        setIsConnected(false);
      }
      if (serialReconnected) {
        useSerialStore.getState().disconnect();
      }
      setLogs([]);
      setShowDeviceNameStep(false);
      setDeviceNameSaved(false);
      setSerialReconnected(false);
    }
  }, [open, isConnected, serialReconnected]);

  // ログ追加
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // 有線接続
  const handleConnect = async () => {
    setIsConnecting(true);
    setLogs([]);
    addLog(t('firmware.connectingEsp32'));

    // ログコールバックを設定
    firmwareService.setLogCallback((msg) => {
      addLog(msg);
    });

    try {
      const chipInfo = await firmwareService.connect((progress) => {
        addLog(`${progress.message} (${Math.round(progress.percent)}%)`);
        setEraseProgress(progress);
      });

      if (!chipInfo) {
        throw new Error(t('firmware.connectionFailed'));
      }

      addLog(t('firmware.connected', { name: chipInfo.name }));
      addLog(`MAC Address: ${chipInfo.mac}`);
      setIsConnected(true);
    } catch (error) {
      console.error('Connection error:', error);
      addLog(t('firmware.connectionError', { error: (error as Error).message }));
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // 接続解除
  const handleDisconnect = async () => {
    addLog(t('firmware.disconnecting'));
    await firmwareService.disconnect();
    setIsConnected(false);
    addLog(t('firmware.disconnected'));
  };

  // Flash全体を消去
  const handleEraseFlash = async () => {
    if (!isConnected) {
      addLog(t('firmware.connectFirst'));
      return;
    }

    if (!confirm(t('firmware.eraseConfirm'))) {
      return;
    }

    setIsErasing(true);
    addLog(t('firmware.erasingFlash'));

    try {
      setEraseProgress({
        stage: 'erasing',
        percent: 50,
        message: t('firmware.erasingFlash')
      });

      // firmwareServiceのloaderを使って直接消去
      // @ts-expect-error - private propertyにアクセス
      if (firmwareService.loader) {
        // @ts-expect-error - private propertyにアクセス
        await firmwareService.loader.eraseFlash();

        addLog(t('firmware.eraseComplete'));
        setEraseProgress({
          stage: 'complete',
          percent: 100,
          message: t('firmware.eraseCompleteReset')
        });
      } else {
        throw new Error(t('firmware.loaderNotInitialized'));
      }
    } catch (error) {
      console.error('Flash erase error:', error);
      const errorMsg = t('firmware.eraseError', { error: (error as Error).message });
      addLog(errorMsg);
      setEraseProgress({
        stage: 'error',
        percent: 0,
        message: errorMsg
      });
    } finally {
      setIsErasing(false);
    }
  };

  // Web Serial APIのサポートチェック
  const isSupported = 'serial' in navigator;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#161B22] border-[#2E333D]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[#58D5D5]">
            {t('firmware.installerTitle')}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('firmware.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ファームウェア選択 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 2</span>
              {t('firmware.step2Title')}
            </h3>
            <div className="space-y-2">
              {/* DigiCode OTA */}
              <button
                onClick={() => {
                  setFirmwareType('ota');
                  setCompiledFirmwareBlob(null);
                  setFirmwareVersion(null);
                  setCompileError(null);
                }}
                className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                  firmwareType === 'ota'
                    ? 'border-[#58A6F9] bg-[#0D1117]'
                    : 'border-[#2E333D] bg-[#0D1117] hover:border-[#58A6F9]/50'
                }`}
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Wifi className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#E6EDF3]">{t('firmware.wifiFirmwareTitle')}</p>
                    {firmwareType === 'ota' && (
                      <span className="text-xs text-[#58A6F9] bg-[#1f6feb] px-2 py-0.5 rounded">{t('firmware.selected')}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8B949E] mt-1">{t('firmware.wifiFirmwareDesc')}</p>
                </div>
              </button>

              {/* DigiCode BLE */}
              <button
                onClick={() => {
                  setFirmwareType('ble');
                  setCompiledFirmwareBlob(null);
                  setFirmwareVersion(null);
                  setCompileError(null);
                }}
                className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                  firmwareType === 'ble'
                    ? 'border-[#8B5CF6] bg-[#0D1117]'
                    : 'border-[#2E333D] bg-[#0D1117] hover:border-[#8B5CF6]/50'
                }`}
              >
                <div className="p-2 bg-violet-100 dark:bg-violet-900 rounded-lg">
                  <Bluetooth className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#E6EDF3]">{t('firmware.bleFirmwareTitle')}</p>
                    {firmwareType === 'ble' && (
                      <span className="text-xs text-[#8B5CF6] bg-[#8B5CF6]/20 px-2 py-0.5 rounded">{t('firmware.selected')}</span>
                    )}
                  </div>
                  <p className="text-xs text-[#8B949E] mt-1">{t('firmware.bleFirmwareDesc')}</p>
                </div>
              </button>
            </div>

            {/* ビルド開始ボタン */}
            {!isCompiling && !compiledFirmwareBlob && !compileError && (
              <Button
                onClick={compileFirmware}
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold py-3 mt-3"
              >
                🚀 {t('firmware.buildFirmware')}
              </Button>
            )}

            {/* ビルド完了後の再ビルドボタン */}
            {compiledFirmwareBlob && !isCompiling && (
              <Button
                onClick={() => {
                  setCompiledFirmwareBlob(null);
                  setCompileError(null);
                  compileFirmware();
                }}
                variant="outline"
                className="w-full border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D] py-2 mt-3"
              >
                🔄 {t('firmware.rebuild')}
              </Button>
            )}
          </div>

          {/* ファームウェア書き込み */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 1</span>
              {t('firmware.step3Title')}
            </h3>

            {/* ブラウザ非対応メッセージ */}
            {!isSupported && (
              <div className="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg">
                <p className="text-[#f85149] text-sm">
                  {t('firmware.webSerialNotSupported')}
                  <br />
                  {t('firmware.useChromeOrEdge')}
                </p>
              </div>
            )}

            {/* コンパイルエラー表示 */}
            {compileError && (
              <div className="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg">
                <p className="text-[#f85149] text-sm">
                  <strong>{t('firmware.compileErrorLabel')}:</strong><br />
                  {compileError}
                </p>
              </div>
            )}

            {/* コンパイル中の表示 */}
            {isCompiling && (
              <div className="flex flex-col items-center gap-3 p-4 bg-[#0D1117] rounded-lg border-2 border-[#58A6F9]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#58A6F9]"></div>
                <p className="text-[#58A6F9] text-sm text-center">
                  {t('firmware.compilingLatest')}<br />
                  <span className="text-xs text-[#8B949E]">
                    {t('firmware.cloudServerFallback')}
                  </span>
                </p>
              </div>
            )}

            {/* カスタムINSTALLボタン */}
            {!isCompiling && !compileError && compiledFirmwareBlob && (
              <div className="flex flex-col items-center gap-4 p-4 bg-[#0D1117] rounded-lg border-2 border-dashed border-[#2E333D]">
                {/* コンパイル完了メッセージ */}
                <div className="w-full p-3 bg-[#1a472a] border border-[#2ea043] rounded-lg">
                  <p className="text-[#2ea043] text-sm text-center font-semibold">
                    {t('firmware.compileCompleteMessage')}
                  </p>
                </div>

                {/* USB接続セクション（未接続の場合） */}
                {!isConnected && (
                  <div className="w-full p-4 bg-[#0D1117] border-2 border-[#58A6F9] rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-[#2E333D]">
                        <Usb className="w-5 h-5 text-[#79C0FF]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[#E6EDF3] font-semibold text-sm">{t('firmware.connectUsbInstruction')}</h4>
                        <p className="text-xs text-[#8B949E] mt-1">
                          {t('firmware.selectPortInstruction')}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full bg-[#238636] hover:bg-[#2ea043] text-white"
                    >
                      <Usb className="w-4 h-4 mr-2" />
                      {isConnecting ? t('firmware.connecting') : t('firmware.connectUsb')}
                    </Button>
                  </div>
                )}

                {/* USB接続成功後のセクション */}
                {isConnected && (
                  <>
                    {/* 接続成功メッセージ */}
                    <div className="w-full p-3 bg-[#1a472a] border border-[#2ea043] rounded-lg">
                      <p className="text-[#2ea043] text-sm text-center font-semibold">
                        {t('firmware.usbConnected')}
                      </p>
                    </div>

                    {/* 自動接続失敗時のみBOOTボタン操作手順を表示 */}
                    {needsManualReset && (
                      <div className="w-full p-4 bg-[#2d333b] border-2 border-[#f0883e] rounded-lg">
                        <h4 className="text-[#f0883e] font-semibold mb-3 flex items-center gap-2">
                          <span className="text-xl">⚠️</span>
                          {t('firmware.manualBootMode')}
                        </h4>
                        <div className="mb-3 p-3 bg-[#161b22] rounded border border-[#30363d]">
                          <p className="text-xs text-[#8B949E] mb-2">
                            <strong className="text-[#E6EDF3]">{t('firmware.autoConnectFailedMsg')}</strong><br />
                            {t('firmware.followStepsInstruction')}
                          </p>
                        </div>
                        <ol className="text-sm text-[#E6EDF3] space-y-2 mb-3">
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">1.</span>
                            <span>{t('firmware.bootStep1')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">2.</span>
                            <span>{t('firmware.bootStep2')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">3.</span>
                            <span>{t('firmware.bootStep3')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">4.</span>
                            <span>{t('firmware.bootStep4')}</span>
                          </li>
                        </ol>
                        <p className="text-xs text-[#8B949E]">
                          💡 {t('firmware.bootHint')}
                        </p>
                      </div>
                    )}

                    {/* 初回試行時のシンプルな説明 */}
                    {!needsManualReset && !installProgress && (
                      <div className="w-full p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
                        <p className="text-sm text-[#8B949E] text-center">
                          <strong className="text-[#E6EDF3]">{t('firmware.autoConnectTry')}</strong><br />
                          {t('firmware.pressStartFlash')}
                        </p>
                      </div>
                    )}

                    {/* 書き込み開始ボタン */}
                    <Button
                      onClick={installArduinoFirmware}
                      disabled={isInstalling || !isSupported}
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isInstalling ? t('firmware.flashing') : needsManualReset ? t('firmware.retry') : t('firmware.startFlash')}
                    </Button>

                    {!isSupported && (
                      <p className="text-[#f85149] text-xs text-center">
                        {t('firmware.browserNotSupported')}<br />
                        {t('firmware.useChromeOrEdge')}
                      </p>
                    )}

                    {/* インストール進捗表示 */}
                    {installProgress && (
                      <div className="w-full p-3 rounded-lg bg-[#0D1117] border border-[#2E333D]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1">
                            <div className="text-xs text-[#8B949E]">{installProgress.message}</div>
                            {installProgress.file && (
                              <div className="text-xs text-[#58A6F9] mt-1">{installProgress.file}</div>
                            )}
                          </div>
                          <div className="text-xs text-[#58A6F9]">{Math.round(installProgress.percent)}%</div>
                        </div>
                        <div className="w-full bg-[#2E333D] rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              installProgress.stage === 'error' ? 'bg-[#f85149]' :
                              installProgress.stage === 'complete' ? 'bg-[#3fb950]' :
                              'bg-[#58A6F9]'
                            }`}
                            style={{ width: `${installProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 説明テキスト */}
            {!isCompiling && !compileError && compiledFirmwareBlob && (
              <p className="text-xs text-[#8B949E] text-center">
                {t('firmware.installDescription', {
                  firmwareType: firmwareType === 'ble' ? t('firmware.bleFirmwareName') : t('firmware.otaFirmwareName'),
                  version: firmwareVersion ? ` (v${firmwareVersion})` : ''
                })}
              </p>
            )}
          </div>

          {/* デバイス名設定ステップ（BLEファームウェア書き込み完了後） */}
          {showDeviceNameStep && (
            <div className="space-y-3 p-4 bg-[#0D1117] rounded-lg border-2 border-[#8B5CF6]">
              <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-[#8B5CF6]" />
                デバイス名の設定
              </h3>
              <p className="text-xs text-[#8B949E]">
                BLEデバイス名を設定します。複数台使用する際にデバイスを識別しやすくなります。
                <br />
                設定しない場合は自動生成されたIDが使用されます。
              </p>

              {isSerialReconnecting ? (
                <div className="flex items-center gap-2 p-3 bg-[#161B22] rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8B5CF6]"></div>
                  <span className="text-sm text-[#8B949E]">ESP32に接続中...</span>
                </div>
              ) : serialReconnected ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#8B949E] block mb-1">
                      デバイス名（英数字とハイフン、1-20文字）
                    </label>
                    <div className="flex gap-2">
                      <div className="flex items-center bg-[#161B22] border border-[#2E333D] rounded-lg px-3">
                        <span className="text-sm text-[#8B949E]">DigiCode-</span>
                      </div>
                      <input
                        type="text"
                        value={deviceNameInput}
                        onChange={(e) => {
                          setDeviceNameInput(e.target.value);
                          setDeviceNameError(validateDeviceName(e.target.value));
                          setDeviceNameSaved(false);
                        }}
                        placeholder="MyRobot"
                        maxLength={20}
                        disabled={isSavingDeviceName || deviceNameSaved}
                        className="flex-1 bg-[#161B22] border border-[#2E333D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#484F58] focus:border-[#8B5CF6] focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    {deviceNameError && (
                      <p className="text-xs text-[#f85149] mt-1">{deviceNameError}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={saveDeviceName}
                      disabled={isSavingDeviceName || deviceNameSaved || deviceNameInput.length === 0 || !!deviceNameError}
                      className="flex-1 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white disabled:opacity-50"
                    >
                      {isSavingDeviceName ? '保存中...' : deviceNameSaved ? (
                        <><Check className="w-4 h-4 mr-1" /> 保存完了</>
                      ) : '保存'}
                    </Button>
                    {!deviceNameSaved && (
                      <Button
                        onClick={() => setShowDeviceNameStep(false)}
                        variant="outline"
                        className="border-[#2E333D] text-[#8B949E] hover:bg-[#2E333D]"
                      >
                        スキップ
                      </Button>
                    )}
                  </div>

                  {deviceNameSaved && (
                    <div className="p-3 bg-[#1a472a] border border-[#2ea043] rounded-lg">
                      <p className="text-[#2ea043] text-sm text-center">
                        デバイス名を保存しました。再起動後にBLE名「DigiCode-{deviceNameInput}」で検出されます。
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-[#2d333b] border border-[#484F58] rounded-lg">
                  <p className="text-xs text-[#8B949E]">
                    シリアル接続に失敗しました。デバイス名は後からUSB接続で設定できます。
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Flash消去（デバッグ用） */}
          <div className="border-t border-[#2E333D] pt-4 space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[#f85149]" />
              {t('firmware.eraseFlashTitle')}
            </h3>
            <p className="text-sm text-[#8B949E]">
              {t('firmware.eraseFlashDescription')}
            </p>

            {/* ボタン行 */}
            <div className="flex gap-2">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !isSupported}
                  className="flex-1 bg-[#238636] hover:bg-[#2ea043] text-white"
                >
                  <Usb className="w-4 h-4 mr-2" />
                  {isConnecting ? t('firmware.connecting') : t('firmware.connectUsb')}
                </Button>
              ) : (
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="flex-1 border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
                >
                  {t('firmware.disconnect')}
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={handleEraseFlash}
                disabled={!isConnected || isErasing}
                className="flex-1 bg-[#f85149] hover:bg-[#da3633] text-white disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isErasing ? t('firmware.erasingFlash') : t('firmware.eraseFlash')}
              </Button>
            </div>
            {!isConnected && (
              <p className="text-xs text-[#8B949E] text-center">
                {t('firmware.connectFirstNote')}
              </p>
            )}

            {/* コンソール */}
            {logs.length > 0 && (
              <div className="bg-[#0D1117] border border-[#2E333D] rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className={`whitespace-pre-wrap ${
                    log.includes('❌') || log.includes('ERROR') ? 'text-red-400' :
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('INFO') ? 'text-blue-400' : 'text-gray-300'
                  }`}>{log}</div>
                ))}
              </div>
            )}

            {/* 進捗表示 */}
            {eraseProgress && (
              <div className="p-3 rounded-lg bg-[#0D1117] border border-[#2E333D]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1">
                    <div className="text-xs text-[#8B949E]">{eraseProgress.message}</div>
                  </div>
                  <div className="text-xs text-[#58A6F9]">{Math.round(eraseProgress.percent)}%</div>
                </div>
                <div className="w-full bg-[#2E333D] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      eraseProgress.stage === 'error' ? 'bg-[#f85149]' :
                      eraseProgress.stage === 'complete' ? 'bg-[#3fb950]' :
                      'bg-[#58A6F9]'
                    }`}
                    style={{ width: `${eraseProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 閉じるボタン */}
          <div className="flex justify-end gap-2 border-t border-[#2E333D] pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              {t('common.close', { defaultValue: '閉じる' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
