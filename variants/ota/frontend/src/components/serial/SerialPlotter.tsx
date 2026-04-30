/**
 * Serial Plotter Component
 * Real-time graph display of sensor values from ESP32
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSerialStore } from '@/stores/serialStore';
import { useWifiStore } from '@/stores/wifiStore';
import { Pause, Play, Trash2, Download, Plug, Unplug } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface DataPoint {
  time: number;
  [key: string]: number;
}

interface ChannelConfig {
  name: string;
  color: string;
  visible: boolean;
}

const COLORS = [
  '#ef4444', '#22c55e', '#3b82f6', '#eab308',
  '#a855f7', '#06b6d4', '#f97316', '#ec4899',
];

interface SerialPlotterProps {
  className?: string;
}

export function SerialPlotter({ className }: SerialPlotterProps) {
  const { t } = useTranslation();
  const {
    output: serialOutput,
    status: serialStatus,
    connect: serialConnect,
    disconnect: serialDisconnect,
  } = useSerialStore();
  const { status: wifiStatus } = useWifiStore();

  const [data, setData] = useState<DataPoint[]>([]);
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [maxPoints, setMaxPoints] = useState(100);
  const [yMin, setYMin] = useState<number | undefined>(undefined);
  const [yMax, setYMax] = useState<number | undefined>(undefined);

  const lastProcessedIndexRef = useRef({ serial: 0, wifi: 0 });
  // mount 時に初期化（render 中の Date.now() 呼び出しは react-hooks/purity 違反のため useEffect で遅延）
  const startTimeRef = useRef<number | null>(null);
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const parseDataLine = useCallback((line: string): { values: number[], labels?: string[] } | null => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('>')) return null;

    let dataStr = trimmed;
    if (trimmed.toUpperCase().startsWith('PLOT:')) {
      dataStr = trimmed.substring(5).trim();
    }

    if (dataStr.includes(':') && dataStr.includes(',')) {
      const parts = dataStr.split(',');
      const values: number[] = [];
      const labels: string[] = [];
      for (const part of parts) {
        const [label, valueStr] = part.split(':');
        const value = parseFloat(valueStr);
        if (!isNaN(value)) {
          labels.push(label.trim());
          values.push(value);
        }
      }
      if (values.length > 0) return { values, labels };
    }

    if (dataStr.includes(':')) {
      const [label, valueStr] = dataStr.split(':');
      const value = parseFloat(valueStr);
      if (!isNaN(value)) return { values: [value], labels: [label.trim()] };
    }

    if (dataStr.includes(',')) {
      const values = dataStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      if (values.length > 0) return { values };
    }

    const value = parseFloat(dataStr);
    if (!isNaN(value)) return { values: [value] };

    return null;
  }, []);

  useEffect(() => {
    if (isPaused) return;

    const processOutput = (output: string[], source: 'serial' | 'wifi') => {
      const lastIndex = lastProcessedIndexRef.current[source];
      if (output.length <= lastIndex) return;

      const newLines = output.slice(lastIndex);
      lastProcessedIndexRef.current[source] = output.length;

      newLines.forEach((line) => {
        const parsed = parseDataLine(line);
        if (!parsed) return;

        const { values, labels } = parsed;
        const currentTime = (Date.now() - (startTimeRef.current ?? Date.now())) / 1000;
        const dataPoint: DataPoint = { time: currentTime };

        values.forEach((value, index) => {
          const channelName = labels?.[index] || `ch${index + 1}`;
          dataPoint[channelName] = value;

          setChannels((prev) => {
            const exists = prev.some(ch => ch.name === channelName);
            if (!exists) {
              return [...prev, {
                name: channelName,
                color: COLORS[prev.length % COLORS.length],
                visible: true
              }];
            }
            return prev;
          });
        });

        setData((prev) => {
          const newData = [...prev, dataPoint];
          if (newData.length > maxPoints) return newData.slice(-maxPoints);
          return newData;
        });
      });
    };

    if (serialStatus === 'connected') {
      processOutput(serialOutput, 'serial');
    }
  }, [serialOutput, serialStatus, isPaused, maxPoints, parseDataLine]);

  const clearData = () => {
    setData([]);
    startTimeRef.current = Date.now();
    lastProcessedIndexRef.current = { serial: 0, wifi: 0 };
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = ['time', ...channels.map(ch => ch.name)];
    const csvContent = [
      headers.join(','),
      ...data.map(point => headers.map(h => point[h] ?? '').join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_plot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleChannel = (channelName: string) => {
    setChannels((prev) =>
      prev.map(ch => ch.name === channelName ? { ...ch, visible: !ch.visible } : ch)
    );
  };

  const visibleChannels = useMemo(() => channels.filter(ch => ch.visible), [channels]);

  const isConnected = serialStatus === 'connected' || wifiStatus === 'connected';

  return (
    <div className={`flex flex-col bg-[#0D1117] border border-[#2E333D] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161B22] border-b border-[#2E333D]">
        <span className="text-sm text-[#E6EDF3] font-medium">
          {t('editor.menu.plotter', { defaultValue: 'プロッター' })}
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
                  : 'text-[#8B949E] hover:text-[#E6EDF3]'
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className={`text-xs h-6 px-2 ${isPaused ? 'text-yellow-400' : 'text-[#8B949E]'} hover:text-[#E6EDF3]`}
          >
            {isPaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
            {isPaused
              ? t('editor.serial.resume', { defaultValue: '再開' })
              : t('editor.serial.pause', { defaultValue: '一時停止' })}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCSV}
            disabled={data.length === 0}
            className="text-xs text-[#8B949E] hover:text-[#E6EDF3] h-6 px-2"
          >
            <Download className="w-3 h-3 mr-1" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearData}
            className="text-xs text-[#8B949E] hover:text-[#E6EDF3] h-6 px-2"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {t('editor.serial.clear', { defaultValue: 'クリア' })}
          </Button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-2 bg-[#0D1117]" style={{ minHeight: '200px' }}>
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#8B949E] text-sm">
            {isConnected ? (
              <div className="text-center">
                <p>{t('editor.serial.plotterWaiting', { defaultValue: 'データを待機中...' })}</p>
                <p className="text-xs mt-1 text-[#484F58]">
                  {t('editor.serial.plotterHint', { defaultValue: 'ESP32から数値データを送信してください' })}<br />
                  {t('editor.serial.plotterExample', { defaultValue: '例: Serial.println("123,456,789");' })}
                </p>
              </div>
            ) : (
              t('editor.serial.connectPrompt', { defaultValue: 'ESP32に接続してください' })
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E333D" />
              <XAxis dataKey="time" stroke="#8B949E" tick={{ fontSize: 10, fill: '#8B949E' }} tickFormatter={(v) => `${v.toFixed(1)}s`} />
              <YAxis stroke="#8B949E" tick={{ fontSize: 10, fill: '#8B949E' }} domain={[yMin ?? 'auto', yMax ?? 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#161B22', border: '1px solid #2E333D', borderRadius: '4px', fontSize: '12px', color: '#E6EDF3' }}
                labelFormatter={(v) => `${Number(v).toFixed(2)}s`}
              />
              {visibleChannels.map((channel) => (
                <Line key={channel.name} type="monotone" dataKey={channel.name} stroke={channel.color} strokeWidth={2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Channel Controls */}
      {channels.length > 0 && (
        <div className="px-3 py-2 bg-[#161B22] border-t border-[#2E333D]">
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <button
                key={channel.name}
                onClick={() => toggleChannel(channel.name)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  channel.visible ? 'bg-[#2E333D] text-[#E6EDF3]' : 'bg-[#161B22] text-[#484F58]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: channel.visible ? channel.color : '#484F58' }} />
                {channel.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="px-3 py-2 bg-[#161B22] border-t border-[#2E333D]">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Label className="text-[#8B949E]">{t('editor.serial.dataPoints', { defaultValue: 'データ点数:' })}</Label>
            <Input
              type="number"
              value={maxPoints}
              onChange={(e) => setMaxPoints(Math.max(10, parseInt(e.target.value) || 100))}
              className="w-16 h-6 text-xs bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
              min={10}
              max={1000}
            />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-[#8B949E]">{t('editor.serial.yRange', { defaultValue: 'Y軸範囲:' })}</Label>
            <Input
              type="number"
              value={yMin ?? ''}
              onChange={(e) => setYMin(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder={t('editor.serial.auto', { defaultValue: '自動' })}
              className="w-16 h-6 text-xs bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
            />
            <span className="text-[#484F58]">〜</span>
            <Input
              type="number"
              value={yMax ?? ''}
              onChange={(e) => setYMax(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder={t('editor.serial.auto', { defaultValue: '自動' })}
              className="w-16 h-6 text-xs bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
