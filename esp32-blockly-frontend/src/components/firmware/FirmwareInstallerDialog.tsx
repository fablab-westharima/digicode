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

export function FirmwareInstallerDialog({ open, onOpenChange }: FirmwareInstallerDialogProps) {
  const { t } = useTranslation();
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [firmwareType, setFirmwareType] = useState<'arduino' | 'micropython'>('arduino');
  const [espToolsReady, setEspToolsReady] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [eraseProgress, setEraseProgress] = useState<FlashProgress | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [compiledFirmwareUrl, setCompiledFirmwareUrl] = useState<string | null>(null);
  const [compileError, setCompileError] = useState<string | null>(null);

  // callback ref - DOM要素がマウントされたら呼ばれる
  const containerRef = (node: HTMLDivElement | null) => {
    if (node) {
      setContainerElement(node);
    }
  };

  // ファームウェアをコンパイル
  const compileFirmware = async () => {
    if (firmwareType !== 'arduino') {
      // MicroPythonは静的ファイルを使用
      return;
    }

    setIsCompiling(true);
    setCompileError(null);
    console.log('[FirmwareInstaller] Compiling latest firmware from cloud...');

    try {
      // DigiCodeOTAテンプレートをそのままコンパイル（空のコード）
      const result = await compileService.compile('', '', '', '', 'esp32:esp32:esp32', 'bin');

      if (!result.success || !result.binary) {
        throw new Error(result.error || 'Compilation failed');
      }

      // Blob URLを作成
      const blobUrl = URL.createObjectURL(result.binary);
      setCompiledFirmwareUrl(blobUrl);
      console.log('[FirmwareInstaller] ✓ Firmware compiled successfully');
    } catch (error) {
      console.error('[FirmwareInstaller] Compilation error:', error);
      setCompileError(error instanceof Error ? error.message : 'Unknown compilation error');
    } finally {
      setIsCompiling(false);
    }
  };

  // ダイアログが開いたときにファームウェアをコンパイル
  useEffect(() => {
    if (open && firmwareType === 'arduino') {
      compileFirmware();
    }

    // クリーンアップ: Blob URLを解放
    return () => {
      if (compiledFirmwareUrl) {
        URL.revokeObjectURL(compiledFirmwareUrl);
      }
    };
  }, [open, firmwareType]);

  // esp-web-toolsを事前ロード
  useEffect(() => {
    if (!open) return;
    import('esp-web-tools').then(() => {
      setEspToolsReady(true);
    });
  }, [open]);

  // ダイアログが閉じられた時のクリーンアップ
  useEffect(() => {
    if (!open && isConnected) {
      firmwareService.disconnect();
      setIsConnected(false);
      setLogs([]);
    }
  }, [open, isConnected]);

  // ボタン生成
  useEffect(() => {
    if (!espToolsReady || !containerElement || !open) return;

    // Arduinoの場合は、コンパイル完了を待つ
    if (firmwareType === 'arduino' && !compiledFirmwareUrl && !compileError) {
      return;
    }

    const container = containerElement;

    // カスタム要素を動的に作成
    const installButton = document.createElement('esp-web-install-button');

    let manifestUrl: string;

    if (firmwareType === 'arduino' && compiledFirmwareUrl) {
      // 動的マニフェストを生成（コンパイルされたファームウェアを使用）
      const manifest = {
        name: "DigiCode Arduino C++ Firmware",
        version: "1.4.0",
        new_install_prompt_erase: true,
        builds: [
          {
            chipFamily: "ESP32",
            name: "DigiCode競技用（Arduino C++ / 推奨）",
            parts: [
              {
                path: "/firmware/esp32/arduino/bootloader.bin",
                offset: 4096
              },
              {
                path: "/firmware/esp32/arduino/partitions.bin",
                offset: 32768
              },
              {
                path: "/firmware/esp32/arduino/boot_app0.bin",
                offset: 57344
              },
              {
                path: compiledFirmwareUrl,  // 動的にコンパイルされたファームウェア
                offset: 65536
              }
            ]
          }
        ]
      };

      // マニフェストをJSON Blobに変換してURLを作成
      const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      manifestUrl = URL.createObjectURL(manifestBlob);
    } else {
      // MicroPythonは静的マニフェストを使用
      manifestUrl = '/firmware/manifest-micropython.json';
    }

    installButton.setAttribute('manifest', manifestUrl);

    // アクティベートボタン
    const activateButton = document.createElement('button');
    activateButton.setAttribute('slot', 'activate');
    activateButton.className = 'bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-colors';
    activateButton.textContent = 'INSTALL';
    installButton.appendChild(activateButton);

    // 非サポートメッセージ
    const unsupportedSpan = document.createElement('span');
    unsupportedSpan.setAttribute('slot', 'unsupported');
    unsupportedSpan.innerHTML = `
      <div class="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg text-center">
        <p class="text-[#f85149] text-sm">
          お使いのブラウザはサポートされていません。<br/>
          Chrome または Edge をお使いください。
        </p>
      </div>
    `;
    installButton.appendChild(unsupportedSpan);

    // 許可されていないメッセージ
    const notAllowedSpan = document.createElement('span');
    notAllowedSpan.setAttribute('slot', 'not-allowed');
    notAllowedSpan.innerHTML = `
      <div class="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg text-center">
        <p class="text-[#f85149] text-sm">
          HTTPSまたはlocalhostでのみ動作します。
        </p>
      </div>
    `;
    installButton.appendChild(notAllowedSpan);

    // イベントリスナー
    installButton.addEventListener('state-changed', (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.log('ESP Web Tools state:', detail);
    });

    container.innerHTML = '';
    container.appendChild(installButton);
  }, [espToolsReady, containerElement, firmwareType, open, compiledFirmwareUrl, compileError]);

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
    if (!isConnected) {
      addLog('❌ 先に有線接続してください');
      return;
    }

    if (!confirm('Flash全体を消去します。保存されているすべてのデータ（UUID、WiFi設定など）が削除されます。よろしいですか？')) {
      return;
    }

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
          {/* USB接続の説明 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 1</span>
              {t('firmware.step1Title')}
            </h3>
            <div className="p-4 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#2E333D]">
                  <Usb className="w-5 h-5 text-[#79C0FF]" />
                </div>
                <p className="text-sm text-[#8B949E]">
                  {t('firmware.step1Desc')}
                </p>
              </div>
            </div>
          </div>

          {/* ファームウェア選択 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 2</span>
              {t('firmware.step2Title')}
            </h3>
            <div className="space-y-2">
              {/* Arduino C++ */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  firmwareType === 'arduino'
                    ? 'border-[#58A6F9] bg-[#0D1117]'
                    : 'border-[#2E333D] bg-[#0D1117] hover:border-[#3E434D]'
                }`}
              >
                <input
                  type="radio"
                  name="firmware"
                  value="arduino"
                  checked={firmwareType === 'arduino'}
                  onChange={(e) => setFirmwareType(e.target.value as 'arduino')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">🏆</span>
                    <p className="font-semibold text-[#E6EDF3]">{t('firmware.arduinoTitle')}</p>
                  </div>
                  <p className="text-xs text-[#8B949E] mt-1">{t('firmware.arduinoDesc')}</p>
                </div>
              </label>

              {/* MicroPython */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  firmwareType === 'micropython'
                    ? 'border-[#58A6F9] bg-[#0D1117]'
                    : 'border-[#2E333D] bg-[#0D1117] hover:border-[#3E434D]'
                }`}
              >
                <input
                  type="radio"
                  name="firmware"
                  value="micropython"
                  checked={firmwareType === 'micropython'}
                  onChange={(e) => setFirmwareType(e.target.value as 'micropython')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">📚</span>
                    <p className="font-semibold text-[#E6EDF3]">{t('firmware.micropythonTitle')}</p>
                  </div>
                  <p className="text-xs text-[#8B949E] mt-1">{t('firmware.micropythonDesc')}</p>
                </div>
              </label>
            </div>
          </div>

          {/* ファームウェア書き込み */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className="bg-[#1f6feb] text-[#58A6F9] text-xs font-medium px-2 py-0.5 rounded">Step 3</span>
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
            {compileError && firmwareType === 'arduino' && (
              <div className="bg-[#3d2626] border border-[#da3633] p-4 rounded-lg">
                <p className="text-[#f85149] text-sm">
                  <strong>コンパイルエラー:</strong><br />
                  {compileError}
                </p>
              </div>
            )}

            {/* コンパイル中の表示 */}
            {isCompiling && firmwareType === 'arduino' && (
              <div className="flex flex-col items-center gap-3 p-4 bg-[#0D1117] rounded-lg border-2 border-[#58A6F9]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#58A6F9]"></div>
                <p className="text-[#58A6F9] text-sm">
                  最新ファームウェアをコンパイル中...<br />
                  <span className="text-xs text-[#8B949E]">
                    クラウドサーバー（Ubuntu → Railway フォールバック）
                  </span>
                </p>
              </div>
            )}

            {/* esp-web-toolsのインストールボタン */}
            {isSupported && !isCompiling && !compileError && (
              <div className="flex flex-col items-center gap-4 p-4 bg-[#0D1117] rounded-lg border-2 border-dashed border-[#2E333D]" ref={containerRef}>
                <div className="text-[#8B949E]">{t('common.loading')}</div>
              </div>
            )}

            {!isCompiling && !compileError && (
              <p className="text-xs text-[#8B949E] text-center">
                {t('firmware.step3Desc')}
              </p>
            )}
          </div>

          {/* USBドライバー */}
          <div className="border-t border-[#2E333D] pt-4 space-y-2">
            <h3 className="font-semibold text-sm text-[#E6EDF3]">{t('firmware.usbDriver')}</h3>
            <p className="text-sm text-[#8B949E]">
              {t('firmware.usbDriverDesc')}
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
                <a
                  href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Windows
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
                <a
                  href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mac
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
                <a
                  href="https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Linux
                </a>
              </Button>
            </div>
            <p className="text-xs text-[#8B949E] mt-2">
              {t('firmware.usbDriverNote')}
            </p>
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
              disabled={!isConnected || isErasing}
              className="w-full bg-[#f85149] hover:bg-[#da3633] text-white disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isErasing ? 'Flash消去中...' : 'Flash全体を消去'}
            </Button>
            {!isConnected && (
              <p className="text-xs text-[#8B949E] text-center">
                ※ 先に「ESP32に有線接続」してください
              </p>
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
