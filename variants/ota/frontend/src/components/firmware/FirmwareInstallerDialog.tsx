import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Usb, Trash2 } from 'lucide-react';
import { firmwareService, type FlashProgress } from '@/services/firmwareService';
import { compileService } from '@/services/compileService';

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
  const [isErasing, setIsErasing] = useState(false);
  const [eraseProgress, setEraseProgress] = useState<FlashProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledFirmwareBlob, setCompiledFirmwareBlob] = useState<FirmwarePackage | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<FlashProgress | null>(null);
  const [needsManualReset, setNeedsManualReset] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // ファームウェアをコンパイル
  const compileFirmware = async () => {
    setIsCompiling(true);
    setCompileError(null);
    addLog('クラウドから最新ファームウェアをコンパイル中...');
    console.log('[FirmwareInstaller] Compiling latest firmware from cloud...');

    try {
      // DigiCodeOTAテンプレートをそのままコンパイル（空のコード）
      const result = await compileService.compile('', '', '', '', 'esp32:esp32:esp32', 'bin');

      if (!result.success) {
        throw new Error(result.error || 'Compilation failed');
      }

      // fullPackage または binary を保存
      if (result.fullPackage) {
        setCompiledFirmwareBlob(result.fullPackage);
        addLog('✅ 完全なファームウェアパッケージのコンパイルが完了しました');
        console.log('[FirmwareInstaller] ✓ Full firmware package compiled successfully');
      } else if (result.binary) {
        setCompiledFirmwareBlob(result.binary);
        addLog('✅ ファームウェアのコンパイルが完了しました');
        console.log('[FirmwareInstaller] ✓ Firmware compiled successfully');
      } else {
        throw new Error('Compilation returned neither binary nor fullPackage');
      }
    } catch (error) {
      console.error('[FirmwareInstaller] Compilation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown compilation error';
      setCompileError(errorMsg);
      addLog(`❌ コンパイルエラー: ${errorMsg}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // Arduino完全ファームウェアをインストール（USB接続は事前に完了済み）
  const installArduinoFirmware = async () => {
    if (!compiledFirmwareBlob) {
      addLog('❌ ファームウェアがコンパイルされていません');
      return;
    }

    if (!isConnected) {
      addLog('❌ USB接続が確立していません');
      return;
    }

    setIsInstalling(true);
    addLog('ファームウェアのインストールを開始します...');

    try {
      // 1. ファームウェアファイルを準備
      let firmwareBlob: Blob;
      let bootloaderBlob: Blob;
      let partitionsBlob: Blob;
      let bootApp0Blob: Blob;

      if (compiledFirmwareBlob instanceof Blob) {
        // 従来モード: 静的ファイルを取得
        addLog('bootloader/partitions/boot_app0 を読み込み中（従来モード）...');
        const [bootloaderRes, partitionsRes, bootApp0Res] = await Promise.all([
          fetch('/firmware/esp32/arduino/bootloader.bin'),
          fetch('/firmware/esp32/arduino/partitions.bin'),
          fetch('/firmware/esp32/arduino/boot_app0.bin')
        ]);

        if (!bootloaderRes.ok || !partitionsRes.ok || !bootApp0Res.ok) {
          throw new Error('静的ファイルの読み込みに失敗しました');
        }

        bootloaderBlob = await bootloaderRes.blob();
        partitionsBlob = await partitionsRes.blob();
        bootApp0Blob = await bootApp0Res.blob();
        firmwareBlob = compiledFirmwareBlob;

        addLog('✓ すべてのファイルを読み込みました');
      } else {
        // fullPackageモード: コンパイル時に取得した4ファイルを使用
        addLog('完全なファームウェアパッケージを使用します...');
        bootloaderBlob = compiledFirmwareBlob.bootloader;
        partitionsBlob = compiledFirmwareBlob.partitions;
        bootApp0Blob = compiledFirmwareBlob.bootApp0;
        firmwareBlob = compiledFirmwareBlob.firmware;

        addLog('✓ バージョン整合性が保証されたファームウェアパッケージを準備');
      }

      // 2. 完全なファームウェアを書き込み（USB接続は既に確立済み）
      addLog('ファームウェアを書き込み中...');
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
        addLog('✅ ファームウェアのインストールが完了しました！');
        setNeedsManualReset(false); // 成功したらフラグをリセット
      } else {
        // flashCompleteArduinoFirmware()がfalseを返した場合
        // すでにonProgressでエラーメッセージが設定されているので、それを保持
        addLog('❌ ファームウェアの書き込みに失敗しました');

        // エラーメッセージから自動接続失敗を判定
        const errorMsg = installProgress?.message || '';
        if (errorMsg.includes('Invalid head of packet') || errorMsg.includes('serial noise')) {
          addLog('💡 自動接続に失敗しました。手動でBOOTモードに入れてから再試行してください。');
          setNeedsManualReset(true);
        }
      }
    } catch (error) {
      console.error('[FirmwareInstaller] Installation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ インストールエラー: ${errorMsg}`);
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
    if (!open && isConnected) {
      firmwareService.disconnect();
      setIsConnected(false);
      setLogs([]);
    }
  }, [open, isConnected]);

  // ログ追加
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // 有線接続
  const handleConnect = async () => {
    setIsConnecting(true);
    setLogs([]);
    addLog('ESP32との接続を開始...');

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
        throw new Error('ESP32に接続できませんでした');
      }

      addLog(`✅ 接続成功: ${chipInfo.name}`);
      addLog(`MAC Address: ${chipInfo.mac}`);
      setIsConnected(true);
    } catch (error) {
      console.error('Connection error:', error);
      addLog(`❌ 接続エラー: ${(error as Error).message}`);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // 接続解除
  const handleDisconnect = async () => {
    addLog('接続を切断中...');
    await firmwareService.disconnect();
    setIsConnected(false);
    addLog('✅ 接続を切断しました');
  };

  // Flash全体を消去
  const handleEraseFlash = async () => {
    if (!confirm('Flash全体を消去します。保存されているすべてのデータ（UUID、WiFi設定など）が削除されます。よろしいですか？')) {
      return;
    }

    // 接続されていなければ先に接続
    if (!isConnected) {
      setIsConnecting(true);
      setLogs([]);
      addLog('Flash消去のため、ESP32との接続を開始...');

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
          throw new Error('ESP32に接続できませんでした');
        }

        addLog(`✅ 接続成功: ${chipInfo.name}`);
        addLog(`MAC Address: ${chipInfo.mac}`);
        setIsConnected(true);
      } catch (error) {
        console.error('Connection error:', error);
        addLog(`❌ 接続エラー: ${(error as Error).message}`);
        setIsConnecting(false);
        return; // 接続失敗したら消去しない
      } finally {
        setIsConnecting(false);
      }
    }

    // 消去実行
    setIsErasing(true);
    addLog('Flash全体を消去中...');

    try {
      setEraseProgress({
        stage: 'erasing',
        percent: 50,
        message: 'Flash全体を消去中...'
      });

      // firmwareServiceのloaderを使って直接消去
      // @ts-expect-error - private propertyにアクセス
      if (firmwareService.loader) {
        // @ts-expect-error - private propertyにアクセス
        await firmwareService.loader.eraseFlash();

        addLog('✅ Flash消去が完了しました');
        setEraseProgress({
          stage: 'complete',
          percent: 100,
          message: '✅ Flash消去が完了しました。ESP32をリセットしてください。'
        });
      } else {
        throw new Error('loaderが初期化されていません');
      }
    } catch (error) {
      console.error('Flash erase error:', error);
      const errorMsg = `消去エラー: ${(error as Error).message}`;
      addLog(`❌ ${errorMsg}`);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#161B22] border-[#2E333D]">
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
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 1</span>
              {t('firmware.step2Title')}
            </h3>
            <div className="space-y-2">
              {/* Arduino C++ */}
              <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-[#58A6F9] bg-[#0D1117]">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">🏆</span>
                    <p className="font-semibold text-[#E6EDF3]">{t('firmware.arduinoTitle')}</p>
                  </div>
                  <p className="text-xs text-[#8B949E] mt-1">{t('firmware.arduinoDesc')}</p>
                </div>
              </div>
            </div>

            {/* ビルド開始ボタン */}
            {!isCompiling && !compiledFirmwareBlob && !compileError && (
              <Button
                onClick={compileFirmware}
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-semibold py-3 mt-3"
              >
                🚀 ファームウェアをビルド
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
                🔄 再ビルド
              </Button>
            )}
          </div>

          {/* ファームウェア書き込み */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 2</span>
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
                  <strong>コンパイルエラー:</strong><br />
                  {compileError}
                </p>
              </div>
            )}

            {/* コンパイル中の表示 */}
            {isCompiling && (
              <div className="flex flex-col items-center gap-3 p-4 bg-[#0D1117] rounded-lg border-2 border-[#58A6F9]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#58A6F9]"></div>
                <p className="text-[#58A6F9] text-sm text-center">
                  最新ファームウェアをコンパイル中...<br />
                  <span className="text-xs text-[#8B949E]">
                    クラウドサーバー（Ubuntu → Railway フォールバック）
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
                    ✅ ファームウェアのコンパイルが完了しました
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
                        <h4 className="text-[#E6EDF3] font-semibold text-sm">ESP32をUSBケーブルでPCに接続してください</h4>
                        <p className="text-xs text-[#8B949E] mt-1">
                          接続後、下のボタンを押してポートを選択してください
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="w-full bg-[#238636] hover:bg-[#2ea043] text-white"
                    >
                      <Usb className="w-4 h-4 mr-2" />
                      {isConnecting ? '接続中...' : 'ESP32に有線接続'}
                    </Button>
                  </div>
                )}

                {/* USB接続成功後のセクション */}
                {isConnected && (
                  <>
                    {/* 接続成功メッセージ */}
                    <div className="w-full p-3 bg-[#1a472a] border border-[#2ea043] rounded-lg">
                      <p className="text-[#2ea043] text-sm text-center font-semibold">
                        ✅ USB接続が確立しました
                      </p>
                    </div>

                    {/* 自動接続失敗時のみBOOTボタン操作手順を表示 */}
                    {needsManualReset && (
                      <div className="w-full p-4 bg-[#2d333b] border-2 border-[#f0883e] rounded-lg">
                        <h4 className="text-[#f0883e] font-semibold mb-3 flex items-center gap-2">
                          <span className="text-xl">⚠️</span>
                          手動でBOOTモードに入れてください
                        </h4>
                        <div className="mb-3 p-3 bg-[#161b22] rounded border border-[#30363d]">
                          <p className="text-xs text-[#8B949E] mb-2">
                            <strong className="text-[#E6EDF3]">自動接続に失敗しました。</strong><br />
                            以下の手順でESP32を書き込みモードにしてから、再試行ボタンを押してください：
                          </p>
                        </div>
                        <ol className="text-sm text-[#E6EDF3] space-y-2 mb-3">
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">1.</span>
                            <span><strong className="text-[#f0883e]">BOOT</strong>ボタンを押し続ける</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">2.</span>
                            <span><strong className="text-[#f0883e]">BOOT</strong>を押したまま、<strong className="text-[#f0883e]">EN</strong>ボタンを一瞬押して離す</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">3.</span>
                            <span><strong className="text-[#f0883e]">BOOT</strong>ボタンを離す</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-[#f0883e] font-mono font-bold">4.</span>
                            <span>この状態で下の「再試行」ボタンを押す</span>
                          </li>
                        </ol>
                        <p className="text-xs text-[#8B949E]">
                          💡 ヒント: ボードによってはBOOTボタンが「IO0」「FLASH」「GPIO0」などと表記されている場合があります
                        </p>
                      </div>
                    )}

                    {/* 初回試行時のシンプルな説明 */}
                    {!needsManualReset && !installProgress && (
                      <div className="w-full p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
                        <p className="text-sm text-[#8B949E] text-center">
                          <strong className="text-[#E6EDF3]">自動接続を試行します。</strong><br />
                          そのまま「書き込み開始」ボタンを押してください。
                        </p>
                      </div>
                    )}

                    {/* 書き込み開始ボタン */}
                    <Button
                      onClick={installArduinoFirmware}
                      disabled={isInstalling || !isSupported}
                      className="w-full bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isInstalling ? '書き込み中...' : needsManualReset ? '🔄 再試行' : '▶ 書き込み開始'}
                    </Button>

                    {!isSupported && (
                      <p className="text-[#f85149] text-xs text-center">
                        お使いのブラウザはサポートされていません。<br />
                        Chrome または Edge をお使いください。
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
                INSTALLボタンを押してESP32にUSB接続し、最新のv1.4.0ファームウェアを書き込みます。
              </p>
            )}
          </div>

          {/* Flash消去（デバッグ用） */}
          <div className="border-t border-[#2E333D] pt-4 space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[#f85149]" />
              Flash全体を消去（デバッグ用）
            </h3>
            <p className="text-sm text-[#8B949E]">
              Flash全体を消去すると、保存されているすべてのデータ（UUID、WiFi設定など）が削除され、初期状態に戻ります。
            </p>

            {/* 有線接続ボタン */}
            <div className="flex gap-2">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={isConnecting || !isSupported}
                  className="flex-1 bg-[#238636] hover:bg-[#2ea043] text-white"
                >
                  <Usb className="w-4 h-4 mr-2" />
                  {isConnecting ? '接続中...' : 'ESP32に有線接続'}
                </Button>
              ) : (
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  className="flex-1 border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
                >
                  接続解除
                </Button>
              )}
            </div>

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

            <Button
              variant="destructive"
              onClick={handleEraseFlash}
              disabled={isErasing || isConnecting}
              className="w-full bg-[#f85149] hover:bg-[#da3633] text-white disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isErasing ? 'Flash消去中...' : isConnecting ? '接続中...' : 'Flash全体を消去'}
            </Button>
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
