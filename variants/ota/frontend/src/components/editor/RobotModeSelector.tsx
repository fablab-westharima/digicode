import { useRobotModeStore, ROBOT_MODES, MODE_GROUPS, type RobotMode, type ModeGroup } from '@/stores/robotModeStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  robots_humanoid: 'humanoid',
  robots_wheel: 'wheel',
  robots_transform: 'transform',
  homeassistant: 'homeassistant',
  generic: 'generic',
  all_blocks: 'allBlocks',
  custom: 'custom',
};

interface RobotModeSelectorProps {
  onModeChange?: (mode: RobotMode) => void;
}

// グループの表示順序（メタモード → ドメインモードの順）
const GROUP_ORDER: ModeGroup[] = ['other', 'robots', 'iot'];

// 平坦化表示するグループ（サブメニューではなくトップレベルに個別表示）
const FLATTEN_GROUPS: Set<ModeGroup> = new Set(['other']);

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
        {GROUP_ORDER.map((groupId, idx) => {
          const groupInfo = MODE_GROUPS[groupId];
          const modesInGroup = modesByGroup[groupId];

          if (!modesInGroup || modesInGroup.length === 0) return null;

          // 平坦化グループ（その他）または 1 モードのみ のグループは、サブメニューにせず個別表示
          const shouldFlatten = FLATTEN_GROUPS.has(groupId) || modesInGroup.length === 1;

          // 前のグループとの境界にセパレータを入れる
          const separator = idx > 0 ? <DropdownMenuSeparator key={`sep-${groupId}`} className="bg-[#2E333D]" /> : null;

          if (shouldFlatten) {
            return (
              <div key={groupId}>
                {separator}
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
              </div>
            );
          }

          return (
            <div key={groupId}>
              {separator}
              <DropdownMenuSub>
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
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
