import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  FilePlus,
  FolderOpen,
  FileCode,
  Download,
  HelpCircle,
  Zap,
  Loader2,
  Terminal,
  LineChart,
  Bluetooth,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LocaleSelector } from '@/components/common/LocaleSelector';
import { RobotModeSelector } from '@/components/editor/RobotModeSelector';
import { BoardSelector } from '@/components/editor/BoardSelector';
import type { CompileServerMode } from '@/services/compileService';

interface LinearToolbarProps {
  projectTitle?: string;
  onProjectSelect: () => void;
  onNewProject: () => void;
  onSampleProject: () => void;
  onSaveProject: () => void;
  isSaving?: boolean;

  // コンパイル関連
  isCompiling: boolean;
  serverMode: CompileServerMode;
  compileUsage?: { count: number; limit: number; isOverLimit: boolean };
  onCompile: () => void;
  onServerModeChange: (mode: CompileServerMode) => void;

  // ロボットモード切り替え
  onRobotModeChange?: () => void;

  // シリアルモニタ / プロッター
  showSerialMonitor?: boolean;
  showSerialPlotter?: boolean;
  onToggleSerialMonitor?: () => void;
  onToggleSerialPlotter?: () => void;

  // BLE Controller (47.md commit #5)
  showBleController?: boolean;
  onToggleBleController?: () => void;
}

export function LinearToolbar({
  projectTitle,
  onProjectSelect,
  onNewProject,
  onSampleProject,
  onSaveProject,
  isSaving = false,
  isCompiling,
  serverMode,
  compileUsage,
  onCompile,
  onServerModeChange: _onServerModeChange,
  onRobotModeChange,
  showSerialMonitor = false,
  showSerialPlotter = false,
  onToggleSerialMonitor,
  onToggleSerialPlotter,
  showBleController = false,
  onToggleBleController,
}: LinearToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between h-12 px-4 bg-[#1C1F26] text-[#E6EDF3] border-b border-[#2E333D]">
      {/* 左側: ロゴ + プロジェクト選択 */}
      <div className="flex items-center gap-3">
        {/* FabLab West Harimaロゴ */}
        <div className="flex items-center gap-2">
          <img
            src="/fablab-logo.png"
            alt="FabLab West Harima"
            className="h-8 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        </div>

        {/* プロジェクト選択 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#E6EDF3] hover:bg-[#2E333D] border border-[#2E333D] px-3 max-w-[200px]"
            >
              <span className="truncate">{projectTitle || t('editor.untitledProject')}</span>
              <ChevronDown className="w-4 h-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={onNewProject}>
              <FilePlus className="w-4 h-4 mr-2" />
              {t('editor.menu.new')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onProjectSelect}>
              <FolderOpen className="w-4 h-4 mr-2" />
              {t('editor.menu.open')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSampleProject} className="text-purple-600">
              <FileCode className="w-4 h-4 mr-2" />
              {t('editor.sample')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSaveProject} disabled={isSaving}>
              <Download className="w-4 h-4 mr-2" />
              {isSaving ? t('project.saving') : t('editor.menu.save')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 中央: ロボットモードセレクタ + ボードセレクタ + コンパイルボタン */}
      <div className="flex items-center gap-2">
        {/* ロボットモードセレクタ */}
        <RobotModeSelector onModeChange={onRobotModeChange} />

        {/* ボードセレクタ */}
        <BoardSelector />

        {/* 書き込みボタン */}
        <Button
          size="sm"
          disabled={isCompiling}
          onClick={onCompile}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3"
        >
          {isCompiling ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {t('editor.compiling')}
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 mr-1" />
              {t('editor.flashButton')}
              {serverMode === 'cloud' && compileUsage && (
                <span className={`ml-1 text-xs ${compileUsage.isOverLimit ? 'text-red-200' : 'text-orange-200'}`}>
                  ({compileUsage.count}/{compileUsage.limit === -1 ? '∞' : compileUsage.limit})
                </span>
              )}
            </>
          )}
        </Button>
      </div>

      {/* 右側: 言語切替、設定、ヘルプ、ユーザーメニュー */}
      <div className="flex items-center gap-1">
        {/* シリアルモニタ */}
        {onToggleSerialMonitor && (
          <Button
            variant="ghost"
            size="sm"
            className={`px-2 ${showSerialMonitor ? 'text-green-400 bg-[#2E333D]' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D]'}`}
            onClick={onToggleSerialMonitor}
          >
            <Terminal className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">{t('editor.menu.serialMonitor', { defaultValue: 'シリアルモニター' })}</span>
          </Button>
        )}

        {/* シリアルプロッター */}
        {onToggleSerialPlotter && (
          <Button
            variant="ghost"
            size="sm"
            className={`px-2 ${showSerialPlotter ? 'text-green-400 bg-[#2E333D]' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D]'}`}
            onClick={onToggleSerialPlotter}
          >
            <LineChart className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">{t('editor.menu.plotter', { defaultValue: 'プロッター' })}</span>
          </Button>
        )}

        {/* BLE Controller (47.md commit #5) */}
        {onToggleBleController && (
          <Button
            variant="ghost"
            size="sm"
            className={`px-2 ${showBleController ? 'text-green-400 bg-[#2E333D]' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D]'}`}
            onClick={onToggleBleController}
          >
            <Bluetooth className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">{t('editor.menu.bleController', { defaultValue: 'BLE' })}</span>
            {/* "BLE" intentionally untranslated — universal abbreviation. */}
          </Button>
        )}

        {/* 言語切替 */}
        <LocaleSelector />

        {/* ヘルプ */}
        <Button
          variant="ghost"
          size="sm"
          className="text-[#E6EDF3] hover:bg-[#2E333D] px-2"
          onClick={() => window.open('/docs', '_blank')}
          title={t('editor.menu.help')}
        >
          <HelpCircle className="w-4 h-4" />
        </Button>

      </div>
    </div>
  );
}
