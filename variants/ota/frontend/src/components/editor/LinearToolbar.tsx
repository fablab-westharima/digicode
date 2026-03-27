import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  ChevronDown,
  FilePlus,
  FolderOpen,
  FileCode,
  Download,
  HelpCircle,
  LogOut,
  User,
  Zap,
  Loader2,
  Menu,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useBreakpoint } from '@/hooks/useMediaQuery';
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
  onServerModeChange,
  onRobotModeChange,
}: LinearToolbarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isMobile, isMobileOrTablet } = useBreakpoint();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  // モバイル用ツールバー
  if (isMobileOrTablet) {
    return (
      <div className="flex items-center justify-between h-12 px-2 bg-[#1C1F26] text-[#E6EDF3] border-b border-[#2E333D]">
        {/* 左側: ハンバーガーメニュー */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="text-[#E6EDF3] hover:bg-[#2E333D] px-2">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[#1C1F26] text-[#E6EDF3] border-[#2E333D]">
            <SheetHeader>
              <SheetTitle className="text-[#E6EDF3]">{t('editor.menu.settings')}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              {/* プロジェクト操作 */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 px-2">{t('editor.menu.file')}</div>
                <Button variant="ghost" className="w-full justify-start text-[#E6EDF3]" onClick={() => { onNewProject(); setMobileMenuOpen(false); }}>
                  <FilePlus className="w-4 h-4 mr-2" />
                  {t('editor.menu.new')}
                </Button>
                <Button variant="ghost" className="w-full justify-start text-[#E6EDF3]" onClick={() => { onProjectSelect(); setMobileMenuOpen(false); }}>
                  <FolderOpen className="w-4 h-4 mr-2" />
                  {t('editor.menu.open')}
                </Button>
                <Button variant="ghost" className="w-full justify-start text-purple-400" onClick={() => { onSampleProject(); setMobileMenuOpen(false); }}>
                  <FileCode className="w-4 h-4 mr-2" />
                  {t('editor.sample')}
                </Button>
                <Button variant="ghost" className="w-full justify-start text-[#E6EDF3]" onClick={() => { onSaveProject(); setMobileMenuOpen(false); }}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('editor.menu.save')}
                </Button>
              </div>

              {/* ロボットモード */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 px-2">{t('editor.menu.mode')}</div>
                <div className="px-2">
                  <RobotModeSelector onModeChange={onRobotModeChange} />
                </div>
              </div>

              {/* ボード選択 */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 px-2">{t('editor.menu.compileTargetBoard')}</div>
                <div className="px-2">
                  <BoardSelector />
                </div>
              </div>

              {/* 表示言語 */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 px-2">{t('editor.menu.displayLanguage')}</div>
                <div className="px-2">
                  <LocaleSelector />
                </div>
              </div>

              {/* ユーザー */}
              <div className="space-y-2 pt-4 border-t border-[#2E333D]">
                {isAuthenticated ? (
                  <>
                    <div className="text-xs text-gray-400 px-2">{user?.email || 'User'}</div>
                    <Button variant="ghost" className="w-full justify-start text-red-400" onClick={handleLogout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('auth.logout')}
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" className="w-full justify-start text-[#E6EDF3]" onClick={handleLogin}>
                    <User className="w-4 h-4 mr-2" />
                    {t('sidebar.login', { defaultValue: 'ログイン / 新規登録' })}
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* 中央: プロジェクト名 */}
        <span className="text-sm truncate max-w-[120px]">{projectTitle || t('editor.untitledProject')}</span>

        {/* 右側: 書き込みボタン */}
        <Button
          size="sm"
          disabled={isCompiling}
          onClick={onCompile}
          className="bg-orange-600 hover:bg-orange-700 text-white px-3"
        >
          {isCompiling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {!isMobile && <span className="ml-1">{t('editor.flashButton')}</span>}
            </>
          )}
        </Button>
      </div>
    );
  }

  // デスクトップ用ツールバー（既存のコード）
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
                  ({compileUsage.count}/{compileUsage.limit})
                </span>
              )}
            </>
          )}
        </Button>
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

        {/* ユーザーメニュー */}
        {isAuthenticated ? (
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
        ) : (
          <Button variant="ghost" size="sm" className="text-[#E6EDF3] hover:bg-[#2E333D] px-2" onClick={handleLogin}>
            <User className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
