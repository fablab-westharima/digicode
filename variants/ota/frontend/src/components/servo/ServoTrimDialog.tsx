/**
 * サーボトリム設定ダイアログ
 * ESP32に接続してサーボのトリム値をリアルタイムで調整
 * プリセット選択 + 任意のピン番号編集に対応
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trimService } from '@/services/trimService';
import { useWifiStore } from '@/stores/wifiStore';
import { SlidersHorizontal, Play, RotateCcw, Save, Wifi, WifiOff, Home, Plus, Minus, Trash2 } from 'lucide-react';

interface ServoTrimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ServoItem {
  name: string;
  pin: number;
  type: '180' | '360'; // 180度サーボ or 360度（連続回転）サーボ
}

interface ServoPreset {
  id: string;
  name: string;
  servos: ServoItem[];
}

// プリセット定義
const SERVO_PRESETS: ServoPreset[] = [
  {
    id: 'otto-diy',
    name: 'OTTO DIY 2足歩行 (4サーボ)',
    servos: [
      { name: '左足', pin: 27, type: '180' },
      { name: '右足', pin: 15, type: '180' },
      { name: '左足首', pin: 14, type: '180' },
      { name: '右足首', pin: 13, type: '180' },
    ],
  },
  {
    id: 'otto-diy-plus',
    name: 'OTTO DIY+ 2足歩行 (6サーボ)',
    servos: [
      { name: '左足', pin: 27, type: '180' },
      { name: '右足', pin: 15, type: '180' },
      { name: '左足首', pin: 14, type: '180' },
      { name: '右足首', pin: 13, type: '180' },
      { name: '左腕', pin: 12, type: '180' },
      { name: '右腕', pin: 26, type: '180' },
    ],
  },
  {
    id: 'otto-wheel',
    name: 'OTTO Wheel (2サーボ)',
    servos: [
      { name: '左車輪', pin: 14, type: '360' },
      { name: '右車輪', pin: 13, type: '360' },
    ],
  },
  {
    id: 'otto-ninja',
    name: 'OTTO Ninja (4サーボ)',
    servos: [
      { name: '左足', pin: 27, type: '180' },
      { name: '右足', pin: 15, type: '180' },
      { name: '左足首', pin: 14, type: '360' },
      { name: '右足首', pin: 13, type: '360' },
    ],
  },
  {
    id: 'custom',
    name: 'カスタム',
    servos: [
      { name: 'サーボ1', pin: 2, type: '180' },
      { name: 'サーボ2', pin: 3, type: '180' },
      { name: 'サーボ3', pin: 4, type: '180' },
      { name: 'サーボ4', pin: 5, type: '180' },
    ],
  },
];

// ローカルストレージキー
const STORAGE_KEY = 'digicode_servo_trim_config';
const PRESET_KEY = 'digicode_servo_trim_preset';

function loadServoConfig(): { preset: string; servos: ServoItem[] } {
  try {
    const savedPreset = localStorage.getItem(PRESET_KEY) || 'otto-diy';
    const savedServos = localStorage.getItem(STORAGE_KEY);
    if (savedServos) {
      return { preset: savedPreset, servos: JSON.parse(savedServos) };
    }
    // プリセットからデフォルト取得
    const preset = SERVO_PRESETS.find(p => p.id === savedPreset) || SERVO_PRESETS[0];
    return { preset: savedPreset, servos: [...preset.servos] };
  } catch {
    // ignore
  }
  return { preset: 'otto-diy', servos: [...SERVO_PRESETS[0].servos] };
}

function saveServoConfig(preset: string, servos: ServoItem[]) {
  try {
    localStorage.setItem(PRESET_KEY, preset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servos));
  } catch {
    // ignore
  }
}

export function ServoTrimDialog({ open, onOpenChange }: ServoTrimDialogProps) {
  const { t } = useTranslation();
  const { status: wifiStatus, getDeviceUrl, host } = useWifiStore();

  const [selectedPreset, setSelectedPreset] = useState<string>(() => loadServoConfig().preset);
  const [servos, setServos] = useState<ServoItem[]>(() => loadServoConfig().servos);
  const [trims, setTrims] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プリセット変更時の処理
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = SERVO_PRESETS.find(p => p.id === presetId);
    if (preset) {
      // プリセットのサーボ設定をコピー（deep copy）
      setServos(preset.servos.map(s => ({ ...s })));
      // トリム値もリセット
      setTrims(preset.servos.map(() => 0));
    }
  };

  // サーボ数変更時にトリム配列を調整
  useEffect(() => {
    setTrims(prev => {
      const newTrims = [...prev];
      while (newTrims.length < servos.length) {
        newTrims.push(0);
      }
      return newTrims.slice(0, servos.length);
    });
  }, [servos.length]);

  // ダイアログ開いた時にデバイスからトリム値を読み込み
  useEffect(() => {
    if (open && isConnected) {
      loadTrimsFromDevice();
    }
  }, [open]);

  const isConnected = wifiStatus === 'connected' && host;

  const loadTrimsFromDevice = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);
    try {
      const deviceUrl = getDeviceUrl();
      const data = await trimService.getTrims(deviceUrl);
      if (data.trims && data.trims.length > 0) {
        // サーボ数に合わせてトリム値を設定
        const newTrims = servos.map((_, i) => data.trims[i] || 0);
        setTrims(newTrims);
      }
    } catch (err) {
      console.error('Failed to load trims:', err);
      setError(t('servo.trim.loadError', 'トリム値の読み込みに失敗しました'));
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, getDeviceUrl, servos, t]);

  const handleTrimChange = async (index: number, value: number) => {
    const newTrims = [...trims];
    newTrims[index] = value;
    setTrims(newTrims);

    // リアルタイムでデバイスに送信
    if (isConnected) {
      try {
        const deviceUrl = getDeviceUrl();
        await trimService.setTrim(deviceUrl, index, value);
      } catch (err) {
        console.error('Failed to set trim:', err);
      }
    }
  };

  const handleTest = async (action: 'home' | 'sweep' | 'walk', index?: number) => {
    if (!isConnected) return;
    try {
      const deviceUrl = getDeviceUrl();
      await trimService.testServo(deviceUrl, action, index);
    } catch (err) {
      console.error('Failed to test servo:', err);
      setError(t('servo.trim.testError', 'テスト動作に失敗しました'));
    }
  };

  const handleSave = async () => {
    if (!isConnected) return;
    setIsSaving(true);
    setError(null);
    try {
      const deviceUrl = getDeviceUrl();
      // トリム値を一括送信
      await trimService.setTrims(deviceUrl, trims);
      // NVSに保存
      await trimService.saveTrims(deviceUrl);
      // ローカルにサーボ設定を保存
      saveServoConfig(selectedPreset, servos);
      setError(null);
    } catch (err) {
      console.error('Failed to save trims:', err);
      setError(t('servo.trim.saveError', '保存に失敗しました'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTrims(servos.map(() => 0));
  };

  // サーボ追加
  const addServo = () => {
    if (servos.length >= 16) return;
    const newIndex = servos.length + 1;
    setServos([...servos, { name: `サーボ${newIndex}`, pin: 2, type: '180' }]);
    setSelectedPreset('custom'); // カスタムに切り替え
  };

  // サーボタイプ変更
  const updateServoType = (index: number, type: '180' | '360') => {
    const newServos = [...servos];
    newServos[index] = { ...newServos[index], type };
    setServos(newServos);
    setSelectedPreset('custom'); // カスタムに切り替え
  };

  // サーボ削除
  const removeServo = (index: number) => {
    if (servos.length <= 1) return;
    const newServos = servos.filter((_, i) => i !== index);
    setServos(newServos);
    const newTrims = trims.filter((_, i) => i !== index);
    setTrims(newTrims);
    setSelectedPreset('custom'); // カスタムに切り替え
  };

  // サーボ名変更
  const updateServoName = (index: number, name: string) => {
    const newServos = [...servos];
    newServos[index] = { ...newServos[index], name };
    setServos(newServos);
    setSelectedPreset('custom'); // カスタムに切り替え
  };

  // ピン番号変更
  const updateServoPin = (index: number, pin: number) => {
    const newServos = [...servos];
    newServos[index] = { ...newServos[index], pin };
    setServos(newServos);
    setSelectedPreset('custom'); // カスタムに切り替え
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#161B22] border-[#2E333D]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#E6EDF3]">
            <SlidersHorizontal className="w-5 h-5" />
            {t('servo.trim.title', 'サーボトリム設定')}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('servo.trim.description', 'サーボモーターのトリム（オフセット）値を調整します')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 接続状態 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-green-500" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                    {isConnected
                      ? t('servo.trim.connected', '接続済み') + `: ${host}`
                      : t('servo.trim.notConnected', 'デバイスに接続してください')}
                  </span>
                </div>
                {isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadTrimsFromDevice}
                    disabled={isLoading}
                    className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
                  >
                    {isLoading ? t('common.loading', '読込中...') : t('servo.trim.reload', '再読込')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* プリセット選択 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#8B949E] whitespace-nowrap">
                  {t('servo.trim.preset', 'プリセット')}:
                </span>
                <Select value={selectedPreset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="flex-1 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161B22] border-[#2E333D]">
                    {SERVO_PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.id}
                        value={preset.id}
                        className="text-[#E6EDF3] focus:bg-[#2E333D] focus:text-[#E6EDF3]"
                      >
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* サーボ数コントロール */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#E6EDF3] flex items-center justify-between">
                <span>{t('servo.trim.servoList', 'サーボ設定')} ({servos.length})</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setServos(servos.slice(0, -1))}
                    disabled={servos.length <= 1}
                    className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D] h-7 w-7 p-0"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addServo}
                    disabled={servos.length >= 16}
                    className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D] h-7 w-7 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {servos.map((servo, index) => (
                <div key={index} className="border border-[#2E333D] rounded-lg p-3 bg-[#161B22]">
                  {/* サーボ名とピン番号、タイプ */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#8B949E] w-4">{index + 1}.</span>
                    <Input
                      value={servo.name}
                      onChange={(e) => updateServoName(index, e.target.value)}
                      placeholder="名前"
                      className="flex-1 h-8 text-sm bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                    />
                    <Select value={servo.type} onValueChange={(v) => updateServoType(index, v as '180' | '360')}>
                      <SelectTrigger className="w-20 h-8 text-xs bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161B22] border-[#2E333D]">
                        <SelectItem value="180" className="text-[#E6EDF3] text-xs">180°</SelectItem>
                        <SelectItem value="360" className="text-[#E6EDF3] text-xs">360°</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-[#8B949E]">GPIO</span>
                    <Input
                      type="number"
                      min={0}
                      max={39}
                      value={servo.pin}
                      onChange={(e) => updateServoPin(index, parseInt(e.target.value) || 0)}
                      className="w-14 h-8 text-sm text-center bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeServo(index)}
                      disabled={servos.length <= 1}
                      className="text-red-500 hover:text-red-400 hover:bg-red-900/20 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* トリム値スライダー */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8B949E] w-16 shrink-0">
                      {servo.type === '180'
                        ? t('servo.trim.angleTrim', '角度トリム')
                        : t('servo.trim.speedTrim', '速度調整')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTrimChange(index, Math.max(-30, (trims[index] || 0) - 1))}
                      disabled={!isConnected || (trims[index] || 0) <= -30}
                      className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D] h-7 w-7 p-0"
                    >
                      -
                    </Button>
                    <Slider
                      value={[trims[index] || 0]}
                      min={-30}
                      max={30}
                      step={1}
                      onValueChange={([value]) => handleTrimChange(index, value)}
                      disabled={!isConnected}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTrimChange(index, Math.min(30, (trims[index] || 0) + 1))}
                      disabled={!isConnected || (trims[index] || 0) >= 30}
                      className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D] h-7 w-7 p-0"
                    >
                      +
                    </Button>
                    <span className="text-sm font-mono text-[#8B949E] w-10 text-right">
                      {(trims[index] || 0) > 0 ? '+' : ''}{trims[index] || 0}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest('sweep', index)}
                      disabled={!isConnected}
                      title={t('servo.trim.testServo', '個別テスト')}
                      className="text-[#8B949E] hover:bg-[#2E333D] h-7 w-7 p-0"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleTest('home')}
              disabled={!isConnected}
              className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              <Home className="w-4 h-4 mr-1" />
              {t('servo.trim.home', 'ホーム位置')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTest('walk')}
              disabled={!isConnected}
              className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              <Play className="w-4 h-4 mr-1" />
              {t('servo.trim.test', 'テスト')}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {t('servo.trim.reset', 'リセット')}
            </Button>
          </div>

          {/* 保存注意書き */}
          <p className="text-xs text-[#8B949E]">
            {t('servo.trim.saveNote', '保存するとデバイスのNVSに書き込まれ、再起動後も保持されます')}
          </p>
        </div>

        <DialogFooter className="border-t border-[#2E333D] pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
          >
            {t('common.close', '閉じる')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isConnected || isSaving}
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? t('common.saving', '保存中...') : t('servo.trim.save', '保存')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
