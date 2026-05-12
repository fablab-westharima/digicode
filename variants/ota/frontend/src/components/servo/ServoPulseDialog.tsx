/**
 * サーボパルス調整ダイアログ (第107回 Task 1)
 *
 * サーボのパルス幅 (min/max μs) を調整。`currentPreset.servoConfig` を編集。
 * ピンごとの個別パルス幅設定も含む (サーボ個体差吸収用)。
 *
 * cpp-generator (`utils/pinHelper.ts:getServoPulseWidth`) はこの servoConfig を読む。
 * data 配置は `pinPresetStore.PinPreset.servoConfig` のまま (第107回 D-1 (a))、
 * preset 切替で servoConfig も同時切替する現挙動を維持。
 *
 * 関連:
 * - サーボトリム設定 (ServoTrimDialog): デバイス接続後の角度オフセット調整 (別機能)
 * - ピンアサイン設定 (PinSettingsDialog): GPIO pin 番号設定 (別機能、本 commit で servo pulse Card 削除済)
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gauge, Save, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { usePinPresetStore, SERVO_TYPE_DEFAULTS, type ServoType, type PinServoConfig } from '@/stores/pinPresetStore';

interface ServoPulseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServoPulseDialog({ open, onOpenChange }: ServoPulseDialogProps) {
  const { t } = useTranslation();
  const { getCurrentPreset, updatePreset, currentPresetId } = usePinPresetStore();

  const currentPreset = getCurrentPreset();
  const [servoType, setServoType] = useState<ServoType>(currentPreset.servoConfig.servoType);
  const [minPulse, setMinPulse] = useState(currentPreset.servoConfig.minPulse);
  const [maxPulse, setMaxPulse] = useState(currentPreset.servoConfig.maxPulse);
  const [perPinConfigs, setPerPinConfigs] = useState<PinServoConfig[]>(currentPreset.servoConfig.perPinConfigs || []);
  const [hasChanges, setHasChanges] = useState(false);

  // プリセット切替時にローカル state を最新値で初期化 (PinSettings と同 pattern)
  useEffect(() => {
    // Props→State sync: currentPresetId 変化時にローカル編集 state を最新 preset で初期化（意図的）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setServoType(currentPreset.servoConfig.servoType);
    setMinPulse(currentPreset.servoConfig.minPulse);
    setMaxPulse(currentPreset.servoConfig.maxPulse);
    setPerPinConfigs(currentPreset.servoConfig.perPinConfigs || []);
    setHasChanges(false);
  }, [currentPresetId, currentPreset]);

  const handleServoTypeChange = (type: ServoType) => {
    setServoType(type);
    const defaults = SERVO_TYPE_DEFAULTS[type];
    setMinPulse(defaults.min);
    setMaxPulse(defaults.max);
    setHasChanges(true);
  };

  const handleSave = () => {
    updatePreset(currentPresetId, {
      servoConfig: { servoType, minPulse, maxPulse, perPinConfigs },
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setServoType(currentPreset.servoConfig.servoType);
    setMinPulse(currentPreset.servoConfig.minPulse);
    setMaxPulse(currentPreset.servoConfig.maxPulse);
    setPerPinConfigs(currentPreset.servoConfig.perPinConfigs || []);
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
            {t('servoPulse.title', { defaultValue: 'サーボパルス調整' })}
          </DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('servoPulse.description', { defaultValue: 'サーボの個体差に合わせてパルス幅 (μs) を調整します。' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現在のプリセット表示 (context、edit 対象が暗黙的に currentPreset であることを明示) */}
          <div className="text-xs text-[#8B949E] bg-[#0D1117] border border-[#2E333D] rounded-md px-3 py-2">
            {t('servoPulse.currentPreset', { defaultValue: '現在のプリセット' })}:{' '}
            <span className="text-[#E6EDF3] font-medium">{presetDisplayName}</span>
          </div>

          {/* 一括設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <Gauge className="w-5 h-5" />
                {t('servoPulse.settings', { defaultValue: 'サーボパルス幅設定' })}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('servoPulse.settingsDesc', { defaultValue: '使用するサーボモーターのタイプに応じてパルス幅を設定します' })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#E6EDF3]">{t('servoPulse.servoType', { defaultValue: 'サーボタイプ' })}</Label>
                  <Select value={servoType} onValueChange={(v) => handleServoTypeChange(v as ServoType)}>
                    <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="180">{t('servoPulse.servo180', { defaultValue: '180度 (SG90等)' })}</SelectItem>
                      <SelectItem value="270">{t('servoPulse.servo270', { defaultValue: '270度 (ASMC-04B等)' })}</SelectItem>
                      <SelectItem value="360">{t('servoPulse.servo360', { defaultValue: '360度 (連続回転)' })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#E6EDF3]">{t('servoPulse.minPulse', { defaultValue: '最小パルス幅 (μs)' })}</Label>
                  <Input
                    type="number"
                    value={minPulse}
                    onChange={(e) => { setMinPulse(parseInt(e.target.value, 10)); setHasChanges(true); }}
                    min={100}
                    max={1500}
                    className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#E6EDF3]">{t('servoPulse.maxPulse', { defaultValue: '最大パルス幅 (μs)' })}</Label>
                  <Input
                    type="number"
                    value={maxPulse}
                    onChange={(e) => { setMaxPulse(parseInt(e.target.value, 10)); setHasChanges(true); }}
                    min={1500}
                    max={3000}
                    className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 個別パルス幅設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#E6EDF3] text-sm font-medium">
                    {t('servoPulse.perPinSettings', { defaultValue: 'ピンごとの個別パルス幅設定' })}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#8B949E] mt-1">
                    {t('servoPulse.perPinDesc', { defaultValue: 'サーボの個体差に合わせて、ピンごとにパルス幅を上書きできます' })}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#2E333D] text-[#E6EDF3]"
                  onClick={() => {
                    setPerPinConfigs(prev => [...prev, { pin: 0, minPulse, maxPulse }]);
                    setHasChanges(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('common.add', { defaultValue: '追加' })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {perPinConfigs.length === 0 ? (
                <p className="text-xs text-[#8B949E] text-center py-2">
                  {t('servoPulse.perPinEmpty', { defaultValue: '個別設定なし (上記の一括設定が全ピンに適用されます)' })}
                </p>
              ) : (
                <div className="space-y-2">
                  {perPinConfigs.map((config, index) => (
                    <div key={index} className="grid grid-cols-[80px_1fr_1fr_40px] gap-2 items-center bg-[#0D1117] p-2 rounded-lg border border-[#2E333D]">
                      <div className="space-y-1">
                        <Label className="text-xs text-[#E6EDF3]">GPIO</Label>
                        <Input
                          type="number"
                          value={config.pin}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0 && val <= 39) {
                              setPerPinConfigs(prev => prev.map((c, i) => i === index ? { ...c, pin: val } : c));
                              setHasChanges(true);
                            }
                          }}
                          min={0}
                          max={39}
                          className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#E6EDF3]">{t('servoPulse.minPulse', { defaultValue: '最小パルス幅 (μs)' })}</Label>
                        <Input
                          type="number"
                          value={config.minPulse}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              setPerPinConfigs(prev => prev.map((c, i) => i === index ? { ...c, minPulse: val } : c));
                              setHasChanges(true);
                            }
                          }}
                          min={100}
                          max={1500}
                          className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-[#E6EDF3]">{t('servoPulse.maxPulse', { defaultValue: '最大パルス幅 (μs)' })}</Label>
                        <Input
                          type="number"
                          value={config.maxPulse}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              setPerPinConfigs(prev => prev.map((c, i) => i === index ? { ...c, maxPulse: val } : c));
                              setHasChanges(true);
                            }
                          }}
                          min={1500}
                          max={3000}
                          className="h-8 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                        />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8 p-0"
                          onClick={() => {
                            setPerPinConfigs(prev => prev.filter((_, i) => i !== index));
                            setHasChanges(true);
                          }}
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
