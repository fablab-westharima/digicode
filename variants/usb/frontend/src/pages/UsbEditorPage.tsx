/**
 * USB版エディタページ
 *
 * USB経由でESP32にプログラムを書き込むためのエディタ
 * OTA/WiFi機能なし、USB書込み専用
 */

import { useState, useCallback, useRef } from 'react';
import { Usb, Play, Terminal, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { usbFirmwareService } from '../services/usbFirmwareService';
import { usbCompileService } from '../services/usbCompileService';
import type { FlashProgress, ChipInfo } from '../types/flash';
import type { FullPackage } from '../types/compile';

export function UsbEditorPage() {
  // 状態管理
  const [isConnected, setIsConnected] = useState(false);
  const [chipInfo, setChipInfo] = useState<ChipInfo | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashProgress, setFlashProgress] = useState<FlashProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // テスト用のコード（後でBlocklyエディタに置き換え）
  const [setupCode, setSetupCode] = useState('pinMode(2, OUTPUT);');
  const [loopCode, setLoopCode] = useState(`digitalWrite(2, HIGH);
delay(500);
digitalWrite(2, LOW);
delay(500);`);

  // コンパイル結果
  const compiledPackageRef = useRef<FullPackage | null>(null);

  // ログ追加
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // USB接続
  const handleConnect = async () => {
    setError(null);
    addLog('デバイスに接続中...');

    const info = await usbFirmwareService.connect((progress) => {
      addLog(progress.message);
      if (progress.stage === 'error') {
        setError(progress.message);
      }
    });

    if (info) {
      setChipInfo(info);
      setIsConnected(true);
      addLog(`✓ 接続成功: ${info.name} (MAC: ${info.mac})`);
    }
  };

  // USB切断
  const handleDisconnect = async () => {
    await usbFirmwareService.disconnect();
    setIsConnected(false);
    setChipInfo(null);
    addLog('切断しました');
  };

  // コンパイル
  const handleCompile = async () => {
    setIsCompiling(true);
    setError(null);
    addLog('コンパイル開始...');

    try {
      const result = await usbCompileService.compile({
        includes: '',
        globals: '',
        setupCode,
        loopCode,
        board: 'esp32:esp32:esp32'
      });

      if (result.success && result.fullPackage) {
        compiledPackageRef.current = result.fullPackage;
        addLog('✓ コンパイル成功');
      } else {
        setError(result.error || 'コンパイルに失敗しました');
        addLog(`✗ コンパイル失敗: ${result.error}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(message);
      addLog(`✗ エラー: ${message}`);
    } finally {
      setIsCompiling(false);
    }
  };

  // USB書き込み
  const handleFlash = async () => {
    if (!compiledPackageRef.current) {
      setError('先にコンパイルしてください');
      return;
    }

    if (!isConnected) {
      setError('先にデバイスに接続してください');
      return;
    }

    setIsFlashing(true);
    setError(null);
    addLog('書き込み開始...');

    const success = await usbFirmwareService.flashFirmware(
      compiledPackageRef.current,
      (progress) => {
        setFlashProgress(progress);
        addLog(progress.message);
        if (progress.stage === 'error') {
          setError(progress.message);
        }
      }
    );

    setIsFlashing(false);
    if (success) {
      addLog('✓ 書き込み完了！');
    }
  };

  // ポート解放
  const handleReleasePort = async () => {
    addLog('ポートを解放中...');
    await usbFirmwareService.releaseAllPorts();
    setIsConnected(false);
    setChipInfo(null);
    addLog('✓ ポートを解放しました');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ヘッダー */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Usb className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">DigiCode USB</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">β</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="px-3 py-1.5 text-sm bg-destructive/20 text-destructive rounded hover:bg-destructive/30"
            >
              切断
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              接続
            </button>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* 左パネル: エディタ（後でBlocklyに置き換え） */}
        <div className="flex-1 p-4 border-r border-border">
          <div className="mb-4">
            <h2 className="text-sm font-semibold mb-2 text-muted-foreground">setup()</h2>
            <textarea
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              className="w-full h-24 bg-card border border-border rounded p-2 text-sm font-mono resize-none"
              placeholder="setup() のコードを入力..."
            />
          </div>
          <div className="mb-4">
            <h2 className="text-sm font-semibold mb-2 text-muted-foreground">loop()</h2>
            <textarea
              value={loopCode}
              onChange={(e) => setLoopCode(e.target.value)}
              className="w-full h-48 bg-card border border-border rounded p-2 text-sm font-mono resize-none"
              placeholder="loop() のコードを入力..."
            />
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <button
              onClick={handleCompile}
              disabled={isCompiling || isFlashing}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 disabled:opacity-50"
            >
              {isCompiling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              コンパイル
            </button>
            <button
              onClick={handleFlash}
              disabled={!compiledPackageRef.current || !isConnected || isFlashing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
              {isFlashing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Usb className="w-4 h-4" />
              )}
              書き込み
            </button>
          </div>

          {/* 進捗バー */}
          {flashProgress && isFlashing && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{flashProgress.message}</span>
                <span>{Math.round(flashProgress.percent)}%</span>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${flashProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* エラー表示 */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/20 text-destructive rounded flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 右パネル: 状態とログ */}
        <div className="w-80 flex flex-col">
          {/* デバイス状態 */}
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Usb className="w-4 h-4" />
              デバイス状態
            </h2>
            {isConnected && chipInfo ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-500">
                  <Check className="w-4 h-4" />
                  <span>接続中</span>
                </div>
                <div className="text-muted-foreground">
                  <p>チップ: {chipInfo.name}</p>
                  <p className="font-mono text-xs">MAC: {chipInfo.mac}</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>未接続</p>
                <p className="text-xs mt-1">「接続」ボタンでESP32を選択</p>
              </div>
            )}
            <button
              onClick={handleReleasePort}
              className="mt-3 text-xs text-destructive hover:underline"
            >
              ポートを強制解放
            </button>
          </div>

          {/* ログ */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                ログ
              </h2>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                クリア
              </button>
            </div>
            <div className="flex-1 p-2 overflow-y-auto bg-card/50">
              <div className="font-mono text-xs space-y-0.5">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">ログはありません</p>
                ) : (
                  logs.map((log, i) => (
                    <p key={i} className="text-muted-foreground">{log}</p>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
