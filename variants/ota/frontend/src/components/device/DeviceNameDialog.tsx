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
import { Usb, Check, Pencil } from 'lucide-react';
import { useSerialStore } from '@/stores/serialStore';

// シリアルコンソール表示コンポーネント
function SerialConsole() {
  const { output } = useSerialStore();
  const [expanded, setExpanded] = useState(false);

  // 最新20行を表示
  const lines = output.slice(-20);

  return (
    <div className="border-t border-[#2E333D] pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[#484F58] hover:text-[#8B949E] flex items-center gap-1"
      >
        {expanded ? '▾' : '▸'} シリアルコンソール
      </button>
      {expanded && (
        <div className="mt-2 bg-[#0D1117] border border-[#2E333D] rounded-lg p-2 h-40 overflow-y-auto font-mono text-xs">
          {lines.map((line: string, i: number) => (
            <div key={i} className={`whitespace-pre-wrap ${
              line.includes('ERROR') || line.includes('assert failed') ? 'text-red-400' :
              line.includes('OK:') || line.includes('SUCCESS') ? 'text-green-400' :
              line.includes('BLE Name:') || line.includes('Device config') ? 'text-yellow-300' :
              'text-gray-400'
            }`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DeviceNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceNameDialog({ open, onOpenChange }: DeviceNameDialogProps) {
  const { t } = useTranslation();
  const { status, connect, disconnect, send, resetESP32 } = useSerialStore();

  const [deviceName, setDeviceName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [deviceUuid, setDeviceUuid] = useState('');
  const [nameError, setNameError] = useState('');
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // バリデーション（英数字+ハイフン、1-20文字、先頭末尾ハイフン禁止）
  const validateName = (name: string): string => {
    if (name.length === 0) return '';
    if (name.length > 20) return '20文字以内で入力してください';
    if (!/^[a-zA-Z0-9-]+$/.test(name)) return '英数字とハイフン(-)のみ使用できます';
    if (name.startsWith('-') || name.endsWith('-')) return '先頭・末尾にハイフンは使えません';
    return '';
  };

  // 応答待ちヘルパー（startIndex以降の出力のみチェック）
  const waitForResponse = async (keyword: string, startIndex: number, maxWaitMs: number = 10000): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const currentOutput = useSerialStore.getState().output;
      const newOutput = currentOutput.slice(startIndex);
      if (newOutput.some((line: string) => line.includes(keyword))) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return false;
  };

  // デバイス名を起動ログからパース
  const loadDeviceName = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage('デバイス情報を読み込み中...');

    let foundName = '';
    let foundUuid = '';

    for (let i = 0; i < 5; i++) {
      const currentOutput = useSerialStore.getState().output;
      const reversedOutput = [...currentOutput].reverse();

      // UUID
      const uuidLine = reversedOutput.find((line: string) =>
        line.includes('UUID:')
      );
      if (uuidLine) {
        const match = uuidLine.match(/UUID:\s*(.+)/i);
        if (match && match[1].trim()) {
          foundUuid = match[1].trim();
        }
      }

      // デバイス名（"Name: xxx" パターン、"(not set)"は空として扱う）
      const nameLine = reversedOutput.find((line: string) =>
        line.includes('Name:') && !line.includes('BLE Name:')
      );
      if (nameLine) {
        const match = nameLine.match(/Name:\s*(.+)/i);
        if (match && match[1].trim() && match[1].trim() !== '(not set)') {
          foundName = match[1].trim();
        }
      }

      if (foundUuid) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setDeviceUuid(foundUuid);
    setDeviceName(foundName);
    setOriginalName(foundName);
    setIsLoading(false);
    setStatusMessage('');
  }, []);

  // USB接続→リセット→Ready待ち→デバイス名読み込み
  const handleConnect = async () => {
    setStatusMessage('ESP32に接続中...');
    try {
      await connect();
    } catch {
      setStatusMessage('接続に失敗しました。');
      return;
    }
  };

  // 接続状態を監視してリセット→Ready待ち
  useEffect(() => {
    if (status !== 'connected' || isDeviceReady) return;

    const initDevice = async () => {
      setStatusMessage('ESP32をリセット中...');
      await resetESP32();

      setStatusMessage('起動を待っています...');
      const startIndex = useSerialStore.getState().output.length;
      const ready = await waitForResponse('Ready.', startIndex, 15000);

      if (ready) {
        setIsDeviceReady(true);
        await loadDeviceName();
      } else {
        setStatusMessage('起動タイムアウト。もう一度試してください。');
      }
    };

    initDevice();
  }, [status, isDeviceReady, resetESP32, loadDeviceName]);

  // デバイス名を保存して再起動
  const handleSave = async () => {
    const error = validateName(deviceName);
    if (error) {
      setNameError(error);
      return;
    }

    setIsSaving(true);
    setIsSaved(false);
    setStatusMessage('デバイス名を保存中...');

    try {
      const startIndex = useSerialStore.getState().output.length;

      await send(`SET_NAME:${deviceName.trim()}`);
      await new Promise(resolve => setTimeout(resolve, 200));
      await send('SAVE_CONFIG');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 保存確認
      const saved = await waitForResponse('CONFIG_SAVED', startIndex, 5000);

      if (saved) {
        setStatusMessage('再起動して新しい名前を適用中...');
        await resetESP32();

        const resetIndex = useSerialStore.getState().output.length;
        const ready = await waitForResponse('Ready.', resetIndex, 15000);

        if (ready) {
          // 再起動後のBLE名を確認
          await new Promise(resolve => setTimeout(resolve, 500));
          const output = useSerialStore.getState().output;
          const bleNameLine = [...output].reverse().find((line: string) => line.includes('BLE Name:'));
          const bleName = bleNameLine?.match(/BLE Name:\s*(.+)/)?.[1] || `DigiCode-${deviceName}`;

          setIsSaved(true);
          setOriginalName(deviceName);
          setStatusMessage(`保存完了。BLE名: ${bleName}`);
        } else {
          setStatusMessage('保存完了。再起動のタイムアウト（名前は保存済み）。');
          setIsSaved(true);
        }
      } else {
        setStatusMessage('保存に失敗しました。もう一度試してください。');
      }
    } catch (error) {
      console.error('[DeviceNameDialog] Save error:', error);
      setStatusMessage('エラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  };

  // ダイアログクローズ時のクリーンアップ
  useEffect(() => {
    if (!open) {
      if (status === 'connected') {
        disconnect();
      }
      setIsDeviceReady(false);
      setDeviceName('');
      setOriginalName('');
      setDeviceUuid('');
      setNameError('');
      setIsSaved(false);
      setStatusMessage('');
    }
  }, [open, status, disconnect]);

  const isConnected = status === 'connected';
  const hasChanged = deviceName !== originalName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md bg-[#161B22] border-[#2E333D]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[#E6EDF3] flex items-center gap-2">
            <Pencil className="w-5 h-5 text-[#8B5CF6]" />
            デバイス名の設定
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            ESP32のデバイス名を設定します。BLE/WiFi OTAでデバイスを識別する名前になります。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: USB接続 */}
          {!isConnected ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
                <span className="bg-[#1f6feb] text-white text-xs font-medium px-2 py-0.5 rounded">Step 1</span>
                USB接続
              </h3>
              <p className="text-xs text-[#8B949E]">
                ESP32をUSBケーブルでPCに接続し、下のボタンをクリックしてください。
              </p>
              <Button
                onClick={handleConnect}
                className="w-full bg-[#238636] hover:bg-[#2ea043] text-white"
              >
                <Usb className="w-4 h-4 mr-2" />
                ESP32にUSB接続
              </Button>
            </div>
          ) : !isDeviceReady ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
                <span className="bg-[#1f6feb] text-white text-xs font-medium px-2 py-0.5 rounded">Step 1</span>
                USB接続
              </h3>
              <div className="flex items-center gap-2 p-3 bg-[#0D1117] rounded-lg border border-[#2E333D]">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8B5CF6]"></div>
                <span className="text-sm text-[#8B949E]">{statusMessage || '接続中...'}</span>
              </div>
            </div>
          ) : (
            <>
              {/* 接続済み表示 */}
              <div className="flex items-center justify-between p-2 bg-[#1a472a] border border-[#2ea043] rounded-lg">
                <span className="text-sm text-[#2ea043]">
                  <Check className="w-4 h-4 inline mr-1" />
                  ESP32に接続済み
                </span>
                <Button
                  onClick={() => { disconnect(); setIsDeviceReady(false); }}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-[#8B949E] hover:text-[#E6EDF3]"
                >
                  切断
                </Button>
              </div>

              {/* Step 2: デバイス名 */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
                  <span className="bg-[#8B5CF6] text-white text-xs font-medium px-2 py-0.5 rounded">Step 2</span>
                  デバイス名
                </h3>

                {isLoading ? (
                  <div className="flex items-center gap-2 p-3 bg-[#0D1117] rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#8B5CF6]"></div>
                    <span className="text-sm text-[#8B949E]">読み込み中...</span>
                  </div>
                ) : (
                  <>
                    {deviceUuid && (
                      <p className="text-xs text-[#484F58]">UUID: {deviceUuid}</p>
                    )}

                    <div>
                      <label className="text-xs text-[#8B949E] block mb-1">
                        デバイス名（英数字とハイフン、1-20文字）
                      </label>
                      <div className="flex gap-2">
                        <div className="flex items-center bg-[#0D1117] border border-[#2E333D] rounded-lg px-3 shrink-0">
                          <span className="text-sm text-[#484F58]">DigiCode-</span>
                        </div>
                        <input
                          type="text"
                          value={deviceName}
                          onChange={(e) => {
                            setDeviceName(e.target.value);
                            setNameError(validateName(e.target.value));
                            setIsSaved(false);
                          }}
                          placeholder="MyRobot"
                          maxLength={20}
                          disabled={isSaving}
                          className="flex-1 bg-[#0D1117] border border-[#2E333D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#484F58] focus:border-[#8B5CF6] focus:outline-none disabled:opacity-50"
                        />
                      </div>
                      {nameError && (
                        <p className="text-xs text-[#f85149] mt-1">{nameError}</p>
                      )}
                    </div>

                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !hasChanged || deviceName.length === 0 || !!nameError}
                      className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white disabled:opacity-50"
                    >
                      {isSaving ? '保存中...' : isSaved ? (
                        <><Check className="w-4 h-4 mr-1" /> 保存完了</>
                      ) : '保存して再起動'}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {/* ステータスメッセージ */}
          {statusMessage && isDeviceReady && (
            <div className={`p-3 rounded-lg text-sm text-center ${
              isSaved
                ? 'bg-[#1a472a] border border-[#2ea043] text-[#2ea043]'
                : 'bg-[#0D1117] border border-[#2E333D] text-[#8B949E]'
            }`}>
              {statusMessage}
            </div>
          )}

          {/* シリアルコンソール */}
          {isConnected && (
            <SerialConsole />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
