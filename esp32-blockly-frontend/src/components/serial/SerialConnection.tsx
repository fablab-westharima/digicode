import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSerialStore } from '@/stores/serialStore';
import { useDeviceStore } from '@/stores/deviceStore';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

interface SerialConnectionProps {
  className?: string;
  compact?: boolean;
}

export function SerialConnection({ className, compact }: SerialConnectionProps) {
  const { status, isSupported, baudRate, connect, disconnect, resetESP32, setBaudRate } = useSerialStore();
  const { currentDevice } = useDeviceStore();

  if (!isSupported) {
    return (
      <div className={`text-sm text-red-500 ${className}`}>
        Web Serial APIはこのブラウザでサポートされていません
      </div>
    );
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return '接続中';
      case 'connecting':
        return '接続処理中...';
      case 'error':
        return 'エラー';
      default:
        return '未接続';
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <Button
          variant={status === 'connected' ? 'destructive' : 'default'}
          size="sm"
          onClick={status === 'connected' ? disconnect : connect}
          disabled={status === 'connecting'}
        >
          {status === 'connected' ? '切断' : '接続'}
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* 接続状態 */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
        <span className="text-sm">{getStatusText()}</span>
        {currentDevice && (
          <span className="text-xs text-muted-foreground ml-2">
            ({currentDevice.name})
          </span>
        )}
      </div>

      {/* ボーレート選択 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">ボーレート:</span>
        <Select
          value={baudRate.toString()}
          onValueChange={(v) => setBaudRate(parseInt(v))}
          disabled={status === 'connected'}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BAUD_RATES.map((rate) => (
              <SelectItem key={rate} value={rate.toString()}>
                {rate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 接続/切断ボタン */}
      <div className="flex gap-2">
        {status === 'connected' ? (
          <>
            <Button variant="destructive" onClick={disconnect} className="flex-1">
              切断
            </Button>
            <Button variant="outline" onClick={resetESP32}>
              リセット
            </Button>
          </>
        ) : (
          <Button
            onClick={connect}
            disabled={status === 'connecting'}
            className="flex-1"
          >
            {status === 'connecting' ? '接続中...' : 'ESP32に接続'}
          </Button>
        )}
      </div>
    </div>
  );
}
