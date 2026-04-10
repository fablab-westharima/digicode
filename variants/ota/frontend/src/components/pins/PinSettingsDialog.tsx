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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Cpu, Bot, Gauge, Plus, Trash2, Copy, FolderOpen } from 'lucide-react';
import { usePinPresetStore, SERVO_TYPE_DEFAULTS, type ServoType, type PinServoConfig } from '@/stores/pinPresetStore';
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
    id: 'otto_bipedal',
    icon: '🤖',
    pins: [
      { key: 'ottoLeftLeg', blockName: 'Otto Init', pinLabel: 'Left Leg (LL)', description: 'Connector #8' },
      { key: 'ottoRightLeg', blockName: 'Otto Init', pinLabel: 'Right Leg (RL)', description: 'Connector #9' },
      { key: 'ottoLeftFoot', blockName: 'Otto Init', pinLabel: 'Left Foot (LF)', description: 'Connector #10' },
      { key: 'ottoRightFoot', blockName: 'Otto Init', pinLabel: 'Right Foot (RF)', description: 'Connector #11' },
    ],
  },
  {
    id: 'otto_wheel',
    icon: '🛞',
    pins: [
      { key: 'ottoWheelLeft', blockName: 'Otto Wheel Init', pinLabel: 'Left Wheel', description: 'Connector #10' },
      { key: 'ottoWheelRight', blockName: 'Otto Wheel Init', pinLabel: 'Right Wheel', description: 'Connector #11' },
    ],
  },
  {
    id: 'otto_ninja',
    icon: '🥷',
    pins: [
      { key: 'ottoNinjaLeftLeg', blockName: 'Otto Ninja Init', pinLabel: 'Left Leg (LL)', description: 'Connector #8' },
      { key: 'ottoNinjaRightLeg', blockName: 'Otto Ninja Init', pinLabel: 'Right Leg (RL)', description: 'Connector #9' },
      { key: 'ottoNinjaLeftFoot', blockName: 'Otto Ninja Init', pinLabel: 'Left Foot (LF)', description: 'Connector #10' },
      { key: 'ottoNinjaRightFoot', blockName: 'Otto Ninja Init', pinLabel: 'Right Foot (RF)', description: 'Connector #11' },
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

// Map store mode IDs to i18n keys
const MODE_ID_TO_I18N_KEY: Record<string, string> = {
  'otto_bipedal': 'ottoBipedal',
  'otto_wheel': 'ottoWheel',
  'otto_ninja': 'ottoNinja',
  'micromouse': 'micromouse',
  'line_trace': 'lineTrace',
  'homeassistant': 'homeassistant',
  'generic': 'generic',
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
  const [servoType, setServoType] = useState<ServoType>(currentPreset.servoConfig.servoType);
  const [minPulse, setMinPulse] = useState(currentPreset.servoConfig.minPulse);
  const [maxPulse, setMaxPulse] = useState(currentPreset.servoConfig.maxPulse);
  const [perPinConfigs, setPerPinConfigs] = useState<PinServoConfig[]>(currentPreset.servoConfig.perPinConfigs || []);
  const [hasChanges, setHasChanges] = useState(false);

  // 新規プリセット作成ダイアログ
  const [newPresetDialogOpen, setNewPresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // 展開中のカテゴリ
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['otto_bipedal', 'sensors', 'actuators']));

  // プリセット切り替え時に状態を更新
  useEffect(() => {
    setEditedPins(currentPreset.pins);
    setServoType(currentPreset.servoConfig.servoType);
    setMinPulse(currentPreset.servoConfig.minPulse);
    setMaxPulse(currentPreset.servoConfig.maxPulse);
    setPerPinConfigs(currentPreset.servoConfig.perPinConfigs || []);
    setHasChanges(false);
  }, [currentPresetId, currentPreset]);

  const handlePinChange = (key: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 39) {
      setEditedPins(prev => ({ ...prev, [key]: numValue }));
      setHasChanges(true);
    }
  };

  const handleServoTypeChange = (type: ServoType) => {
    setServoType(type);
    const defaults = SERVO_TYPE_DEFAULTS[type];
    setMinPulse(defaults.min);
    setMaxPulse(defaults.max);
    setHasChanges(true);
  };

  const handleSave = () => {
    updatePreset(currentPresetId, {
      pins: editedPins,
      servoConfig: {
        servoType,
        minPulse,
        maxPulse,
        perPinConfigs,
      },
    });
    setHasChanges(false);
  };

  const handleReset = () => {
    setEditedPins(currentPreset.pins);
    setServoType(currentPreset.servoConfig.servoType);
    setMinPulse(currentPreset.servoConfig.minPulse);
    setMaxPulse(currentPreset.servoConfig.maxPulse);
    setPerPinConfigs(currentPreset.servoConfig.perPinConfigs || []);
    setHasChanges(false);
  };

  const handleCreateNewPreset = () => {
    if (!newPresetName.trim()) return;

    addCustomPreset({
      name: newPresetName.trim(),
      isPremium: true,
      servoConfig: {
        servoType,
        minPulse,
        maxPulse,
        perPinConfigs,
      },
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
    setNewPresetName(`${currentPreset.name}${t('pinSettings.copyOf')}`);
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
            {t('pinSettings.settingsDesc', 'ピンアサインメント設定を管理します')}
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
                        <span className="font-medium text-[#E6EDF3]">{preset.name}</span>
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

          {/* サーボ設定 */}
          <Card className="bg-[#0D1117] border-[#2E333D]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#E6EDF3]">
                <Gauge className="w-5 h-5" />
                {t('pinSettings.servoPulseSettings')}
              </CardTitle>
              <CardDescription className="text-[#8B949E]">
                {t('pinSettings.servoPulseDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#E6EDF3]">{t('pinSettings.servoType')}</Label>
                  <Select value={servoType} onValueChange={(v) => handleServoTypeChange(v as ServoType)}>
                    <SelectTrigger className="bg-[#0D1117] border-[#2E333D] text-[#E6EDF3]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="180">{t('pinSettings.servo180')}</SelectItem>
                      <SelectItem value="270">{t('pinSettings.servo270')}</SelectItem>
                      <SelectItem value="360">{t('pinSettings.servo360')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#E6EDF3]">{t('pinSettings.minPulse')}</Label>
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
                  <Label className="text-[#E6EDF3]">{t('pinSettings.maxPulse')}</Label>
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

              {/* 個別サーボパルス幅設定 */}
              <div className="mt-6 border-t border-[#2E333D] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-[#E6EDF3]">
                      {t('pinSettings.perPinServoSettings', { defaultValue: 'ピンごとの個別パルス幅設定' })}
                    </h4>
                    <p className="text-xs text-[#8B949E]">
                      {t('pinSettings.perPinServoDesc', { defaultValue: 'サーボの個体差に合わせて、ピンごとにパルス幅を上書きできます' })}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#2E333D] text-[#E6EDF3]"
                    onClick={() => {
                      setPerPinConfigs(prev => [...prev, { pin: 0, minPulse: minPulse, maxPulse: maxPulse }]);
                      setHasChanges(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t('common.add', { defaultValue: '追加' })}
                  </Button>
                </div>
                {perPinConfigs.length > 0 && (
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
                          <Label className="text-xs text-[#E6EDF3]">{t('pinSettings.minPulse')}</Label>
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
                          <Label className="text-xs text-[#E6EDF3]">{t('pinSettings.maxPulse')}</Label>
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
              </div>
            </CardContent>
          </Card>

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
