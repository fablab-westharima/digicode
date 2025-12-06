import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  FilePlus,
  FolderOpen,
  FileCode,
  Download,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Zap,
  Cloud,
  Server,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';
import { LocaleSelector } from '@/components/common/LocaleSelector';
import { RobotModeSelector } from '@/components/editor/RobotModeSelector';
import { BoardSelector } from '@/components/editor/BoardSelector';
import { LanguageSelector } from '@/components/editor/LanguageSelector';
import type { CompileServerMode } from '@/services/compileService';

interface LinearToolbarProps {
  projectTitle?: string;
  onProjectSelect: () => void;
  onNewProject: () => void;
  onSampleProject: () => void;
  onSaveProject: () => void;
  isSaving?: boolean;

  // コンパイル関連
  language: 'arduino' | 'micropython';
  isCompiling: boolean;
  serverMode: CompileServerMode;
  compileUsage?: { count: number; limit: number; isOverLimit: boolean };
  onCompile: () => void;
  onServerModeChange: (mode: CompileServerMode) => void;

  // デバイスセレクタ
  deviceSelector?: React.ReactNode;

  // ロボットモード切り替え
  onRobotModeChange?: () => void;
}

export function LinearToolbar({
  projectTitle,
  onProjectSelect,
  onNewProject,
  onSampleProject,
  onSaveProject,
  isSaving = false,
  language,
  isCompiling,
  serverMode,
  compileUsage,
  onCompile,
  onServerModeChange,
  deviceSelector,
  onRobotModeChange,
}: LinearToolbarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { language: blocklyLang } = useLanguageStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

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

      {/* 中央: 言語セレクタ + ロボットモードセレクタ + ボードセレクタ + デバイスセレクタ + コンパイルボタン */}
      <div className="flex items-center gap-2">
        {/* 言語セレクタ（Arduino C++ / MicroPython） */}
        <LanguageSelector />

        {/* ロボットモードセレクタ */}
        <RobotModeSelector onModeChange={onRobotModeChange} />

        {/* ボードセレクタ */}
        <BoardSelector />

        {/* デバイスセレクタ（親から渡される） */}
        {deviceSelector}

        {/* コンパイルボタン（Arduino C++のみ） */}
        {language === 'arduino' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={isCompiling}
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
                    {t('editor.compile')}
                    {serverMode === 'cloud' && compileUsage && (
                      <span className={`ml-1 text-xs ${compileUsage.isOverLimit ? 'text-red-200' : 'text-orange-200'}`}>
                        ({compileUsage.count}/{compileUsage.limit})
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={onCompile} disabled={isCompiling} className="font-medium">
                <Zap className="w-4 h-4 mr-2 text-orange-500" />
                {t('editor.compileAndFlash')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-gray-500">{t('editor.menu.compileServer')}</div>
              <DropdownMenuCheckboxItem
                checked={serverMode === 'cloud'}
                onCheckedChange={() => onServerModeChange('cloud')}
              >
                <Cloud className="w-4 h-4 mr-2" />
                {t('editor.menu.cloudServer')}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={serverMode === 'local'}
                onCheckedChange={() => onServerModeChange('local')}
              >
                <Server className="w-4 h-4 mr-2" />
                {t('editor.menu.localServer')}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 右側: 言語切替、設定、ヘルプ、ユーザーメニュー */}
      <div className="flex items-center gap-1">
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

        {/* 設定 */}
        <Button
          variant="ghost"
          size="sm"
          className="text-[#E6EDF3] hover:bg-[#2E333D] px-2"
          onClick={() => window.open('/pin-settings', '_blank')}
          title={t('editor.menu.settings')}
        >
          <Settings className="w-4 h-4" />
        </Button>

        {/* ユーザーメニュー */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-[#E6EDF3] hover:bg-[#2E333D] px-2">
              <User className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-xs text-gray-500">
              {user?.email || 'User'}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
