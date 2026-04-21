/*
 * Pin Preset Management Dialog
 *
 * Allows users to:
 * - Select preset (HP Robot default)
 * - Create custom presets (premium)
 * - Edit custom presets (premium)
 * - Delete custom presets (premium)
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePinPresetStore, type PinPreset, type ServoConfig, type ServoType, SERVO_TYPE_DEFAULTS } from '@/stores/pinPresetStore';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface PinPresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PinPresetDialog({ open, onOpenChange }: PinPresetDialogProps) {
  const { t } = useTranslation();
  const { getCurrentPreset, presets, setCurrentPreset, addCustomPreset, updatePreset, deletePreset } = usePinPresetStore();
  const user = useAuthStore((s) => s.user);
  const { canUsePinAssign, isFreeOpenNow, getFreeUntil, fetchFlags } = useFeatureFlagStore();
  const isPremiumEnabled = canUsePinAssign(user?.plan);
  const currentPreset = getCurrentPreset();
  const [editingPreset, setEditingPreset] = useState<PinPreset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  useEffect(() => {
    if (open) fetchFlags();
  }, [open, fetchFlags]);

  const handleCreateNew = () => {
    const newPreset: PinPreset = {
      id: `custom_${Date.now()}`,
      name: t('pinPreset.newPresetName', { defaultValue: '新規プリセット' }),
      isPremium: true,
      isCustom: true,
      servoConfig: { ...currentPreset.servoConfig },
      pins: { ...currentPreset.pins },
    };
    setEditingPreset(newPreset);
    setIsCreating(true);
  };

  const handleView = (preset: PinPreset) => {
    setEditingPreset({ ...preset });
    setIsViewMode(true);
    setIsCreating(false);
  };

  const handleEdit = (preset: PinPreset) => {
    setEditingPreset({ ...preset });
    setIsViewMode(false);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!editingPreset || isViewMode) return;

    if (isCreating) {
      addCustomPreset(editingPreset);
    } else {
      updatePreset(editingPreset.id, editingPreset);
    }
    setEditingPreset(null);
    setIsCreating(false);
    setIsViewMode(false);
  };

  const handleCancel = () => {
    setEditingPreset(null);
    setIsCreating(false);
    setIsViewMode(false);
  };

  const handleDelete = (presetId: string) => {
    if (confirm(t('pinPreset.deleteConfirm', { defaultValue: 'このプリセットを削除しますか？' }))) {
      deletePreset(presetId);
    }
  };

  const updatePinValue = (pinKey: keyof PinPreset['pins'], value: number) => {
    if (!editingPreset || isViewMode) return;
    setEditingPreset({
      ...editingPreset,
      pins: {
        ...editingPreset.pins,
        [pinKey]: value,
      },
    });
  };

  const updateServoConfigValue = (key: keyof ServoConfig, value: number | ServoType) => {
    if (!editingPreset || isViewMode) return;
    setEditingPreset({
      ...editingPreset,
      servoConfig: {
        ...editingPreset.servoConfig,
        [key]: value,
      },
    });
  };

  const handleServoTypeChange = (servoType: ServoType) => {
    if (!editingPreset || isViewMode) return;
    const defaults = SERVO_TYPE_DEFAULTS[servoType];
    setEditingPreset({
      ...editingPreset,
      servoConfig: {
        servoType,
        minPulse: defaults.min,
        maxPulse: defaults.max,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('pinPreset.title', { defaultValue: 'ピンプリセット管理' })}</DialogTitle>
          <DialogDescription>
            {t('pinPreset.description', { defaultValue: 'デフォルトのピン番号プリセットを選択、または独自のプリセットを作成できます' })}
          </DialogDescription>
        </DialogHeader>

        {!editingPreset ? (
          // Preset List View
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">{t('pinPreset.availablePresets', { defaultValue: '利用可能なプリセット' })}</h3>
              <Button onClick={handleCreateNew} size="sm" disabled={!isPremiumEnabled}>
                {!isPremiumEnabled && <span className="mr-2">🔒</span>}
                {t('pinPreset.createNew', { defaultValue: '新規作成' })}{!isPremiumEnabled && t('pinPreset.premiumSuffix', { defaultValue: '（プレミアム）' })}
              </Button>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      currentPreset.id === preset.id
                        ? 'bg-green-50 border-green-500'
                        : 'hover:bg-gray-500/10'
                    }`}
                    onClick={() => setCurrentPreset(preset.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{preset.id === 'default' ? t('pinPreset.defaultName', { defaultValue: 'デフォルト' }) : preset.name}</h4>
                        {preset.isPremium && (
                          <Badge variant="secondary" className="text-xs">
                            {t('pinPreset.premiumBadge', { defaultValue: 'プレミアム' })}
                          </Badge>
                        )}
                        {currentPreset.id === preset.id && (
                          <Badge variant="default" className="text-xs">
                            {t('pinPreset.inUseBadge', { defaultValue: '使用中' })}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(preset);
                          }}
                        >
                          {t('pinPreset.viewDetails', { defaultValue: '詳細を見る' })}
                        </Button>
                        {preset.isCustom && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(preset);
                              }}
                              disabled={!isPremiumEnabled}
                            >
                              {t('pinPreset.edit', { defaultValue: '編集' })}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(preset.id);
                              }}
                              disabled={!isPremiumEnabled}
                            >
                              {t('pinPreset.deleteBtn', { defaultValue: '削除' })}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {preset.isCustom
                        ? t('pinPreset.customPreset', { defaultValue: 'カスタムプリセット' })
                        : t('pinPreset.defaultPreset', { defaultValue: 'デフォルトプリセット' })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Edit/Create/View Mode
          <Tabs defaultValue="humanoid" className="w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {isViewMode
                    ? t('pinPreset.presetDetails', { defaultValue: 'プリセット詳細' })
                    : isCreating
                      ? t('pinPreset.createNewPreset', { defaultValue: '新規プリセット作成' })
                      : t('pinPreset.editPreset', { defaultValue: 'プリセット編集' })}
                </h3>
              </div>
              <div>
                <Label htmlFor="preset-name">{t('pinPreset.presetName', { defaultValue: 'プリセット名' })}</Label>
                <Input
                  id="preset-name"
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  placeholder={t('pinPreset.presetNamePlaceholder', { defaultValue: 'プリセット名を入力' })}
                  disabled={isViewMode}
                />
              </div>

              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="humanoid">{t('pinPreset.tabs.humanoid', { defaultValue: 'Humanoid' })}</TabsTrigger>
                <TabsTrigger value="sensors">{t('pinPreset.tabs.sensors', { defaultValue: 'センサー' })}</TabsTrigger>
                <TabsTrigger value="peripherals">{t('pinPreset.tabs.peripherals', { defaultValue: '周辺機器' })}</TabsTrigger>
                <TabsTrigger value="display">{t('pinPreset.tabs.display', { defaultValue: 'ディスプレイ' })}</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[350px]">
                <TabsContent value="humanoid" className="space-y-4 pr-4">
                  <h4 className="font-medium mb-2">{t('pinPreset.sections.humanoid', { defaultValue: 'Humanoid' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pinPreset.pins.leftLeg', { defaultValue: '左足 (Left Leg)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoLeftLeg}
                        onChange={(e) => updatePinValue('ottoLeftLeg', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.rightLeg', { defaultValue: '右足 (Right Leg)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoRightLeg}
                        onChange={(e) => updatePinValue('ottoRightLeg', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.leftFoot', { defaultValue: '左足首 (Left Foot)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoLeftFoot}
                        onChange={(e) => updatePinValue('ottoLeftFoot', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.rightFoot', { defaultValue: '右足首 (Right Foot)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoRightFoot}
                        onChange={(e) => updatePinValue('ottoRightFoot', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <h4 className="font-medium mb-2 mt-4">{t('pinPreset.sections.wheelRobot', { defaultValue: 'Wheel' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pinPreset.pins.leftWheel', { defaultValue: '左車輪 (Left Wheel)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoWheelLeft}
                        onChange={(e) => updatePinValue('ottoWheelLeft', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.rightWheel', { defaultValue: '右車輪 (Right Wheel)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoWheelRight}
                        onChange={(e) => updatePinValue('ottoWheelRight', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <h4 className="font-medium mb-2 mt-4">{t('pinPreset.sections.transform', { defaultValue: 'Transform' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pinPreset.pins.leftLeg', { defaultValue: '左足 (Left Leg)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoNinjaLeftLeg}
                        onChange={(e) => updatePinValue('ottoNinjaLeftLeg', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.rightLeg', { defaultValue: '右足 (Right Leg)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoNinjaRightLeg}
                        onChange={(e) => updatePinValue('ottoNinjaRightLeg', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.leftFoot', { defaultValue: '左足首 (Left Foot)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoNinjaLeftFoot}
                        onChange={(e) => updatePinValue('ottoNinjaLeftFoot', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.rightFoot', { defaultValue: '右足首 (Right Foot)' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ottoNinjaRightFoot}
                        onChange={(e) => updatePinValue('ottoNinjaRightFoot', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sensors" className="space-y-4 pr-4">
                  <h4 className="font-medium mb-2">{t('pinPreset.sections.rus04', { defaultValue: 'RUS-04 超音波センサー (RGB付き)' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pinPreset.pins.rgb', { defaultValue: 'RGB ピン' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ultrasonicRgb}
                        onChange={(e) => updatePinValue('ultrasonicRgb', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.io', { defaultValue: 'I/O ピン' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.ultrasonicIo}
                        onChange={(e) => updatePinValue('ultrasonicIo', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <h4 className="font-medium mb-2 mt-4">{t('pinPreset.sections.otherSensors', { defaultValue: 'その他のセンサー' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pinPreset.pins.buzzer', { defaultValue: 'ブザー' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.buzzer}
                        onChange={(e) => updatePinValue('buzzer', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.neopixelRing', { defaultValue: 'NeoPixel Ring' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.neopixelRing}
                        onChange={(e) => updatePinValue('neopixelRing', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="peripherals" className="space-y-4 pr-4">
                  <h4 className="font-medium mb-2">{t('pinPreset.sections.servoMotor', { defaultValue: 'サーボモーター' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pinPreset.pins.servo1', { defaultValue: 'サーボ 1 ピン' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.servo1}
                        onChange={(e) => updatePinValue('servo1', parseInt(e.target.value) || 0)}
                        disabled={isViewMode}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.servo2', { defaultValue: 'サーボ 2 ピン' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.servo2}
                        onChange={(e) => updatePinValue('servo2', parseInt(e.target.value) || 0)}
                        disabled={isViewMode}
                      />
                    </div>
                  </div>

                  {/* サーボパルス幅設定 */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-medium mb-3 text-sm">{t('pinPreset.sections.servoPulse', { defaultValue: 'サーボパルス幅設定' })}</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      {t('pinPreset.sections.servoPulseDesc', { defaultValue: '使用するサーボモーターの種類を選択してください。パルス幅は自動で設定されますが、必要に応じて微調整も可能です。' })}
                    </p>

                    {/* サーボタイプ選択 */}
                    <div className="mb-4">
                      <Label className="text-sm">{t('pinPreset.sections.servoType', { defaultValue: 'サーボの種類' })}</Label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <button
                          type="button"
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            editingPreset.servoConfig.servoType === '180'
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : 'bg-white hover:bg-gray-500/10'
                          }`}
                          onClick={() => handleServoTypeChange('180')}
                          disabled={isViewMode}
                        >
                          <div className="font-medium">{t('pinPreset.sections.servo180', { defaultValue: '180度' })}</div>
                          <div className="text-xs text-gray-500">{t('pinPreset.sections.servo180Example', { defaultValue: 'SG90等' })}</div>
                        </button>
                        <button
                          type="button"
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            editingPreset.servoConfig.servoType === '270'
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : 'bg-white hover:bg-gray-500/10'
                          }`}
                          onClick={() => handleServoTypeChange('270')}
                          disabled={isViewMode}
                        >
                          <div className="font-medium">{t('pinPreset.sections.servo270', { defaultValue: '270度' })}</div>
                          <div className="text-xs text-gray-500">{t('pinPreset.sections.servo270Example', { defaultValue: 'ASMC-04B等' })}</div>
                        </button>
                        <button
                          type="button"
                          className={`p-3 rounded-lg border text-center transition-colors ${
                            editingPreset.servoConfig.servoType === '360'
                              ? 'bg-green-100 border-green-500 text-green-700'
                              : 'bg-white hover:bg-gray-500/10'
                          }`}
                          onClick={() => handleServoTypeChange('360')}
                          disabled={isViewMode}
                        >
                          <div className="font-medium">{t('pinPreset.sections.servo360', { defaultValue: '360度' })}</div>
                          <div className="text-xs text-gray-500">{t('pinPreset.sections.servo360Example', { defaultValue: 'SG90-HV等' })}</div>
                        </button>
                      </div>
                    </div>

                    {/* パルス幅微調整 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">{t('pinPreset.sections.minPulse', { defaultValue: '最小パルス (μs)' })}</Label>
                        <Input
                          type="number"
                          min={100}
                          max={3000}
                          step={10}
                          value={editingPreset.servoConfig.minPulse}
                          onChange={(e) => updateServoConfigValue('minPulse', parseInt(e.target.value) || 500)}
                          disabled={isViewMode}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">{t('pinPreset.sections.maxPulse', { defaultValue: '最大パルス (μs)' })}</Label>
                        <Input
                          type="number"
                          min={100}
                          max={3000}
                          step={10}
                          value={editingPreset.servoConfig.maxPulse}
                          onChange={(e) => updateServoConfigValue('maxPulse', parseInt(e.target.value) || 2400)}
                          disabled={isViewMode}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>

                  <h4 className="font-medium mb-2 mt-4">{t('pinPreset.sections.dcMotor', { defaultValue: 'DCモーター (L298N)' })}</h4>
                  <div className="space-y-2">
                    <Label>{t('pinPreset.sections.motorA', { defaultValue: 'モーター A' })}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">IN1</Label>
                        <Input
                          type="number"
                          min={0}
                          max={39}
                          value={editingPreset.pins.motorAIn1}
                          onChange={(e) => updatePinValue('motorAIn1', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">IN2</Label>
                        <Input
                          type="number"
                          min={0}
                          max={39}
                          value={editingPreset.pins.motorAIn2}
                          onChange={(e) => updatePinValue('motorAIn2', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">ENA</Label>
                        <Input
                          type="number"
                          min={0}
                          max={39}
                          value={editingPreset.pins.motorAEna}
                          onChange={(e) => updatePinValue('motorAEna', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('pinPreset.sections.motorB', { defaultValue: 'モーター B' })}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">IN1</Label>
                        <Input
                          type="number"
                          min={0}
                          max={39}
                          value={editingPreset.pins.motorBIn1}
                          onChange={(e) => updatePinValue('motorBIn1', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">IN2</Label>
                        <Input
                          type="number"
                          min={0}
                          max={39}
                          value={editingPreset.pins.motorBIn2}
                          onChange={(e) => updatePinValue('motorBIn2', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">ENB</Label>
                        <Input
                          type="number"
                          min={0}
                          max={39}
                          value={editingPreset.pins.motorBEnb}
                          onChange={(e) => updatePinValue('motorBEnb', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>

                  <h4 className="font-medium mb-2 mt-4">{t('pinPreset.sections.stepper', { defaultValue: 'ステッピングモーター (28BYJ-48)' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>IN1</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.stepperIn1}
                        onChange={(e) => updatePinValue('stepperIn1', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>IN2</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.stepperIn2}
                        onChange={(e) => updatePinValue('stepperIn2', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>IN3</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.stepperIn3}
                        onChange={(e) => updatePinValue('stepperIn3', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>IN4</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.stepperIn4}
                        onChange={(e) => updatePinValue('stepperIn4', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="display" className="space-y-4 pr-4">
                  <h4 className="font-medium mb-2">{t('pinPreset.sections.oled', { defaultValue: 'I2C OLED ディスプレイ' })}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('pinPreset.pins.sda', { defaultValue: 'SDA ピン' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.displaySda}
                        onChange={(e) => updatePinValue('displaySda', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>{t('pinPreset.pins.scl', { defaultValue: 'SCL ピン' })}</Label>
                      <Input
                        type="number"
                        min={0}
                        max={39}
                        value={editingPreset.pins.displayScl}
                        onChange={(e) => updatePinValue('displayScl', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleCancel}>
                {isViewMode
                  ? t('common.back', { defaultValue: '戻る' })
                  : t('common.cancel', { defaultValue: 'キャンセル' })}
              </Button>
              {!isViewMode && (
                <Button onClick={handleSave} disabled={!isPremiumEnabled}>
                  {!isPremiumEnabled && <span className="mr-2">🔒</span>}
                  {isCreating
                    ? t('pinPreset.create', { defaultValue: '作成' })
                    : t('common.save', { defaultValue: '保存' })
                  }{!isPremiumEnabled && t('pinPreset.premiumSuffix', { defaultValue: '（プレミアム）' })}
                </Button>
              )}
            </DialogFooter>
          </Tabs>
        )}

        {!editingPreset && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>{t('common.close', { defaultValue: '閉じる' })}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
