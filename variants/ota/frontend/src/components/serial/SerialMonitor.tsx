import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSerialStore } from '@/stores/serialStore';
import { useWifiStore } from '@/stores/wifiStore';
import { useTranslation } from 'react-i18next';
import { Plug, Unplug } from 'lucide-react';

interface SerialMonitorProps {
  className?: string;
}

export function SerialMonitor({ className }: SerialMonitorProps) {
  const { t } = useTranslation();
  const {
    output: serialOutput,
    send: serialSend,
    clearOutput: serialClear,
    status: serialStatus,
    connect: serialConnect,
    disconnect: serialDisconnect,
  } = useSerialStore();
  const { status: wifiStatus } = useWifiStore();

  const [inputValue, setInputValue] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  const output = useMemo(() => {
    const combined: string[] = [];
    if (serialStatus === 'connected' && serialOutput.length > 0) {
      combined.push(...serialOutput);
    }
    return combined;
  }, [serialOutput, serialStatus]);

  const status = serialStatus === 'connected' ? 'connected' :
                 wifiStatus === 'connected' ? 'connected' :
                 'disconnected';

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  const handleSend = async () => {
    if (inputValue.trim() && status === 'connected') {
      if (serialStatus === 'connected') {
        await serialSend(inputValue);
      }
      setInputValue('');
    }
  };

  const clearOutput = () => {
    serialClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-[#0D1117] border border-[#2E333D] overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161B22] border-b border-[#2E333D]">
        <span className="text-sm text-foreground font-medium">
          {t('editor.menu.serialMonitor', { defaultValue: 'シリアルモニター' })}
        </span>
        <div className="flex items-center gap-2">
          {/* USB connect/disconnect toggle (BLE UAT 後の reconnect 用、2026-04-30 追加) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (serialStatus === 'connected' ? serialDisconnect() : serialConnect())}
            disabled={serialStatus === 'connecting'}
            className={`text-xs h-6 px-2 ${
              serialStatus === 'connected'
                ? 'text-green-500 hover:text-green-400'
                : serialStatus === 'connecting'
                  ? 'text-yellow-400'
                  : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {serialStatus === 'connected' ? (
              <>
                <Unplug className="w-3 h-3 mr-1" />
                {t('editor.serial.disconnectUsb', { defaultValue: 'USB 切断' })}
              </>
            ) : serialStatus === 'connecting' ? (
              t('editor.serial.connecting', { defaultValue: '接続中...' })
            ) : (
              <>
                <Plug className="w-3 h-3 mr-1" />
                {t('editor.serial.connectUsb', { defaultValue: 'USB 接続' })}
              </>
            )}
          </Button>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            {t('editor.serial.autoScroll', { defaultValue: '自動スクロール' })}
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearOutput}
            className="text-xs text-muted-foreground hover:text-foreground h-6 px-2"
          >
            {t('editor.serial.clear', { defaultValue: 'クリア' })}
          </Button>
        </div>
      </div>

      {/* 出力エリア */}
      <div
        ref={outputRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-sm text-[#E6EDF3] bg-[#0D1117]"
        style={{ minHeight: '200px' }}
      >
        {output.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#8B949E] text-sm">
            {status === 'connected'
              ? t('editor.serial.waiting', { defaultValue: 'ESP32からのデータを待機中...' })
              : t('editor.serial.connectPrompt', { defaultValue: 'ESP32に接続してください' })}
          </div>
        ) : (
          output.map((line, index) => (
            <div key={index} className={line.startsWith('>') ? 'text-green-400' : ''}>
              {line}
            </div>
          ))
        )}
      </div>

      {/* 入力エリア */}
      <div className="flex gap-2 p-2 bg-[#161B22] border-t border-[#2E333D]">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('editor.serial.sendPlaceholder', { defaultValue: '送信するメッセージ...' })}
          disabled={status !== 'connected'}
          className="flex-1"
        />
        <Button
          onClick={handleSend}
          disabled={status !== 'connected' || !inputValue.trim()}
          size="sm"
        >
          {t('editor.serial.send', { defaultValue: '送信' })}
        </Button>
      </div>
    </div>
  );
}
