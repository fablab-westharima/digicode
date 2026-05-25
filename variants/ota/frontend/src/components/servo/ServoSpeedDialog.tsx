/**
 * サーボスピード調整ダイアログ (第137 Phase 2、Option A settings-only)
 *
 * サーボの動作速度 (°/秒) を調整。`currentPreset.servoConfig.speedDegPerSec` (一括) +
 * `perPinConfigs[].speedDegPerSec` (ピン別 override) を編集。
 *
 * cpp-generator (`utils/pinHelper.ts:getServoSpeed`) はこの値を読む。
 * speed=0 (default) で既存挙動と完全互換 = ESP32Servo native write 速度、
 * helper 未注入。speed>0 で servo_write generator が `_servoMoveAt` helper
 * 経由 emit (第137 Phase 3 で実装予定、本 Phase 2 では UI のみ)。
 *
 * UI pattern は ServoPulseDialog の wholesale clone、編集対象を speed に
 * 置換 (一括 Card + 個別 Card + Reset/Save footer、`memory:atomic_compound_actions`)。
 *
 * 関連:
 * - サーボパルス調整 (ServoPulseDialog): パルス幅 (μs)、サーボ個体差吸収用 (別機能)
 * - サーボトリム設定 (ServoTrimDialog): デバイス接続後の角度オフセット (別機能)
 * - Pro 限定 (canUseServoPulse() alias re-use、`memory:prerelease_open_scope` で
 *   prerelease 中は全 user 開放、Sidebar の proGate で gate)
 */
import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gauge, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { usePinPresetStore, type PinServoConfig } from '@/stores/pinPresetStore';
import { track } from '@/lib/analytics';

interface ServoSpeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// perPin row が UI に表示される時点で speedDegPerSec は明示的 override (any number、0 含む)。
// PinServoConfig.speedDegPerSec は optional だが、UI 編集中の row では非 optional の扱い。
type SpeedRow = PinServoConfig & { speedDegPerSec: number };

