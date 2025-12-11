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
import { Pause, Play, Trash2, Download } from 'lucide-react';

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
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#eab308', // yellow
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

interface SerialPlotterProps {
  className?: string;
}

export function SerialPlotter({ className }: SerialPlotterProps) {
  const { output: serialOutput, status: serialStatus } = useSerialStore();
  const { output: wifiOutput, status: wifiStatus } = useWifiStore();

  const [data, setData] = useState<DataPoint[]>([]);
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [maxPoints, setMaxPoints] = useState(100);
  const [yMin, setYMin] = useState<number | undefined>(undefined);
  const [yMax, setYMax] = useState<number | undefined>(undefined);

  const lastProcessedIndexRef = useRef({ serial: 0, wifi: 0 });
  const startTimeRef = useRef<number>(Date.now());

  // Parse serial output for numeric values
  // Supports formats:
  // - "123" (single value)
  // - "123,456,789" (comma-separated)
  // - "label1:123,label2:456" (labeled values)
  // - "PLOT:123,456,789" (prefixed data)
  const parseDataLine = useCallback((line: string): { values: number[], labels?: string[] } | null => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('>')) return null;

    // Check for PLOT: prefix
    let dataStr = trimmed;
    if (trimmed.toUpperCase().startsWith('PLOT:')) {
      dataStr = trimmed.substring(5).trim();
    }

    // Check for labeled values (e.g., "sensor1:123,sensor2:456")
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

      if (values.length > 0) {
        return { values, labels };
      }
    }

    // Check for single labeled value (e.g., "sensor:123")
    if (dataStr.includes(':')) {
      const [label, valueStr] = dataStr.split(':');
      const value = parseFloat(valueStr);
      if (!isNaN(value)) {
        return { values: [value], labels: [label.trim()] };
      }
    }

    // Check for comma-separated values
    if (dataStr.includes(',')) {
      const values = dataStr.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      if (values.length > 0) {
        return { values };
      }
    }

    // Single value
    const value = parseFloat(dataStr);
    if (!isNaN(value)) {
      return { values: [value] };
    }

    return null;
  }, []);

  // Process new output
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
        const currentTime = (Date.now() - startTimeRef.current) / 1000;

        // Create data point
        const dataPoint: DataPoint = { time: currentTime };

        values.forEach((value, index) => {
          const channelName = labels?.[index] || `ch${index + 1}`;
          dataPoint[channelName] = value;

          // Update channels if new channel detected
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

        // Add data point
        setData((prev) => {
          const newData = [...prev, dataPoint];
          // Keep only maxPoints
          if (newData.length > maxPoints) {
            return newData.slice(-maxPoints);
          }
          return newData;
        });
      });
    };

    if (serialStatus === 'connected') {
      processOutput(serialOutput, 'serial');
    }
    if (wifiStatus === 'connected') {
      processOutput(wifiOutput, 'wifi');
    }
  }, [serialOutput, wifiOutput, serialStatus, wifiStatus, isPaused, maxPoints, parseDataLine]);

  // Clear data
  const clearData = () => {
    setData([]);
    startTimeRef.current = Date.now();
    lastProcessedIndexRef.current = { serial: 0, wifi: 0 };
  };

  // Export data as CSV
  const exportCSV = () => {
    if (data.length === 0) return;

    const headers = ['time', ...channels.map(ch => ch.name)];
    const csvContent = [
      headers.join(','),
      ...data.map(point =>
        headers.map(h => point[h] ?? '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_plot_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle channel visibility
  const toggleChannel = (channelName: string) => {
    setChannels((prev) =>
      prev.map(ch =>
        ch.name === channelName ? { ...ch, visible: !ch.visible } : ch
      )
    );
  };

  // Visible channels
  const visibleChannels = useMemo(() =>
    channels.filter(ch => ch.visible),
  [channels]);

  // Connection status
  const isConnected = serialStatus === 'connected' ||
                      wifiStatus === 'connected';

  return (
    <div className={`flex flex-col bg-white border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <span className="text-sm text-gray-700 font-medium">シリアルプロッター</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className={`text-xs h-6 px-2 ${isPaused ? 'text-yellow-600' : 'text-gray-500'} hover:text-gray-900`}
          >
            {isPaused ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
            {isPaused ? '再開' : '一時停止'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCSV}
            disabled={data.length === 0}
            className="text-xs text-gray-500 hover:text-gray-900 h-6 px-2"
          >
            <Download className="w-3 h-3 mr-1" />
            CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearData}
            className="text-xs text-gray-500 hover:text-gray-900 h-6 px-2"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            クリア
          </Button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-1 p-2 bg-gray-50" style={{ minHeight: '200px' }}>
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            {isConnected ? (
              <div className="text-center">
                <p>データを待機中...</p>
                <p className="text-xs mt-1">
                  ESP32から数値データを送信してください<br />
                  例: Serial.println("123,456,789");
                </p>
              </div>
            ) : (
              'ESP32に接続してください'
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                stroke="#6b7280"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v.toFixed(1)}s`}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fontSize: 10 }}
                domain={[yMin ?? 'auto', yMax ?? 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
                labelFormatter={(v) => `${Number(v).toFixed(2)}s`}
              />
              {visibleChannels.map((channel) => (
                <Line
                  key={channel.name}
                  type="monotone"
                  dataKey={channel.name}
                  stroke={channel.color}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Channel Controls */}
      {channels.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 border-t">
          <div className="flex flex-wrap gap-2">
            {channels.map((channel) => (
              <button
                key={channel.name}
                onClick={() => toggleChannel(channel.name)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  channel.visible
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: channel.visible ? channel.color : '#9ca3af' }}
                />
                {channel.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="px-3 py-2 bg-gray-50 border-t">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Label className="text-gray-600">データ点数:</Label>
            <Input
              type="number"
              value={maxPoints}
              onChange={(e) => setMaxPoints(Math.max(10, parseInt(e.target.value) || 100))}
              className="w-16 h-6 text-xs bg-white border-gray-300 text-gray-900"
              min={10}
              max={1000}
            />
          </div>
          <div className="flex items-center gap-1">
            <Label className="text-gray-600">Y軸範囲:</Label>
            <Input
              type="number"
              value={yMin ?? ''}
              onChange={(e) => setYMin(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="自動"
              className="w-16 h-6 text-xs bg-white border-gray-300 text-gray-900"
            />
            <span className="text-gray-400">〜</span>
            <Input
              type="number"
              value={yMax ?? ''}
              onChange={(e) => setYMax(e.target.value ? parseFloat(e.target.value) : undefined)}
              placeholder="自動"
              className="w-16 h-6 text-xs bg-white border-gray-300 text-gray-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
