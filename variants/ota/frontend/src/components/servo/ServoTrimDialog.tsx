/**
 * サーボトリム設定ダイアログ
 * ESP32に接続してサーボのトリム値をリアルタイムで調整
 * プリセット選択 + 任意のピン番号編集に対応
 *
 * Phase D-1 (Session 148、case 23 incident B 解消 cluster):
 *   trimService 直接呼出 → ITrimTransport 抽象経由に書換。
 *   transport factory = WiFi (HTTP) → USB (Serial) → BLE (GATT NUS) priority。
 *   transport null 時は「接続なし」UI を表示 (R-9 mitigation 含む)。
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { createTrimTransport } from '@/services/trim/TrimTransportFactory';
import type { ITrimTransport, TrimTestAction } from '@/services/trim/ITrimTransport';
import { useWifiStore } from '@/stores/wifiStore';
import { useSerialStore } from '@/stores/serialStore';
import { usePinPresetStore } from '@/stores/pinPresetStore';
import { bluetoothService } from '@/services/bluetoothService';
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

// プリセット定義（i18n 対応: パーツ名は nameKey で管理し、レンダリング時に t() で解決）
// servo.trim.parts.* のキーを参照。
interface ServoPresetDef {
  id: string;
  servos: Array<{ nameKey: string; pin: number; type: '180' | '360' }>;
}

const SERVO_PRESETS_DEF: ServoPresetDef[] = [
  {
    id: 'humanoid-basic',
    // case 23 incident D 解消 (Phase C、Session 147): nameKey を新 lib const
    //   (DigiBiped: LEFT_LEG=0, RIGHT_LEG=1, LEFT_FOOT=2, RIGHT_FOOT=3) に揃える。
    //   pin 番号は不変 (27/15/14/13)、UI 表記が新 lib と semantic 一致。
    servos: [
      { nameKey: 'leftLeg', pin: 27, type: '180' },
      { nameKey: 'rightLeg', pin: 15, type: '180' },
      { nameKey: 'leftFoot', pin: 14, type: '180' },
      { nameKey: 'rightFoot', pin: 13, type: '180' },
    ],
  },
  {
    id: 'humanoid-plus',
    servos: [
      { nameKey: 'leftLeg', pin: 27, type: '180' },
      { nameKey: 'rightLeg', pin: 15, type: '180' },
      { nameKey: 'leftFoot', pin: 14, type: '180' },
      { nameKey: 'rightFoot', pin: 13, type: '180' },
      { nameKey: 'leftArm', pin: 12, type: '180' },
      { nameKey: 'rightArm', pin: 26, type: '180' },
    ],
  },
  {
    id: 'wheel',
    servos: [
      { nameKey: 'leftWheel', pin: 14, type: '360' },
      { nameKey: 'rightWheel', pin: 13, type: '360' },
    ],
  },
  {
    id: 'transform',
    servos: [
      { nameKey: 'leftLeg', pin: 27, type: '180' },
      { nameKey: 'rightLeg', pin: 15, type: '180' },
      { nameKey: 'leftFoot', pin: 14, type: '360' },
      { nameKey: 'rightFoot', pin: 13, type: '360' },
    ],
  },
  {
    id: 'custom',
    servos: [
      { nameKey: 'servo1', pin: 2, type: '180' },
      { nameKey: 'servo2', pin: 3, type: '180' },
      { nameKey: 'servo3', pin: 4, type: '180' },
      { nameKey: 'servo4', pin: 5, type: '180' },
    ],
  },
];

// ローカルストレージキー
const STORAGE_KEY = 'digicode_servo_trim_config';
const PRESET_KEY = 'digicode_servo_trim_preset';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// プリセット定義からサーボ配列を構築（t() 経由で多言語対応）
function buildServosFromPreset(presetId: string, t: TFunc): ServoItem[] {
  const def = SERVO_PRESETS_DEF.find(p => p.id === presetId) || SERVO_PRESETS_DEF[0];
  return def.servos.map(s => ({
    name: t(`servo.trim.parts.${s.nameKey}`),
    pin: s.pin,
    type: s.type,
  }));
}

// サーボプリセット名の localStorage マイグレーション map。
// sunset: 2027-04-21（OTTO 排除 2026-04-21 の 1 年後）以降、
//   この map と loadServoConfig 内の PRESET_MIGRATION 適用を削除、
//   未知 key は既定の 'humanoid-basic' に fallback する単純ロジックで置換可能。
//   理由: 1 年あれば全アクティブユーザーが 1 度以上 ServoTrim を開いて migrate 完了する想定。
const PRESET_MIGRATION: Record<string, string> = {
  'otto-diy': 'humanoid-basic',
  'otto-diy-plus': 'humanoid-plus',
  'otto-wheel': 'wheel',
  'otto-ninja': 'transform',
};

function loadServoConfig(t: TFunc): { preset: string; servos: ServoItem[] } {
  try {
    const raw = localStorage.getItem(PRESET_KEY) || 'humanoid-basic';
    const savedPreset = PRESET_MIGRATION[raw] ?? raw;
    if (savedPreset !== raw) {
      localStorage.setItem(PRESET_KEY, savedPreset);
    }
    const savedServos = localStorage.getItem(STORAGE_KEY);
    if (savedServos) {
      return { preset: savedPreset, servos: JSON.parse(savedServos) };
    }
    return { preset: savedPreset, servos: buildServosFromPreset(savedPreset, t) };
  } catch {
    // ignore
  }
  return { preset: 'humanoid-basic', servos: buildServosFromPreset('humanoid-basic', t) };
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
  const wifiStatus = useWifiStore(state => state.status);
  const wifiHost = useWifiStore(state => state.host);
  const serialStatus = useSerialStore(state => state.status);

  // UI-6 (III 中間 refactor、 Session 154): pinPresetStore.currentPreset 経由で
  // 「現在のプリセット」 表示 (Speed/Pulse 同 form)。 ServoTrim 内 servo 配列は接続
  // デバイス経由のリアルタイム送信用 = pinPresetStore とは independent (data model
  // 不変)、 表示のみ統一。
  //
  // memory:zustand_state_reading_selector 防衛: selector で `state.getCurrentPreset()`
  // 関数呼出すると毎 render で新 PinPreset object 返却 → zustand 比較 (Object.is) 失敗 →
  // state 変化と誤検出 → 無限 re-render = browser blank。 ServoSpeedDialog L50 と同 pattern
  // で destructure (全 state subscribe、 currentPresetId 変化で正常 re-render)。
  const { getCurrentPreset, currentPresetId } = usePinPresetStore();
  void currentPresetId; // subscribe trigger (currentPresetId 変化時の re-render 確保)、 React 18 strict mode で unused warning 回避
  const currentPreset = getCurrentPreset();
  const presetDisplayName = currentPreset.id === 'default'
    ? t('pinPreset.defaultName', { defaultValue: 'デフォルト' })
    : currentPreset.name;

  // Phase D-1: transport は接続方式自動判定 (WiFi → USB → BLE)。
  // wifiStatus / serialStatus 変化で再評価、 bluetoothService は plain class のため
  // isConnected snapshot を dep に含めることで render-time 再評価。
  const bleConnected = bluetoothService.isConnected;
  const transport: ITrimTransport | null = useMemo(
    () => createTrimTransport(),
    [wifiStatus, serialStatus, bleConnected]
  );
  const isConnected = transport !== null;

  // UI-6 統一 (Session 154): preset selector 削除に伴い SERVO_PRESETS dropdown list 不要、
  // selectedPreset state は servo 配列操作 (add/update/remove) で 'custom' marker として
  // 維持 (handleSave で saveServoConfig 経由 localStorage 保存)。
  const [selectedPreset, setSelectedPreset] = useState<string>(() => loadServoConfig(t).preset);
  const [servos, setServos] = useState<ServoItem[]>(() => loadServoConfig(t).servos);
  const [trims, setTrims] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 接続表示用ラベル: transport の kind と (HTTP 時のみ) host を組合せ。
  const connectionLabel = useMemo(() => {
    if (!transport) {
      return t('servo.trim.notConnected', { defaultValue: 'デバイスに接続してください' });
    }
    const kindLabel =
      transport.kind === 'http' ? t('servo.trim.transport.http', { defaultValue: 'WiFi' })
      : transport.kind === 'serial' ? t('servo.trim.transport.serial', { defaultValue: 'USB' })
      : t('servo.trim.transport.ble', { defaultValue: 'Bluetooth' });
    const connected = t('servo.trim.connected', { defaultValue: '接続済み' });
    const detail = transport.kind === 'http' && wifiHost ? `: ${wifiHost}` : '';
    return `${connected} (${kindLabel})${detail}`;
  }, [transport, wifiHost, t]);

  const loadTrimsFromDevice = useCallback(async () => {
    if (!transport) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await transport.getTrims();
      if (data.trims && data.trims.length > 0) {
        // サーボ数に合わせてトリム値を設定
        const newTrims = servos.map((_, i) => data.trims[i] || 0);
        setTrims(newTrims);
      }
    } catch (err) {
      console.error('Failed to load trims:', err);
      setError(t('servo.trim.loadError', { defaultValue: 'トリム値の読み込みに失敗しました' }));
    } finally {
      setIsLoading(false);
    }
  }, [transport, servos, t]);

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
    if (open && transport) {
      loadTrimsFromDevice();
    }
  }, [open, transport, loadTrimsFromDevice]);

  const handleTrimChange = async (index: number, value: number) => {
    const newTrims = [...trims];
    newTrims[index] = value;
    setTrims(newTrims);

    // リアルタイムでデバイスに送信
    if (transport) {
      try {
        await transport.setTrim(index, value);
      } catch (err) {
        console.error('Failed to set trim:', err);
      }
    }
  };

  const handleTest = async (action: TrimTestAction, index?: number) => {
    if (!transport) return;
    try {
      await transport.testServo(action, index);
    } catch (err) {
      console.error('Failed to test servo:', err);
      setError(t('servo.trim.testError', { defaultValue: 'テスト動作に失敗しました' }));
    }
  };

  const handleSave = async () => {
    if (!transport) return;
    setIsSaving(true);
    setError(null);
    try {
      // トリム値を一括送信
      await transport.setTrims(trims);
      // NVSに保存
      await transport.saveTrims();
      // ローカルにサーボ設定を保存
      saveServoConfig(selectedPreset, servos);
      setError(null);
    } catch (err) {
      console.error('Failed to save trims:', err);
      setError(t('servo.trim.saveError', { defaultValue: '保存に失敗しました' }));
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
    setServos([...servos, {
      name: t('servo.trim.parts.servoN', { n: newIndex, defaultValue: 'サーボ{{n}}' }),
      pin: 2,
      type: '180',
    }]);
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
            {t('servo.trim.title', { defaultValue: 'サーボトリム設定' })}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('servo.trim.description', { defaultValue: 'サーボモーターのトリム（オフセット）値を調整します' })}
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
                    {connectionLabel}
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
                    {isLoading
                      ? t('common.loading', { defaultValue: '読み込み中...' })
                      : t('servo.trim.reload', { defaultValue: '再読込' })}
                  </Button>
                )}
              </div>
              {!isConnected && (
                <p className="text-xs text-[#8B949E] mt-2">
                  {t('servo.trim.connectGuide', {
                    defaultValue: 'WiFi OTA、USB シリアル、または Bluetooth (ble_uart_setup ブロックが必要) のいずれかでデバイスに接続してください。',
                  })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* 現在のプリセット表示 (UI-6 統一、 Speed/Pulse 同 form。 pinPresetStore.currentPreset 経由) */}
          <div className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#2E333D] rounded-md px-3 py-2">
            {t('servo.trim.currentPreset', { defaultValue: '現在のプリセット' })}:{' '}
            <span className="text-[#E6EDF3] font-medium">{presetDisplayName}</span>
          </div>

          {/* 全体トリム設定 (UI-6 統一: 全 servo trim を 0 に一括 reset、 リアルタイム送信) */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <SlidersHorizontal className="w-5 h-5" />
                {t('servo.trim.globalSettings', { defaultValue: '全体トリム設定' })}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('servo.trim.globalSettingsDesc', { defaultValue: '全サーボのトリム値を一括操作します' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={async () => {
                  const zeroTrims = servos.map(() => 0);
                  setTrims(zeroTrims);
                  if (transport) {
                    try {
                      await transport.setTrims(zeroTrims);
                    } catch (err) {
                      console.error('Failed to reset all trims:', err);
                    }
                  }
                }}
                disabled={!isConnected || trims.every(v => v === 0)}
                className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('servo.trim.resetAll', { defaultValue: '全 servo を 0 にリセット' })}
              </Button>
            </CardContent>
          </Card>

          {/* ピンごとの個別トリム設定 (UI-6 統一: 旧「サーボ設定」 を pin individual override paradigm に rename) */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#E6EDF3] flex items-center justify-between">
                <span>{t('servo.trim.perPinSettings', { defaultValue: 'ピンごとの個別トリム設定' })} ({servos.length})</span>
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
                      placeholder={t('servo.trim.nameInputPlaceholder', { defaultValue: '名前' })}
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
                        ? t('servo.trim.angleTrim', { defaultValue: '角度トリム' })
                        : t('servo.trim.speedTrim', { defaultValue: '速度調整' })}
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
                    <Input
                      type="number"
                      value={trims[index] || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val)) {
                          handleTrimChange(index, Math.max(-30, Math.min(30, val)));
                        }
                      }}
                      min={-30}
                      max={30}
                      disabled={!isConnected}
                      className="h-7 w-14 text-sm font-mono text-center bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTrimChange(index, 0)}
                      disabled={!isConnected || (trims[index] || 0) === 0}
                      title={t('servo.trim.resetPerServo', { defaultValue: 'デフォルト (0) に戻す' })}
                      className="text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D] h-7 w-7 p-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest('sweep', index)}
                      disabled={!isConnected}
                      title={t('servo.trim.testServo', { defaultValue: '個別テスト' })}
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
              {t('servo.trim.home', { defaultValue: 'ホーム位置' })}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleTest('walk')}
              disabled={!isConnected}
              className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              <Play className="w-4 h-4 mr-1" />
              {t('servo.trim.test', { defaultValue: 'テスト' })}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              {t('servo.trim.reset', { defaultValue: 'リセット' })}
            </Button>
          </div>

          {/* 保存注意書き */}
          <p className="text-xs text-[#8B949E]">
            {t('servo.trim.saveNote', { defaultValue: '保存するとデバイス本体に書き込まれ、電源を切っても設定が保持されます' })}
          </p>
        </div>

        <DialogFooter className="border-t border-[#2E333D] pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
          >
            {t('common.close', { defaultValue: '閉じる' })}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isConnected || isSaving}
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving
              ? t('common.saving', { defaultValue: '保存中...' })
              : t('servo.trim.save', { defaultValue: '保存' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
