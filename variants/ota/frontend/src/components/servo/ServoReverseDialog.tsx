/**
 * サーボリバース設定ダイアログ (Session 156 設計変更で ServoTrimDialog から分離、 reverse 専用)
 *
 * サーボの取付方向逆向き (reverse) を調整。 `currentPreset.servoConfig.reverse` (一括) +
 * `perPinConfigs[].reverse` (ピン別 override) を編集。
 *
 * cpp-generator (`utils/pinHelper.ts:getServoReverse`) はこの値を読む。
 * reverse=false (default) で既存挙動と完全互換 = lib `IActuatorChannel::setReverse` 不呼出、
 * generator 経由 `setChannelReverse(i, true)` も emit skip = R1 invariant 維持
 * (Phase 3-D 完成、 reverse 軸 generator emit Layer)。
 *
 * UI pattern は ServoSpeedDialog の wholesale clone、 編集対象を reverse (boolean) に置換
 * (一括 Card + 個別 Card + Reset/Save footer、 `memory:atomic_compound_actions`)。
 *
 * case 22 founding use case 達成 path: 等身大 Humanoid 物理取付方向逆向きの user-facing 補正。
 * compile-time only (= runtime transport なし、 ServoSpeedDialog と同 paradigm)。
 *
 * 関連:
 * - ServoPulseDialog: パルス幅 (μs)、 サーボ個体差吸収 (別 dialog)
 * - ServoSpeedDialog: 速度 (°/秒)、 ギヤ保護 (別 dialog)
 * - ServoTrimDialog: 中心位置オフセット (°)、 機械誤差補正 (別 dialog)
 * - Pro 限定 (canUseServoPulse() alias re-use、 `memory:prerelease_open_scope` で
 *   prerelease 中は全 user 開放、 Sidebar の proGate で gate)
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
import { Switch } from '@/components/ui/switch';
import { ArrowLeftRight, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { usePinPresetStore, type PinServoConfig } from '@/stores/pinPresetStore';
import { track } from '@/lib/analytics';

interface ServoReverseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// perPin row が UI に表示される時点で reverse は明示的 override (boolean、 false 含む)。
// PinServoConfig.reverse は optional だが、 UI 編集中の row では非 optional の扱い。
type ReverseRow = PinServoConfig & { reverse: boolean };

export function ServoReverseDialog({ open, onOpenChange }: ServoReverseDialogProps) {
  const { t } = useTranslation();
  const { getCurrentPreset, updatePreset, currentPresetId } = usePinPresetStore();

  const currentPreset = getCurrentPreset();
  const [globalReverse, setGlobalReverse] = useState<boolean>(currentPreset.servoConfig.reverse ?? false);
  // perPin の reverse が undefined の entry は本 dialog では編集対象外
  // (UI 表示時に明示的 override か否かを区別必要、 undefined = "global にフォールバック" 意味維持)。
  // contract: undefined → global fallback、 UI で row を追加した瞬間に「明示的 override」 になる。
  const buildReverseRows = (configs: PinServoConfig[] | undefined): ReverseRow[] =>
    (configs || [])
      .filter((c): c is ReverseRow => c.reverse !== undefined)
      .map((c) => ({ ...c }));
  const [perPinRows, setPerPinRows] = useState<ReverseRow[]>(buildReverseRows(currentPreset.servoConfig.perPinConfigs));
  const [hasChanges, setHasChanges] = useState(false);

  // プリセット切替時にローカル state を最新値で初期化 (ServoSpeedDialog と同 pattern)
  useEffect(() => {
    // Props→State sync: currentPresetId 変化時にローカル編集 state を最新 preset で初期化（意図的）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGlobalReverse(currentPreset.servoConfig.reverse ?? false);
    setPerPinRows(buildReverseRows(currentPreset.servoConfig.perPinConfigs));
    setHasChanges(false);
  }, [currentPresetId, currentPreset]);

  const handleSave = () => {
    // Merge logic (ServoSpeedDialog handleSave と同 pattern、 sibling field 保護):
    //   既存 perPin entry の pulse / speed / trim field は維持、 本 dialog で操作した reverse
    //   のみ update。 同 pin に複数 field 混在 OK。
    //   行が削除された pin は reverse field のみ外し、 pulse/speed/trim entry はそのまま残す。
    const existingPerPinConfigs = currentPreset.servoConfig.perPinConfigs || [];
    const pinToReverse = new Map<number, boolean>();
    for (const row of perPinRows) {
      pinToReverse.set(row.pin, row.reverse);
    }
    // step 1: 既存 entry を巡回。 対応する reverse があれば上書き、 なければ field を外す
    const merged: PinServoConfig[] = existingPerPinConfigs.map((c) => {
      const reverse = pinToReverse.get(c.pin);
      pinToReverse.delete(c.pin);
      if (reverse !== undefined) {
        return { ...c, reverse };
      }
      // 行が削除された pin: reverse field を外し pulse/speed/trim entry に戻す
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { reverse: _r, ...rest } = c;
      return rest;
    });
    // step 2: 新規 pin (= 既存 perPinConfigs に entry なし) は global pulse 値で entry を新規作成
    for (const [pin, reverse] of pinToReverse.entries()) {
      merged.push({
        pin,
        minPulse: currentPreset.servoConfig.minPulse,
        maxPulse: currentPreset.servoConfig.maxPulse,
        reverse,
      });
    }

    updatePreset(currentPresetId, {
      servoConfig: {
        ...currentPreset.servoConfig,
        reverse: globalReverse,
        perPinConfigs: merged,
      },
    });
    track('servo_reverse_adjust');
    setHasChanges(false);
  };

  const handleReset = () => {
    setGlobalReverse(currentPreset.servoConfig.reverse ?? false);
    setPerPinRows(buildReverseRows(currentPreset.servoConfig.perPinConfigs));
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
            <ArrowLeftRight className="w-5 h-5" />
            {t('servoReverse.title', { defaultValue: 'サーボリバース設定' })}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('servoReverse.description', {
              defaultValue:
                'サーボの取付方向逆向き (reverse) を設定します。 物理取付が逆向きの場合に user-facing angle を mirror。 次回コンパイル時に device に焼き込まれます (compile-time 反映)。',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現在のプリセット表示 (edit 対象が暗黙的に currentPreset であることを明示) */}
          <div className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#2E333D] rounded-md px-3 py-2">
            {t('servoReverse.currentPreset', { defaultValue: '現在のプリセット' })}:{' '}
            <span className="text-[#E6EDF3] font-medium">{presetDisplayName}</span>
          </div>

          {/* 一括設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <ArrowLeftRight className="w-5 h-5" />
                {t('servoReverse.settings', { defaultValue: 'サーボリバース設定' })}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('servoReverse.settingsDesc', {
                  defaultValue: '全サーボ共通のリバースを設定します。 物理取付が逆向きの場合に ON。',
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Switch
                  checked={globalReverse}
                  onCheckedChange={(c) => {
                    setGlobalReverse(c);
                    setHasChanges(true);
                  }}
                  aria-label={t('servoReverse.globalReverse', { defaultValue: '取付方向逆向き (reverse)' })}
                />
                <Label className="text-sm text-[#E6EDF3]">
                  {t('servoReverse.globalReverse', { defaultValue: '取付方向逆向き (reverse)' })}
                </Label>
              </div>
              <p className="text-xs text-[#8B949E] mt-2">
                {t('servoReverse.help', {
                  defaultValue:
                    'OFF = 通常方向 (= R1 invariant、 既存 cpp 形状不変) / ON = mirror (180° servo: 180 - angle、 連続回転 servo: velocity 符号反転、 dc motor: H-bridge pin swap effect)',
                })}
              </p>
            </CardContent>
          </Card>

          {/* 個別設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#E6EDF3] text-sm font-medium">
                    {t('servoReverse.perPinSettings', { defaultValue: 'ピンごとの個別リバース設定' })}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#8B949E] mt-1">
                    {t('servoReverse.perPinDesc', {
                      defaultValue: 'ピンごとに個別のリバースを上書きできます (削除すれば一括設定に戻ります)',
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
                        reverse: globalReverse,
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
                  {t('servoReverse.perPinEmpty', { defaultValue: '個別設定なし (上記の一括設定が全ピンに適用されます)' })}
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
                          {t('servoReverse.perPinReverse', { defaultValue: '取付方向逆向き' })}
                        </Label>
                        <div className="flex items-center gap-2 h-8">
                          <Switch
                            checked={row.reverse}
                            onCheckedChange={(c) => {
                              setPerPinRows((prev) => prev.map((rr, i) => (i === index ? { ...rr, reverse: c } : rr)));
                              setHasChanges(true);
                            }}
                            aria-label={t('servoReverse.perPinReverse', { defaultValue: '取付方向逆向き' })}
                          />
                          <span className="text-xs text-[#8B949E]">
                            {row.reverse
                              ? t('servoReverse.on', { defaultValue: 'ON (逆向き)' })
                              : t('servoReverse.off', { defaultValue: 'OFF (通常)' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-end pb-0.5 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D] h-8 w-8 p-0"
                          onClick={() => {
                            setPerPinRows((prev) => prev.map((c, i) => (i === index ? { ...c, reverse: globalReverse } : c)));
                            setHasChanges(true);
                          }}
                          title={t('servoReverse.resetPerPin', { defaultValue: 'デフォルト (グローバル値) に戻す' })}
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
