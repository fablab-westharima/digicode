import { useRobotModeStore, ROBOT_MODES, MODE_GROUPS, type RobotMode, type ModeGroup } from '@/stores/robotModeStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Mode ID to i18n key mapping
const MODE_I18N_KEYS: Record<RobotMode, string> = {
  otto_bipedal: 'ottoBipedal',
  otto_wheel: 'ottoWheel',
  otto_ninja: 'ottoNinja',
  micromouse: 'micromouse',
  line_trace: 'lineTrace',
  homeassistant: 'homeassistant',
  generic: 'generic',
  all_blocks: 'allBlocks',
  custom: 'custom',
};

interface RobotModeSelectorProps {
  onModeChange?: (mode: RobotMode) => void;
}

// グループの表示順序
const GROUP_ORDER: ModeGroup[] = ['otto', 'competition', 'iot', 'other'];

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

  // Get translated group name
  const getGroupName = (groupId: ModeGroup) => {
    return t(`modeSelector.groups.${groupId}`, { defaultValue: MODE_GROUPS[groupId].name });
  };

  // モードをグループごとに分類
  const modesByGroup = Object.values(ROBOT_MODES).reduce((acc, modeInfo) => {
    const group = modeInfo.group;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(modeInfo);
    return acc;
  }, {} as Record<ModeGroup, typeof ROBOT_MODES[RobotMode][]>);

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
        {GROUP_ORDER.map((groupId) => {
          const groupInfo = MODE_GROUPS[groupId];
          const modesInGroup = modesByGroup[groupId];

          if (!modesInGroup || modesInGroup.length === 0) return null;

          // グループ内に1つしかない場合はサブメニューにしない
          if (modesInGroup.length === 1) {
            const modeInfo = modesInGroup[0];
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
          }

          return (
            <DropdownMenuSub key={groupId}>
              <DropdownMenuSubTrigger className="flex items-center gap-1.5 hover:bg-[#2E333D] focus:bg-[#2E333D]">
                <span>{groupInfo.icon}</span>
                <span>{getGroupName(groupId)}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56 bg-[#1C1F26] text-[#E6EDF3] border-[#2E333D]">
                {modesInGroup.map((modeInfo) => (
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
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
