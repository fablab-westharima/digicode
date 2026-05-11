import { useRobotModeStore, ROBOT_MODES, type RobotMode } from '@/stores/robotModeStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Mode ID to i18n key mapping (snake_case mode ID → camelCase i18n key)
const MODE_I18N_KEYS: Record<RobotMode, string> = {
  input: 'input',
  output: 'output',
  robotics: 'robotics',
  network: 'network',
  homeassistant: 'homeassistant',
  storage_time: 'storageTime',
  gpio_bus: 'gpioBus',
  programming: 'programming',
  all_blocks: 'allBlocks',
  custom: 'custom',
};

// 表示順 (D-9 flat、グループなし、機能カテゴリ → HA → ストレージ/GPIO → ロジック → View/Settings の流れ)
const MODE_ORDER: RobotMode[] = [
  'input',
  'output',
  'robotics',
  'network',
  'homeassistant',
  'storage_time',
  'gpio_bus',
  'programming',
  'all_blocks',
  'custom',
];

interface RobotModeSelectorProps {
  onModeChange?: (mode: RobotMode) => void;
}

export function RobotModeSelector({ onModeChange }: RobotModeSelectorProps) {
  const { mode, setMode } = useRobotModeStore();
  const { t } = useTranslation();

  const handleModeChange = (newMode: RobotMode) => {
    if (newMode !== mode) {
      setMode(newMode);
      onModeChange?.(newMode);
    }
  };

  const currentMode = ROBOT_MODES[mode];

  // Get translated name/description for a mode
  const getModeName = (modeId: RobotMode) => {
    const key = MODE_I18N_KEYS[modeId];
    return t(`modeSelector.modes.${key}.name`, { defaultValue: ROBOT_MODES[modeId].name });
  };

  const getModeDescription = (modeId: RobotMode) => {
    const key = MODE_I18N_KEYS[modeId];
    return t(`modeSelector.modes.${key}.description`, { defaultValue: ROBOT_MODES[modeId].description });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-44 justify-between bg-[#1C1F26] text-[#E6EDF3] border-[#2E333D] hover:bg-[#2E333D]">
          <span className="flex items-center gap-1.5 truncate">
            <span>{currentMode.icon}</span>
            <span className="text-xs truncate">{getModeName(mode)}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-[#1C1F26] text-[#E6EDF3] border-[#2E333D]">
        {MODE_ORDER.map((modeId) => {
          const modeInfo = ROBOT_MODES[modeId];
          return (
            <DropdownMenuItem
              key={modeInfo.id}
              onClick={() => handleModeChange(modeInfo.id)}
              className="flex items-center gap-2 hover:bg-[#2E333D] focus:bg-[#2E333D]"
            >
              <span>{modeInfo.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{getModeName(modeInfo.id)}</div>
                <div className="text-xs text-gray-400">
                  {getModeDescription(modeInfo.id)}
                </div>
              </div>
              {mode === modeInfo.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
