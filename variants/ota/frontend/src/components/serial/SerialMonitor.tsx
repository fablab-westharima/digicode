import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSerialStore } from '@/stores/serialStore';
import { useWifiStore } from '@/stores/wifiStore';

interface SerialMonitorProps {
  className?: string;
}

export function SerialMonitor({ className }: SerialMonitorProps) {
  const { output: serialOutput, send: serialSend, clearOutput: serialClear, status: serialStatus } = useSerialStore();
  const { status: wifiStatus } = useWifiStore();

  const [inputValue, setInputValue] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const outputRef = useRef<HTMLDivElement>(null);

  // シリアル出力を使用（WiFiストアには出力機能がない）
  const output = useMemo(() => {
    const combined: string[] = [];
    if (serialStatus === 'connected' && serialOutput.length > 0) {
      combined.push(...serialOutput);
    }
    return combined;
  }, [serialOutput, serialStatus]);

  // 接続状態（いずれかが接続されているか）
  const status = serialStatus === 'connected' ? 'connected' :
                 wifiStatus === 'connected' ? 'connected' :
                 'disconnected';

  // 自動スクロール
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  const handleSend = async () => {
    if (inputValue.trim() && status === 'connected') {
      // 接続中のコネクションにデータを送信
      if (serialStatus === 'connected') {
        await serialSend(inputValue);
      }
      setInputValue('');
    }
  };

  const clearOutput = () => {
    // シリアル出力をクリア
    serialClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white border rounded-lg overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <span className="text-sm text-gray-700 font-medium">シリアルモニター</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            自動スクロール
          </label>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearOutput}
            className="text-xs text-gray-500 hover:text-gray-900 h-6 px-2"
          >
            クリア
          </Button>
        </div>
      </div>

      {/* 出力エリア */}
      <div
        ref={outputRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-sm text-gray-800 bg-gray-50"
        style={{ minHeight: '200px' }}
      >
        {output.length === 0 ? (
          <span className="text-gray-400">
            {status === 'connected'
              ? 'ESP32からのデータを待機中...'
              : 'ESP32に接続してください'}
          </span>
        ) : (
          output.map((line, index) => (
            <div key={index} className={line.startsWith('>') ? 'text-green-600' : ''}>
              {line}
            </div>
          ))
        )}
      </div>

      {/* 入力エリア */}
      <div className="flex gap-2 p-2 bg-gray-50 border-t">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="送信するメッセージ..."
          disabled={status !== 'connected'}
          className="flex-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
        />
        <Button
          onClick={handleSend}
          disabled={status !== 'connected' || !inputValue.trim()}
          size="sm"
        >
          送信
        </Button>
      </div>
    </div>
  );
}
