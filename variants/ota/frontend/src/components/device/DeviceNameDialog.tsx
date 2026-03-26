import { useEffect, useState, useCallback, useRef } from 'react';
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
        <div className="mt-2 bg-[#0D1117] border border-[#2E333D] rounded-lg p-2 h-40 overflow-x-auto overflow-y-auto font-mono text-xs">
          {lines.map((line: string, i: number) => (
            <div key={i} className={`whitespace-pre ${
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
      // BLEファームウェアは"Ready."、WiFiファームウェアは"System Ready!"を出力する
      const ready = await waitForResponse('Ready', startIndex, 15000);

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

  // ダイアログが閉じた瞬間のみクリーンアップ（open: true→falseの変化時のみ）
  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current && !open) {
      // ダイアログが開→閉に変わった時だけ切断
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
    prevOpen.current = open;
  }, [open, status, disconnect]);

  const isConnected = status === 'connected';
  const hasChanged = deviceName !== originalName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-[#8B5CF6]" />
            デバイス名の設定
          </DialogTitle>
          <DialogDescription>
            ESP32のデバイス名を設定します。BLE/WiFi OTAでデバイスを識別する名前になります。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* STEP 1: USB接続 */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${isDeviceReady ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                Step 1
              </span>
              USB接続
              {isDeviceReady && <Check className="w-4 h-4 text-green-500" />}
            </h3>
            <div className="p-3 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#161B22]">
                    <Usb className="w-5 h-5 text-[#8B949E]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#E6EDF3]">
                      {isConnected ? 'ESP32に接続済み' : 'ESP32をUSBケーブルで接続'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-xs text-[#8B949E]">
                        {isConnected ? '接続済み' : '未接続'}
                      </span>
                    </div>
                  </div>
                </div>
                {isConnected ? (
                  <Button variant="outline" size="sm" onClick={() => { disconnect(); setIsDeviceReady(false); }}>
                    切断
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleConnect}>
                    接続
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ESP32起動待ち中 */}
          {isConnected && !isDeviceReady && (
            <div className="p-4 rounded-lg border-2 border-yellow-600/50 bg-yellow-900/20">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full" />
                <div>
                  <p className="text-sm font-medium text-yellow-400">{statusMessage || 'ESP32起動待ち中...'}</p>
                  <p className="text-xs text-[#8B949E]">起動完了を検知するまでお待ちください</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: デバイス名 */}
          {isConnected && isDeviceReady && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-[#E6EDF3] flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${isSaved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                  Step 2
                </span>
                デバイス名
                {isSaved && <Check className="w-4 h-4 text-green-500" />}
              </h3>

              {isLoading ? (
                <div className="p-4 rounded-lg border-2 border-[#2E333D] bg-[#0D1117]">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                    <span className="text-sm text-[#8B949E]">デバイス情報を読み込み中...</span>
                  </div>
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
                      className="w-full bg-[#0D1117] border border-[#2E333D] rounded-lg px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#484F58] focus:border-[#8B5CF6] focus:outline-none disabled:opacity-50"
                    />
                    {nameError && (
                      <p className="text-xs text-[#f85149] mt-1">{nameError}</p>
                    )}
                  </div>

                  {/* ステータスメッセージ */}
                  {statusMessage && (
                    <div className={`p-3 rounded-lg text-sm ${
                      isSaved
                        ? 'bg-[#1a472a] border border-[#2ea043] text-[#2ea043]'
                        : 'bg-[#0D1117] border border-[#2E333D] text-[#8B949E]'
                    }`}>
                      {statusMessage}
                    </div>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isSaved || !hasChanged || deviceName.length === 0 || !!nameError}
                    className="w-full bg-[#238636] hover:bg-[#2ea043] text-white disabled:opacity-50"
                  >
                    {isSaving ? '保存中...' : isSaved ? (
                      <><Check className="w-4 h-4 mr-1" /> 保存完了</>
                    ) : '設定を保存'}
                  </Button>
                </>
              )}
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
