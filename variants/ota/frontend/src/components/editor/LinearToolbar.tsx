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
  Zap,
  Loader2,
  Terminal,
  LineChart,
  Bluetooth,
  Wifi,
  MessageSquare,
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

  // シリアルモニタ / プロッター (第102回 C3: モニタ ▼ DropdownMenu に統合)
  showSerialMonitor?: boolean;
  showSerialPlotter?: boolean;
  onToggleSerialMonitor?: () => void;
  onToggleSerialPlotter?: () => void;

  // BLE / WiFi Controller (第102回 C3: UI 生成 ▼ DropdownMenu に統合)
  showBleController?: boolean;
  onToggleBleController?: () => void;
  showWifiController?: boolean;
  onToggleWifiController?: () => void;

  // 第102回 C3: ヘッダー Feedback button (D-4 案 a: canSubmitFeedback 厳守)
  showFeedbackButton?: boolean;
  onOpenFeedback?: () => void;
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
  showWifiController = false,
  onToggleWifiController,
  showFeedbackButton = false,
  onOpenFeedback,
}: LinearToolbarProps) {
  const { t } = useTranslation();

  const anyMonitorActive = showSerialMonitor || showSerialPlotter;
  const anyControllerActive = showBleController || showWifiController;
  const hasMonitorMenu = !!(onToggleSerialMonitor || onToggleSerialPlotter);
  const hasControllerMenu = !!(onToggleBleController || onToggleWifiController);

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

      {/* 右側: モニタ / UI 生成 / フィードバック / 言語切替 */}
      <div className="flex items-center gap-1">
        {/* モニタ ▼ (シリアルモニター + プロッター) */}
        {hasMonitorMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`px-2 ${anyMonitorActive ? 'text-green-400 bg-[#2E333D]' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D]'}`}
              >
                <Terminal className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">{t('editor.menu.monitorDropdown')}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onToggleSerialMonitor && (
                <DropdownMenuItem onClick={onToggleSerialMonitor}>
                  <Terminal className={`w-4 h-4 mr-2 ${showSerialMonitor ? 'text-green-500' : ''}`} />
                  {t('editor.menu.serialMonitor')}
                </DropdownMenuItem>
              )}
              {onToggleSerialPlotter && (
                <DropdownMenuItem onClick={onToggleSerialPlotter}>
                  <LineChart className={`w-4 h-4 mr-2 ${showSerialPlotter ? 'text-green-500' : ''}`} />
                  {t('editor.menu.plotter')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* UI 生成 ▼ (BLE Controller + WiFi Controller) */}
        {hasControllerMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`px-2 ${anyControllerActive ? 'text-green-400 bg-[#2E333D]' : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-[#2E333D]'}`}
              >
                <Bluetooth className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">{t('editor.menu.uiGeneratorDropdown')}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onToggleBleController && (
                <DropdownMenuItem onClick={onToggleBleController}>
                  <Bluetooth className={`w-4 h-4 mr-2 ${showBleController ? 'text-green-500' : ''}`} />
                  {t('editor.menu.bleController')}
                  {/* "BLE" intentionally untranslated — universal abbreviation. */}
                </DropdownMenuItem>
              )}
              {onToggleWifiController && (
                <DropdownMenuItem onClick={onToggleWifiController}>
                  <Wifi className={`w-4 h-4 mr-2 ${showWifiController ? 'text-green-500' : ''}`} />
                  {t('editor.menu.wifiController')}
                  {/* "WiFi" intentionally untranslated — universal abbreviation. */}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* フィードバック (D-7 案 a: violet-600 強調 / D-10 案 a: 既存 label + MessageSquare) */}
        {showFeedbackButton && onOpenFeedback && (
          <Button
            size="sm"
            onClick={onOpenFeedback}
            className="bg-violet-600 hover:bg-violet-700 text-white px-3 ml-1"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">{t('feedback.button.label')}</span>
          </Button>
        )}

        {/* 言語切替 */}
        <LocaleSelector />
      </div>
    </div>
  );
}
