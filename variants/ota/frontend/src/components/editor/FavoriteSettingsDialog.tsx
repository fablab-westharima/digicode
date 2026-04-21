import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFavoriteCategoriesStore } from '@/stores/favoriteCategoriesStore';
import { useTranslation } from 'react-i18next';

interface FavoriteSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 利用可能な全カテゴリ（arduino_coreは除外）
// 多言語対応: 表示名は toolbox.categories.* の既存キーを流用、グループ名は favoriteSettings.groups.* を使用
type GroupKey =
  | 'robots'
  | 'competition'
  | 'homeAssistant'
  | 'motors'
  | 'sensors'
  | 'actuators'
  | 'gpioAndSerial'
  | 'communicationAndControl'
  | 'logicBasic';

interface CategoryEntry {
  id: string;
  i18nKey: string;
  groupKey: GroupKey;
}

const AVAILABLE_CATEGORIES: CategoryEntry[] = [
  // ロボット
  { id: 'robot_humanoid', i18nKey: 'toolbox.categories.humanoid', groupKey: 'robots' },
  { id: 'robot_wheel', i18nKey: 'toolbox.categories.wheelRobot', groupKey: 'robots' },
  { id: 'robot_transform', i18nKey: 'toolbox.categories.transform', groupKey: 'robots' },

  // 競技ロボット
  { id: 'sensor_line', i18nKey: 'toolbox.categories.lineSensor', groupKey: 'competition' },
  { id: 'sensor_qtr', i18nKey: 'toolbox.categories.qtrSensor', groupKey: 'competition' },
  { id: 'sensor_wall', i18nKey: 'toolbox.categories.wallSensor', groupKey: 'competition' },

  // Home Assistant
  { id: 'mqtt', i18nKey: 'toolbox.categories.mqttHa', groupKey: 'homeAssistant' },
  { id: 'arduino_ha', i18nKey: 'toolbox.categories.haAutoDiscovery', groupKey: 'homeAssistant' },

  // モーター・駆動系
  { id: 'motor', i18nKey: 'toolbox.categories.motor', groupKey: 'motors' },
  { id: 'diff_drive', i18nKey: 'toolbox.categories.diffDrive', groupKey: 'motors' },
  { id: 'encoder', i18nKey: 'toolbox.categories.encoder', groupKey: 'motors' },

  // センサー
  { id: 'sensor_ultrasonic', i18nKey: 'toolbox.categories.ultrasonicSensor', groupKey: 'sensors' },
  { id: 'sensor_dht', i18nKey: 'toolbox.categories.temperature', groupKey: 'sensors' },
  { id: 'sensor_digital', i18nKey: 'toolbox.categories.digitalSensor', groupKey: 'sensors' },
  { id: 'sensor_analog', i18nKey: 'toolbox.categories.analogSensor', groupKey: 'sensors' },

  // アクチュエーター
  { id: 'servo', i18nKey: 'toolbox.categories.servo', groupKey: 'actuators' },
  { id: 'stepper', i18nKey: 'toolbox.categories.stepper', groupKey: 'actuators' },
  { id: 'buzzer', i18nKey: 'toolbox.categories.buzzer', groupKey: 'actuators' },
  { id: 'neopixel', i18nKey: 'toolbox.categories.neopixel', groupKey: 'actuators' },
  { id: 'display', i18nKey: 'toolbox.categories.display', groupKey: 'actuators' },

  // GPIO・通信
  { id: 'gpio', i18nKey: 'toolbox.categories.gpio', groupKey: 'gpioAndSerial' },
  { id: 'serial', i18nKey: 'toolbox.categories.serial', groupKey: 'gpioAndSerial' },

  // 通信・制御
  { id: 'http', i18nKey: 'toolbox.categories.http', groupKey: 'communicationAndControl' },
  { id: 'json', i18nKey: 'toolbox.categories.json', groupKey: 'communicationAndControl' },
  { id: 'ota', i18nKey: 'toolbox.categories.otaEsp', groupKey: 'communicationAndControl' },
  { id: 'pid', i18nKey: 'toolbox.categories.pidControl', groupKey: 'communicationAndControl' },
  { id: 'time', i18nKey: 'toolbox.categories.time', groupKey: 'communicationAndControl' },

  // ロジック・基本
  { id: 'logic', i18nKey: 'toolbox.categories.logic', groupKey: 'logicBasic' },
  { id: 'loops', i18nKey: 'toolbox.categories.loops', groupKey: 'logicBasic' },
  { id: 'math', i18nKey: 'toolbox.categories.math', groupKey: 'logicBasic' },
  { id: 'text', i18nKey: 'toolbox.categories.text', groupKey: 'logicBasic' },
  { id: 'lists', i18nKey: 'toolbox.categories.lists', groupKey: 'logicBasic' },
  { id: 'variables', i18nKey: 'toolbox.categories.variables', groupKey: 'logicBasic' },
  { id: 'functions', i18nKey: 'toolbox.categories.functions', groupKey: 'logicBasic' },
];

// 表示順を固定するためのグループキーリスト
const GROUP_ORDER: GroupKey[] = [
  'robots',
  'competition',
  'homeAssistant',
  'motors',
  'sensors',
  'actuators',
  'gpioAndSerial',
  'communicationAndControl',
  'logicBasic',
];

export function FavoriteSettingsDialog({ open, onOpenChange }: FavoriteSettingsDialogProps) {
  const { favorites, toggleFavorite, isFavorite } = useFavoriteCategoriesStore();
  const { t } = useTranslation();

  const handleToggle = (categoryId: string) => {
    toggleFavorite(categoryId);
  };

  // グループごとにカテゴリを整理（GROUP_ORDER の順で表示）
  const groupedCategories = GROUP_ORDER.map((groupKey) => ({
    groupKey,
    categories: AVAILABLE_CATEGORIES.filter((c) => c.groupKey === groupKey),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{t('favoriteSettings.title', { defaultValue: '⭐ お気に入りブロック設定' })}</DialogTitle>
          <DialogDescription>
            {t('favoriteSettings.description', { defaultValue: 'よく使うブロックカテゴリを選択してください。選択したカテゴリが「お気に入り」モードに表示されます。' })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {groupedCategories.map(({ groupKey, categories }) => (
              <div key={groupKey}>
                <h3 className="text-sm font-semibold text-[#E6EDF3] mb-3 pb-2 border-b border-[#2E333D]">
                  {t(`favoriteSettings.groups.${groupKey}`)}
                </h3>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-[#2E333D] transition-colors"
                    >
                      <Checkbox
                        id={category.id}
                        checked={isFavorite(category.id)}
                        onCheckedChange={() => handleToggle(category.id)}
                      />
                      <label
                        htmlFor={category.id}
                        className="text-sm text-[#E6EDF3] cursor-pointer flex-1"
                      >
                        {t(category.i18nKey)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t border-[#2E333D]">
          <div className="text-sm text-[#8B949E]">
            {t('favoriteSettings.selectedCount', { count: favorites.length, defaultValue: '選択中: {{count}} カテゴリ' })}
          </div>
          <Button onClick={() => onOpenChange(false)}>
            {t('common.close', { defaultValue: '閉じる' })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
