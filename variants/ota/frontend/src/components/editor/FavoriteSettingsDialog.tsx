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
const AVAILABLE_CATEGORIES = [
  // OTTO系ロボット
  { id: 'otto_bipedal', name: '🤖 二足歩行', group: 'OTTO ロボット' },
  { id: 'otto_wheel', name: '🛞 Wheel', group: 'OTTO ロボット' },
  { id: 'otto_ninja', name: '🦾 Ninja', group: 'OTTO ロボット' },

  // 競技ロボット
  { id: 'sensor_line', name: '📍 ラインセンサー', group: '競技ロボット' },
  { id: 'sensor_qtr', name: '🚀 QTRセンサー（高速）', group: '競技ロボット' },
  { id: 'sensor_wall', name: '🧱 壁センサー', group: '競技ロボット' },

  // Home Assistant
  { id: 'mqtt', name: '📡 MQTT/HA', group: 'Home Assistant' },
  { id: 'arduino_ha', name: '🏠 HA Auto Discovery', group: 'Home Assistant' },

  // モーター・駆動系
  { id: 'motor', name: '🚗 モーター', group: 'モーター・駆動系' },
  { id: 'diff_drive', name: '🔄 差動駆動', group: 'モーター・駆動系' },
  { id: 'encoder', name: '📏 エンコーダー', group: 'モーター・駆動系' },

  // センサー
  { id: 'sensor_ultrasonic', name: '📡 超音波センサー', group: 'センサー' },
  { id: 'sensor_dht', name: '🌡️ 温湿度', group: 'センサー' },
  { id: 'sensor_digital', name: '👆 デジタルセンサー', group: 'センサー' },
  { id: 'sensor_analog', name: '📊 アナログセンサー', group: 'センサー' },

  // アクチュエーター
  { id: 'servo', name: '🔧 サーボ', group: 'アクチュエーター' },
  { id: 'stepper', name: '🔩 ステッピング', group: 'アクチュエーター' },
  { id: 'buzzer', name: '🔊 ブザー', group: 'アクチュエーター' },
  { id: 'neopixel', name: '💡 NeoPixel', group: 'アクチュエーター' },
  { id: 'display', name: '📺 ディスプレイ', group: 'アクチュエーター' },

  // GPIO・通信
  { id: 'gpio', name: '⚡ GPIO', group: 'GPIO・通信' },
  { id: 'serial', name: '📟 シリアル', group: 'GPIO・通信' },

  // 通信・制御
  { id: 'http', name: '🌐 HTTP', group: '通信・制御' },
  { id: 'json', name: '📋 JSON', group: '通信・制御' },
  { id: 'ota', name: '📡 OTA/ESP', group: '通信・制御' },
  { id: 'pid', name: '🎛️ PID制御', group: '通信・制御' },
  { id: 'time', name: '⏱️ 時間', group: '通信・制御' },

  // ロジック・基本
  { id: 'logic', name: '🧠 ロジック', group: 'ロジック・基本' },
  { id: 'loops', name: '🔄 ループ', group: 'ロジック・基本' },
  { id: 'math', name: '🔢 数学', group: 'ロジック・基本' },
  { id: 'text', name: '📝 テキスト', group: 'ロジック・基本' },
  { id: 'lists', name: '📋 配列', group: 'ロジック・基本' },
  { id: 'variables', name: '📦 変数', group: 'ロジック・基本' },
  { id: 'functions', name: '⚙️ 関数', group: 'ロジック・基本' },
];

// グループごとにカテゴリを整理
const groupedCategories = AVAILABLE_CATEGORIES.reduce((acc, cat) => {
  if (!acc[cat.group]) {
    acc[cat.group] = [];
  }
  acc[cat.group].push(cat);
  return acc;
}, {} as Record<string, typeof AVAILABLE_CATEGORIES>);

export function FavoriteSettingsDialog({ open, onOpenChange }: FavoriteSettingsDialogProps) {
  const { favorites, toggleFavorite, isFavorite } = useFavoriteCategoriesStore();
  const { t } = useTranslation();

  const handleToggle = (categoryId: string) => {
    toggleFavorite(categoryId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">⭐ お気に入りブロック設定</DialogTitle>
          <DialogDescription>
            よく使うブロックカテゴリを選択してください。選択したカテゴリが「お気に入り」モードに表示されます。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedCategories).map(([groupName, categories]) => (
              <div key={groupName}>
                <h3 className="text-sm font-semibold text-[#E6EDF3] mb-3 pb-2 border-b border-[#2E333D]">
                  {groupName}
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
                        {category.name}
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
            選択中: {favorites.length} カテゴリ
          </div>
          <Button onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