export function ServoSpeedDialog({ open, onOpenChange }: ServoSpeedDialogProps) {
  const { t } = useTranslation();
  const { getCurrentPreset, updatePreset, currentPresetId } = usePinPresetStore();

  const currentPreset = getCurrentPreset();
  const [globalSpeed, setGlobalSpeed] = useState<number>(currentPreset.servoConfig.speedDegPerSec ?? 0);
  // perPin の speedDegPerSec が undefined の entry は本 dialog では編集対象外
  // (UI 表示時に明示的 override か否かを区別必要、undefined = "global にフォールバック" 意味維持)。
  // Phase 1 contract: undefined → global fallback、UI で row を追加した瞬間に「明示的 override」になる。
  const buildSpeedRows = (configs: PinServoConfig[] | undefined): SpeedRow[] =>
    (configs || [])
      .filter((c): c is SpeedRow => c.speedDegPerSec !== undefined)
      .map((c) => ({ ...c }));
  const [perPinRows, setPerPinRows] = useState<SpeedRow[]>(buildSpeedRows(currentPreset.servoConfig.perPinConfigs));
  const [hasChanges, setHasChanges] = useState(false);

  // プリセット切替時にローカル state を最新値で初期化 (ServoPulseDialog と同 pattern、
  // `memory:zustand_state_reading_selector` 回避 = currentPreset を直接 read)
  useEffect(() => {
    // Props→State sync: currentPresetId 変化時にローカル編集 state を最新 preset で初期化（意図的）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGlobalSpeed(currentPreset.servoConfig.speedDegPerSec ?? 0);
    setPerPinRows(buildSpeedRows(currentPreset.servoConfig.perPinConfigs));
    setHasChanges(false);
  }, [currentPresetId, currentPreset]);

  const handleSave = () => {
    // 既存 pulse-only perPin entry (speedDegPerSec 未定義) は維持、speed override entry は merge。
    // 同 pin に pulse + speed override が混在する場合は pulse entry に speedDegPerSec field を注入。
    const existingPulseConfigs = currentPreset.servoConfig.perPinConfigs || [];
    const pinToSpeed = new Map<number, number>();
    for (const row of perPinRows) {
      pinToSpeed.set(row.pin, row.speedDegPerSec);
    }
    // step 1: 既存 entry を一周、対応する speed が存在すれば speedDegPerSec を上書き、なければ field 削除
    const merged: PinServoConfig[] = existingPulseConfigs.map((c) => {
      const speed = pinToSpeed.get(c.pin);
      pinToSpeed.delete(c.pin); // 既存とマッチした pin はキューから除去
      if (speed !== undefined) {
        return { ...c, speedDegPerSec: speed };
      }
      // 該当 pin の speed override が削除された場合、field は外す (pulse only entry に戻す)
      const { speedDegPerSec, ...rest } = c;
      void speedDegPerSec;
      return rest;
    });
    // step 2: speed のみで pulse 設定がない新規 pin は一括 pulse 値で entry 新規作成
    for (const [pin, speed] of pinToSpeed.entries()) {
      merged.push({
        pin,
        minPulse: currentPreset.servoConfig.minPulse,
        maxPulse: currentPreset.servoConfig.maxPulse,
        speedDegPerSec: speed,
      });
    }

    updatePreset(currentPresetId, {
      servoConfig: {
        ...currentPreset.servoConfig,
        speedDegPerSec: globalSpeed,
        perPinConfigs: merged,
      },
    });
    track('servo_speed_adjust');
    setHasChanges(false);
  };

  const handleReset = () => {
    setGlobalSpeed(currentPreset.servoConfig.speedDegPerSec ?? 0);
    setPerPinRows(buildSpeedRows(currentPreset.servoConfig.perPinConfigs));
    setHasChanges(false);
  };

  const presetDisplayName = currentPreset.id === 'default'
    ? t('pinPreset.defaultName', { defaultValue: 'デフォルト' })
    : currentPreset.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#161B22] border-[#2E333D]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#E6EDF3]">
            <Gauge className="w-5 h-5" />
            {t('servoSpeed.title', { defaultValue: 'サーボスピード調整' })}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('servoSpeed.description', { defaultValue: 'サーボの動作速度 (°/秒) を調整します。0 = 制限なし (既存挙動)。' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現在のプリセット表示 (edit 対象が暗黙的に currentPreset であることを明示) */}
          <div className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#2E333D] rounded-md px-3 py-2">
            {t('servoSpeed.currentPreset', { defaultValue: '現在のプリセット' })}:{' '}
            <span className="text-[#E6EDF3] font-medium">{presetDisplayName}</span>
          </div>

          {/* 一括設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <Gauge className="w-5 h-5" />
                {t('servoSpeed.settings', { defaultValue: 'サーボ速度設定' })}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('servoSpeed.settingsDesc', { defaultValue: '全サーボ共通の最大角速度を設定します。0 = 制限なし (ESP32Servo ネイティブ速度)。' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label className="text-[#E6EDF3]">
                    {t('servoSpeed.speed', { defaultValue: '速度' })} ({t('servoSpeed.speedUnit', { defaultValue: '°/秒' })})
                  </Label>
                  <Input
                    type="number"
                    value={globalSpeed}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setGlobalSpeed(isNaN(val) ? 0 : Math.max(0, Math.min(1000, val)));
                      setHasChanges(true);
                    }}
                    min={0}
                    max={1000}
                    step={10}
                    className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                  />
                </div>
                <p className="text-xs text-[#8B949E] mb-2">
                  {t('servoSpeed.speedHelp', { defaultValue: '0 = 制限なし、推奨レンジ 30-720 °/秒' })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 個別速度設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#E6EDF3] text-sm font-medium">
                    {t('servoSpeed.perPinSettings', { defaultValue: 'ピンごとの個別速度設定' })}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#8B949E] mt-1">
                    {t('servoSpeed.perPinDesc', { defaultValue: 'ピンごとに個別の速度を上書きできます (削除すれば一括設定に戻ります)' })}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#2E333D] text-[#E6EDF3]"
                  onClick={() => {
                    setPerPinRows((prev) => [...prev, { pin: 0, minPulse: currentPreset.servoConfig.minPulse, maxPulse: currentPreset.servoConfig.maxPulse, speedDegPerSec: globalSpeed }]);
                    setHasChanges(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('common.add', { defaultValue: '追加' })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {perPinRows.length === 0 ? (
                <p className="text-xs text-[#8B949E] text-center py-2">
                  {t('servoSpeed.perPinEmpty', { defaultValue: '個別設定なし (上記の一括設定が全ピンに適用されます)' })}
                </p>
              ) : (
                <div className="space-y-2">
                  {perPinRows.map((row, index) => (
                    <div key={index} className="grid grid-cols-[80px_1fr_80px] gap-2 items-center bg-[#0D1117] p-2 rounded-lg border border-[#2E333D]">
                      <div className="space-y-1">
                        <Label className="text-xs text-[#E6EDF3]">GPIO</Label>
                        <Input
                          type="number"
                          value={row.pin}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0 && val <= 39) {
                              setPerPinRows((prev) => prev.map((c, i) => (i === index ? { ...c, pin: val } : c)));
                              setHasChanges(true);
                            }
                          }}
                          min={0}
                          max={39}
                          className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#E6EDF3]">
                          {t('servoSpeed.speed', { defaultValue: '速度' })} ({t('servoSpeed.speedUnit', { defaultValue: '°/秒' })})
                        </Label>
                        <Input
                          type="number"
                          value={row.speedDegPerSec}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              const clamped = Math.max(0, Math.min(1000, val));
                              setPerPinRows((prev) => prev.map((c, i) => (i === index ? { ...c, speedDegPerSec: clamped } : c)));
                              setHasChanges(true);
                            }
                          }}
                          min={0}
                          max={1000}
                          step={10}
                          className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                        />
                      </div>
                      <div className="flex items-end pb-0.5 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D] h-8 w-8 p-0"
                          onClick={() => {
                            setPerPinRows((prev) => prev.map((c, i) => (i === index ? { ...c, speedDegPerSec: globalSpeed } : c)));
                            setHasChanges(true);
                          }}
                          title={t('servoSpeed.resetPerPin', { defaultValue: 'デフォルト (グローバル値) に戻す' })}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                          onClick={() => {
                            setPerPinRows((prev) => prev.filter((_, i) => i !== index));
                            setHasChanges(true);
                          }}
                          title={t('common.delete', { defaultValue: '削除' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t border-[#2E333D] pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
            className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.cancel', { defaultValue: 'キャンセル' })}
          </Button>
          <Button
            onClick={() => {
              handleSave();
              onOpenChange(false);
            }}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            {t('common.save', { defaultValue: '保存' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
