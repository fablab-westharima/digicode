/**
 * ピンアサイン設定ダイアログ
 * Arduino/MicroPython共通でピン番号をカスタマイズ
 * 複数プリセットの管理機能付き（テーブル形式）
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Cpu, Bot, Plus, Trash2, Copy, FolderOpen } from 'lucide-react';
import { usePinPresetStore } from '@/stores/pinPresetStore';
import { useAuthStore } from '@/stores/authStore';
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useRobotModeStore, ROBOT_MODES, type RobotMode } from '@/stores/robotModeStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ピン設定の定義（カテゴリ・ブロック・ピンの関係）
interface PinDefinition {
  key: string;
  blockName: string;
  pinLabel: string;
  description: string;
}

interface PinCategory {
  id: string;
  icon: string;
  pins: PinDefinition[];
}

const PIN_CATEGORIES: PinCategory[] = [
  {
    id: 'humanoid',
    icon: '🤖',
    pins: [
      { key: 'humanoidLeftLeg', blockName: 'Humanoid Init', pinLabel: 'Left Leg (LL)', description: 'Connector #8' },
      { key: 'humanoidRightLeg', blockName: 'Humanoid Init', pinLabel: 'Right Leg (RL)', description: 'Connector #9' },
      { key: 'humanoidLeftFoot', blockName: 'Humanoid Init', pinLabel: 'Left Foot (LF)', description: 'Connector #10' },
      { key: 'humanoidRightFoot', blockName: 'Humanoid Init', pinLabel: 'Right Foot (RF)', description: 'Connector #11' },
    ],
  },
  {
    id: 'wheel',
    icon: '🛞',
    pins: [
      { key: 'wheelLeft', blockName: 'Wheel Init', pinLabel: 'Left Wheel', description: 'Connector #10' },
      { key: 'wheelRight', blockName: 'Wheel Init', pinLabel: 'Right Wheel', description: 'Connector #11' },
    ],
  },
  {
    id: 'transform',
    icon: '🥷',
    pins: [
      { key: 'transformLeftLeg', blockName: 'Transform Init', pinLabel: 'Left Leg (LL)', description: 'Connector #8' },
      { key: 'transformRightLeg', blockName: 'Transform Init', pinLabel: 'Right Leg (RL)', description: 'Connector #9' },
      { key: 'transformLeftFoot', blockName: 'Transform Init', pinLabel: 'Left Foot (LF)', description: 'Connector #10' },
      { key: 'transformRightFoot', blockName: 'Transform Init', pinLabel: 'Right Foot (RF)', description: 'Connector #11' },
    ],
  },
  {
    id: 'sensors',
    icon: '📡',
    pins: [
      { key: 'ultrasonicTrig', blockName: 'HC-SR04', pinLabel: 'Trig', description: 'Ultrasonic Trigger' },
      { key: 'ultrasonicEcho', blockName: 'HC-SR04', pinLabel: 'Echo', description: 'Echo Receive' },
      { key: 'ultrasonicRgb', blockName: 'RUS-04', pinLabel: 'RGB', description: 'NeoPixel Control' },
      { key: 'ultrasonicIo', blockName: 'RUS-04', pinLabel: 'I/O', description: 'Trigger/Echo Shared' },
      { key: 'dht', blockName: 'DHT11/22', pinLabel: 'Data', description: 'Temp/Humidity Sensor' },
      { key: 'touch', blockName: 'Touch Sensor', pinLabel: 'Touch', description: 'ESP32 T0-T9' },
      { key: 'sound', blockName: 'Sound Sensor', pinLabel: 'ADC', description: 'Analog Input (GPIO32-39)' },
      { key: 'light', blockName: 'Light Sensor', pinLabel: 'ADC', description: 'Analog Input (GPIO32-39)' },
    ],
  },
  {
    id: 'actuators',
    icon: '⚙️',
    pins: [
      { key: 'servo1', blockName: 'Generic Servo', pinLabel: 'Servo1', description: 'Any Servo Motor' },
      { key: 'servo2', blockName: 'Generic Servo', pinLabel: 'Servo2', description: 'Any Servo Motor' },
      { key: 'buzzer', blockName: 'Buzzer', pinLabel: 'Buzzer', description: 'PWM Output' },
      { key: 'neopixelRing', blockName: 'NeoPixel', pinLabel: 'Data', description: 'WS2812B, etc.' },
    ],
  },
  {
    id: 'motors',
    icon: '🔌',
    pins: [
      { key: 'motorAIn1', blockName: 'Motor A', pinLabel: 'IN1', description: 'Direction 1' },
      { key: 'motorAIn2', blockName: 'Motor A', pinLabel: 'IN2', description: 'Direction 2' },
      { key: 'motorAEna', blockName: 'Motor A', pinLabel: 'ENA', description: 'PWM Speed' },
      { key: 'motorBIn1', blockName: 'Motor B', pinLabel: 'IN1', description: 'Direction 1' },
      { key: 'motorBIn2', blockName: 'Motor B', pinLabel: 'IN2', description: 'Direction 2' },
      { key: 'motorBEnb', blockName: 'Motor B', pinLabel: 'ENB', description: 'PWM Speed' },
    ],
  },
  {
    id: 'stepper',
    icon: '🎯',
    pins: [
      { key: 'stepperIn1', blockName: 'Stepper', pinLabel: 'IN1', description: 'Coil Control' },
      { key: 'stepperIn2', blockName: 'Stepper', pinLabel: 'IN2', description: 'Coil Control' },
      { key: 'stepperIn3', blockName: 'Stepper', pinLabel: 'IN3', description: 'Coil Control' },
      { key: 'stepperIn4', blockName: 'Stepper', pinLabel: 'IN4', description: 'Coil Control' },
    ],
  },
  {
    id: 'display',
    icon: '🖥️',
    pins: [
      { key: 'displaySda', blockName: 'OLED', pinLabel: 'SDA', description: 'I2C Data' },
      { key: 'displayScl', blockName: 'OLED', pinLabel: 'SCL', description: 'I2C Clock' },
    ],
  },
  {
    id: 'sensor_digital',
    icon: '👆',
    pins: [
      { key: 'buttonSensor', blockName: 'Button Sensor', pinLabel: 'Button', description: 'Push Button / Switch' },
      { key: 'pirSensor', blockName: 'PIR Sensor', pinLabel: 'PIR', description: 'Motion Detection' },
      { key: 'tiltSensor', blockName: 'Tilt Sensor', pinLabel: 'Tilt', description: 'Tilt Switch' },
      { key: 'vibrationSensor', blockName: 'Vibration Sensor', pinLabel: 'Vibration', description: 'Vibration Detection' },
      { key: 'hallSensor', blockName: 'Hall Sensor', pinLabel: 'Hall', description: 'Magnetic Sensor' },
      { key: 'photoInterrupter', blockName: 'Photo Interrupter', pinLabel: 'Photo', description: 'Optical Sensor' },
      { key: 'irObstacleSensor', blockName: 'IR Obstacle Sensor', pinLabel: 'IR Obstacle', description: 'Infrared Obstacle' },
      { key: 'flameSensorDigital', blockName: 'Flame Sensor(D)', pinLabel: 'Flame(D)', description: 'Digital Flame Detection' },
      { key: 'gasSensorDigital', blockName: 'Gas Sensor(D)', pinLabel: 'Gas(D)', description: 'Digital Gas Detection' },
      { key: 'limitSwitch', blockName: 'Limit Switch', pinLabel: 'Limit SW', description: 'Mechanical Switch' },
    ],
  },
  {
    id: 'sensor_analog',
    icon: '📊',
    pins: [
      { key: 'potentiometer', blockName: 'Potentiometer', pinLabel: 'POT', description: 'Variable Resistor' },
      { key: 'ldrSensor', blockName: 'LDR Sensor', pinLabel: 'LDR', description: 'Photoresistor / CdS' },
      { key: 'thermistorSensor', blockName: 'Thermistor', pinLabel: 'Thermistor', description: 'NTC Temperature' },
      { key: 'lm35Sensor', blockName: 'LM35 Sensor', pinLabel: 'LM35', description: 'Temperature Sensor' },
      { key: 'gasSensorAnalog', blockName: 'Gas Sensor(A)', pinLabel: 'Gas(A)', description: 'MQ-2/MQ-7/etc.' },
      { key: 'soilMoistureSensor', blockName: 'Soil Moisture', pinLabel: 'Soil', description: 'Moisture Sensor' },
      { key: 'waterLevelSensor', blockName: 'Water Level', pinLabel: 'Water', description: 'Water Level Sensor' },
      { key: 'flameSensorAnalog', blockName: 'Flame Sensor(A)', pinLabel: 'Flame(A)', description: 'Analog Flame Detection' },
      { key: 'irReflectiveSensor', blockName: 'IR Reflective', pinLabel: 'IR Reflect', description: 'IR Distance Sensor' },
      { key: 'joystickX', blockName: 'Joystick', pinLabel: 'X-Axis', description: 'Joystick X' },
      { key: 'joystickY', blockName: 'Joystick', pinLabel: 'Y-Axis', description: 'Joystick Y' },
    ],
  },
];

interface PinSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Map store mode IDs to i18n keys (Session 104 で 10 entry に再構成、snake_case → camelCase)
const MODE_ID_TO_I18N_KEY: Record<string, string> = {
  'input': 'input',
  'output': 'output',
  'robotics': 'robotics',
  'network': 'network',
  'homeassistant': 'homeassistant',
  'storage_time': 'storageTime',
  'gpio_bus': 'gpioBus',
  'programming': 'programming',
  'all_blocks': 'allBlocks',
  'custom': 'custom',
};

export function PinSettingsDialog({ open, onOpenChange }: PinSettingsDialogProps) {
  const { t } = useTranslation();
  const {
    getCurrentPreset,
    updatePreset,
    currentPresetId,
    presets,
    setCurrentPreset,
    addCustomPreset,
    deletePreset,
  } = usePinPresetStore();
  const userFromAuth = useAuthStore((s) => s.user);
  const { canUsePinAssign, fetchFlags } = useFeatureFlagStore();
  const isPremiumEnabled = canUsePinAssign(userFromAuth?.plan);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);
  const { mode: robotMode, setMode: setRobotMode } = useRobotModeStore();

  const currentPreset = getCurrentPreset();
  const [editedPins, setEditedPins] = useState(currentPreset.pins);
  const [hasChanges, setHasChanges] = useState(false);
  // 第107回 Task 1: サーボパルス設定 (servoType/minPulse/maxPulse/perPinConfigs) は
  // ServoPulseDialog に独立。本 Dialog は GPIO ピン設定のみ編集する。

  // 新規プリセット作成ダイアログ
  const [newPresetDialogOpen, setNewPresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // 展開中のカテゴリ
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['humanoid', 'sensors', 'actuators']));

  // プリセット切り替え時に状態を更新
  useEffect(() => {
    // Props→State sync: currentPresetId 変化時にローカル編集 state を最新 preset で初期化（意図的）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditedPins(currentPreset.pins);
    setHasChanges(false);
  }, [currentPresetId, currentPreset]);

  const handlePinChange = (key: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 39) {
      setEditedPins(prev => ({ ...prev, [key]: numValue }));
      setHasChanges(true);
    }
  };

  const handleSave = () => {
    updatePreset(currentPresetId, {
      pins: editedPins,
      // servoConfig は ServoPulseDialog で別途編集 (第107回 Task 1)、ここでは触らない
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditedPins(currentPreset.pins);
    setHasChanges(false);
  };

  const handleCreateNewPreset = () => {
    if (!newPresetName.trim()) return;

    // 新規プリセット作成時、servoConfig は currentPreset から継承
    // (第107回 Task 1、ServoPulseDialog で別途編集可能)
    addCustomPreset({
      name: newPresetName.trim(),
      isPremium: true,
      servoConfig: { ...currentPreset.servoConfig },
      pins: { ...editedPins },
    });

    setNewPresetName('');
    setNewPresetDialogOpen(false);
  };

  const handleDeletePreset = (presetId: string) => {
    if (presetId === 'default') return;
    if (confirm(t('pinSettings.deleteConfirm'))) {
      deletePreset(presetId);
    }
  };

  const handleDuplicatePreset = () => {
    const baseName = currentPreset.id === 'default'
      ? t('pinPreset.defaultName', { defaultValue: 'デフォルト' })
      : currentPreset.name;
    setNewPresetName(`${baseName}${t('pinSettings.copyOf')}`);
    setNewPresetDialogOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#161B22] border-[#2E333D]">
        <DialogHeader>
          <DialogTitle className="text-[#E6EDF3]">{t('home.pinSettings')}</DialogTitle>
          <DialogDescription className="text-[#8B949E]">
            {t('pinSettings.subtitle', { defaultValue: 'ピンアサインメント設定を管理します' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* プリセット選択 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <FolderOpen className="w-5 h-5" />
                {t('pinSettings.presetManagement')}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('pinSettings.presetManagementDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* プリセット一覧 */}
                <div className="grid gap-2">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        currentPresetId === preset.id
                          ? 'bg-green-600/20 border-green-500'
                          : 'bg-[#0D1117] border-[#2E333D] hover:bg-[#21262D]'
                      }`}
                      onClick={() => setCurrentPreset(preset.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#E6EDF3]">{preset.id === 'default' ? t('pinPreset.defaultName', { defaultValue: 'デフォルト' }) : preset.name}</span>
                        {preset.isCustom && (
                          <Badge variant="secondary" className="text-xs bg-[#2E333D] text-[#E6EDF3]">{t('pinSettings.custom')}</Badge>
                        )}
                        {currentPresetId === preset.id && (
                          <Badge variant="default" className="text-xs bg-green-600">{t('pinSettings.inUse')}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {preset.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePreset(preset.id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 新規作成・複製ボタン */}
                <div className="flex gap-2 pt-2 border-t border-[#2E333D]">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewPresetName(t('pinSettings.newPreset'));
                      setNewPresetDialogOpen(true);
                    }}
                    disabled={!isPremiumEnabled}
                    className="flex-1 border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('pinSettings.newPreset')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDuplicatePreset}
                    disabled={!isPremiumEnabled}
                    className="flex-1 border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t('pinSettings.duplicate')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* モード選択 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <Bot className="w-5 h-5" />
                {t('pinSettings.mode')}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('pinSettings.modeDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.values(ROBOT_MODES).map((modeInfo) => {
                  const i18nKey = MODE_ID_TO_I18N_KEY[modeInfo.id] || modeInfo.id;
                  return (
                    <Button
                      key={modeInfo.id}
                      variant={robotMode === modeInfo.id ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col items-center gap-1 border-[#2E333D]"
                      onClick={() => setRobotMode(modeInfo.id as RobotMode)}
                    >
                      <span className="text-2xl">{modeInfo.icon}</span>
                      <span className="text-sm font-medium">{t(`modeSelector.modes.${i18nKey}.name`)}</span>
                      <span className="text-xs text-muted-foreground">{t(`modeSelector.modes.${i18nKey}.description`)}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* サーボパルス調整は ServoPulseDialog (Sidebar の「調整」セクション) に独立。
              第107回 Task 1、本 Dialog は GPIO ピン設定のみ。 */}

          {/* ピン設定（カテゴリ別テーブル） */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <Cpu className="w-5 h-5" />
                {t('pinSettings.gpioPinSettings')}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('pinSettings.gpioPinDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PIN_CATEGORIES.map((category) => (
                <div key={category.id} className="border border-[#2E333D] rounded-lg overflow-hidden">
                  {/* カテゴリヘッダー */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between p-3 bg-[#0D1117] hover:bg-[#21262D] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{category.icon}</span>
                      <div>
                        <span className="font-medium text-[#E6EDF3]">{t(`pinSettings.categories.${category.id}.name`)}</span>
                        <p className="text-xs text-[#8B949E]">{t(`pinSettings.categories.${category.id}.description`)}</p>
                      </div>
                    </div>
                    <span className="text-[#8B949E]">
                      {expandedCategories.has(category.id) ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* ピン設定テーブル */}
                  {expandedCategories.has(category.id) && (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#0D1117]/50 border-[#2E333D]">
                          <TableHead className="w-[140px] text-[#8B949E]">{t('pinSettings.block')}</TableHead>
                          <TableHead className="w-[120px] text-[#8B949E]">{t('pinSettings.pinName')}</TableHead>
                          <TableHead className="w-[100px] text-[#8B949E]">{t('pinSettings.gpio')}</TableHead>
                          <TableHead className="text-[#8B949E]">{t('pinSettings.description')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.pins.map((pin) => (
                          <TableRow key={pin.key} className="border-[#2E333D]">
                            <TableCell className="font-medium text-sm text-[#E6EDF3]">{pin.blockName}</TableCell>
                            <TableCell className="text-sm text-[#E6EDF3]">{pin.pinLabel}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={39}
                                value={editedPins[pin.key as keyof typeof editedPins]}
                                onChange={(e) => handlePinChange(pin.key, e.target.value)}
                                className="w-20 h-8 text-center bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                              />
                            </TableCell>
                            <TableCell className="text-xs text-[#8B949E]">
                              {t(`pinSettings.categories.${category.id}.name`)} - {pin.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 新規プリセット作成ダイアログ */}
          <Dialog open={newPresetDialogOpen} onOpenChange={setNewPresetDialogOpen}>
            <DialogContent className="bg-[#161B22] border-[#2E333D]">
              <DialogHeader>
                <DialogTitle className="text-[#E6EDF3]">{t('pinSettings.createNewPreset')}</DialogTitle>
                <DialogDescription className="text-[#8B949E]">
                  {t('pinSettings.createNewPresetDesc')}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="preset-name" className="text-[#E6EDF3]">{t('pinSettings.presetName')}</Label>
                <Input
                  id="preset-name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder={t('pinSettings.presetNamePlaceholder')}
                  className="mt-2 bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewPresetDialogOpen(false)} className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateNewPreset} disabled={!newPresetName.trim()}>
                  {t('pinSettings.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ダイアログフッター */}
        <DialogFooter className="border-t border-[#2E333D] pt-4">
          <Button variant="outline" onClick={() => {
            handleReset();
            onOpenChange(false);
          }} disabled={!hasChanges} className="border-[#2E333D] text-[#E6EDF3] hover:bg-[#2E333D]">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
