/**
 * サーボトリム調整ダイアログ (Phase 3-E rewrite + Session 156 設計変更で reverse 分離、 trim 専用)
 *
 * 設計転換 (経路 A 廃止、経路 B 統一):
 *   旧 paradigm = transport (HTTP/Serial/BLE) + device runtime 反映 + localStorage 経路。
 *   新 paradigm = pinPresetStore.servoConfig.trimDeg 直書き → compile 時に setChannelTrim
 *     emit (Phase 3-D 完了済)。
 *
 * Session 156 設計変更: reverse 軸を別 dialog (ServoReverseDialog) に分離。 trim と reverse は
 *   独立 dialog (= サイドバーメニューで個別 entry、 同 form pattern で UI 一貫性維持)。
 *
 * 解消した case 23 / rule 18 §D2 違反 cluster (F1-F5、 Step 1 §A):
 *   F1 WiFi OTA template applyTrimsToActuators = log only (物理 servo 不動)
 *   F2 USB/BLE template servos[] only (biped_init 経由 ServoChannel180 不到達)
 *   F3 ServoTrimDialog ↔ pinPresetStore 非同期 (compile 焼き込み path 不在)
 *   F4 OK ボタン silent return (transport 不在時 UI feedback ゼロ)
 *   F5 USB/BLE servos[i].write(90 + trim) ステップジャンプ (リニア体感喪失)
 *   → 経路 A 廃止 + 経路 B 統一で全件構造的解消 (Phase 3-F で template handler 削除済)。
 *
 * cpp-generator は `utils/pinHelper.ts:getServoTrim` 経由で本 dialog 経由 更新された
 * pinPresetStore.servoConfig.trimDeg 値を読み、 compile 時に R1 invariant で emit:
 *   - bipedBlocks/morpherBlocks/roverBlocks_init: `<lib>.setChannelTrim(i, trim)` (default 以外のみ emit)
 *   - servoBlocks.servo_write: `constrain((180 - String(angle).toInt()) + trim, 0, 180)`
 *     (reverse + trim 組合せ時、 ServoChannel180._writeHw lib semantic と align)
 *
 * 関連:
 * - ServoPulseDialog: パルス幅 (μs)、サーボ個体差吸収 (別 dialog、 同 pinPresetStore 直書き paradigm)
 * - ServoSpeedDialog: 速度 (°/秒)、 ギヤ保護 (別 dialog、 同 paradigm)
 * - ServoReverseDialog: 取付方向逆向き補正 (= 別 dialog、 同 paradigm、 Session 156 分離)
 * - PinPresetDialog: ピン番号設定 (別 dialog、 同 paradigm)
 * - 経路 B 統一以降、 5 dialog 全て pinPresetStore 直書き paradigm。
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
import { Slider } from '@/components/ui/slider';
import { SlidersHorizontal, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { usePinPresetStore, type PinServoConfig } from '@/stores/pinPresetStore';
import { track } from '@/lib/analytics';

interface ServoTrimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// UI 表示用 per-pin row 型: pin + trim 明示的 override 値。
// 既存 perPinConfigs から trimDeg が定義済の entry を抽出 (reverse は ServoReverseDialog 担当、
// 本 dialog では非関与)。
type TrimRow = PinServoConfig & { trimDeg: number };

function buildTrimRows(configs: PinServoConfig[] | undefined): TrimRow[] {
  return (configs || [])
    .filter((c): c is TrimRow => c.trimDeg !== undefined)
    .map((c) => ({ ...c }));
}

export function ServoTrimDialog({ open, onOpenChange }: ServoTrimDialogProps) {
  const { t } = useTranslation();
  const { getCurrentPreset, updatePreset, currentPresetId } = usePinPresetStore();

  const currentPreset = getCurrentPreset();
  const [globalTrim, setGlobalTrim] = useState<number>(currentPreset.servoConfig.trimDeg ?? 0);
  const [perPinRows, setPerPinRows] = useState<TrimRow[]>(
    buildTrimRows(currentPreset.servoConfig.perPinConfigs),
  );
  const [hasChanges, setHasChanges] = useState(false);

  // プリセット切替時にローカル state を最新値で初期化 (ServoPulse/Speed と同 pattern)
  useEffect(() => {
    // Props→State sync: currentPresetId 変化時にローカル編集 state を最新 preset で初期化（意図的）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGlobalTrim(currentPreset.servoConfig.trimDeg ?? 0);
    setPerPinRows(buildTrimRows(currentPreset.servoConfig.perPinConfigs));
    setHasChanges(false);
  }, [currentPresetId, currentPreset]);

  const handleSave = () => {
    // Merge logic (ServoSpeedDialog handleSave と同 pattern、 sibling field 保護):
    //   既存 perPin entry の pulse / speed / reverse field は維持、 本 dialog で操作した trim
    //   のみ update。 同 pin に pulse + trim + reverse + speed 混在 OK。
    //   行が削除された pin は trim field のみ外し、 pulse/speed/reverse entry はそのまま残す。
    const existingPerPinConfigs = currentPreset.servoConfig.perPinConfigs || [];
    const pinToTrim = new Map<number, number>();
    for (const row of perPinRows) {
      pinToTrim.set(row.pin, row.trimDeg);
    }
    // step 1: 既存 entry を巡回。対応する trim があれば上書き、 なければ field を外す
    const merged: PinServoConfig[] = existingPerPinConfigs.map((c) => {
      const trim = pinToTrim.get(c.pin);
      pinToTrim.delete(c.pin);
      if (trim !== undefined) {
        return { ...c, trimDeg: trim };
      }
      // 行が削除された pin: trimDeg field を外し pulse/speed/reverse entry に戻す
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { trimDeg, ...rest } = c;
      return rest;
    });
    // step 2: 新規 pin (= 既存 perPinConfigs に entry なし) は global pulse 値で entry を新規作成
    for (const [pin, trim] of pinToTrim.entries()) {
      merged.push({
        pin,
        minPulse: currentPreset.servoConfig.minPulse,
        maxPulse: currentPreset.servoConfig.maxPulse,
        trimDeg: trim,
      });
    }

    updatePreset(currentPresetId, {
      servoConfig: {
        ...currentPreset.servoConfig,
        trimDeg: globalTrim,
        perPinConfigs: merged,
      },
    });
    track('servo_trim_adjust');
    setHasChanges(false);
  };

  const handleReset = () => {
    setGlobalTrim(currentPreset.servoConfig.trimDeg ?? 0);
    setPerPinRows(buildTrimRows(currentPreset.servoConfig.perPinConfigs));
    setHasChanges(false);
  };

  const presetDisplayName = currentPreset.id === 'default'
    ? t('pinPreset.defaultName', { defaultValue: 'デフォルト' })
    : currentPreset.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#161B22] border-[#2E333D]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#E6EDF3]">
            <SlidersHorizontal className="w-5 h-5" />
            {t('servo.trim.title', { defaultValue: 'サーボトリム調整' })}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('servo.trim.description', {
              defaultValue:
                'サーボの中心位置オフセット (°) を調整します。 次回コンパイル時に device に焼き込まれます (compile-time 反映、 device 接続不要)。',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現在のプリセット表示 */}
          <div className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#2E333D] rounded-md px-3 py-2">
            {t('servo.trim.currentPreset', { defaultValue: '現在のプリセット' })}:{' '}
            <span className="text-[#E6EDF3] font-medium">{presetDisplayName}</span>
          </div>

          {/* 一括設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <SlidersHorizontal className="w-5 h-5" />
                {t('servo.trim.globalSettings', { defaultValue: '全体トリム設定' })}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('servo.trim.globalSettingsDesc', {
                  defaultValue: '全 servo 共通の trim (°) を設定。 個別設定で上書き可。',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-[#E6EDF3]">
                  {t('servo.trim.globalTrim', { defaultValue: 'トリム' })} (°)
                </Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[globalTrim]}
                    min={-30}
                    max={30}
                    step={1}
                    onValueChange={([v]) => {
                      setGlobalTrim(v);
                      setHasChanges(true);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={globalTrim}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setGlobalTrim(Math.max(-30, Math.min(30, val)));
                        setHasChanges(true);
                      }
                    }}
                    min={-30}
                    max={30}
                    className="w-16 h-8 text-sm text-center bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 個別設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#E6EDF3] text-sm font-medium">
                    {t('servo.trim.perPinSettings', { defaultValue: 'ピンごとの個別トリム設定' })}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#8B949E] mt-1">
                    {t('servo.trim.perPinDesc', {
                      defaultValue: 'ピンごとに trim を個別 override (削除で全体設定に戻る)',
                    })}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#2E333D] text-[#E6EDF3]"
                  onClick={() => {
                    setPerPinRows((prev) => [
                      ...prev,
                      {
                        pin: 0,
                        minPulse: currentPreset.servoConfig.minPulse,
                        maxPulse: currentPreset.servoConfig.maxPulse,
                        trimDeg: globalTrim,
                      },
                    ]);
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
                  {t('servo.trim.perPinEmpty', { defaultValue: '個別設定なし (全体設定が適用)' })}
                </p>
              ) : (
                <div className="space-y-2">
                  {perPinRows.map((row, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[80px_1fr_70px_40px] gap-2 items-end bg-[#0D1117] p-2 rounded-lg border border-[#2E333D]"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs text-[#E6EDF3]">GPIO</Label>
                        <Input
                          type="number"
                          value={row.pin}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0 && val <= 39) {
                              setPerPinRows((prev) =>
                                prev.map((c, i) => (i === index ? { ...c, pin: val } : c)),
                              );
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
                          {t('servo.trim.perPinTrim', { defaultValue: 'トリム' })} (°)
                        </Label>
                        <Slider
                          value={[row.trimDeg]}
                          min={-30}
                          max={30}
                          step={1}
                          onValueChange={([v]) => {
                            setPerPinRows((prev) =>
                              prev.map((c, i) => (i === index ? { ...c, trimDeg: v } : c)),
                            );
                            setHasChanges(true);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#E6EDF3]">°</Label>
                        <Input
                          type="number"
                          value={row.trimDeg}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              const clamped = Math.max(-30, Math.min(30, val));
                              setPerPinRows((prev) =>
                                prev.map((c, i) => (i === index ? { ...c, trimDeg: clamped } : c)),
                              );
                              setHasChanges(true);
                            }
                          }}
                          min={-30}
                          max={30}
                          className="h-8 text-sm text-center bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                        />
                      </div>
                      <div className="flex items-end pb-0.5 gap-1">
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
