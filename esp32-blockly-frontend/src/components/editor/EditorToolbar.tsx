import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, FolderOpen, FilePlus, Home, BookOpen, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface EditorToolbarProps {
  projectTitle?: string;
  onSave: () => void;
  onOpen: () => void;
  onNew: () => void;
  onSample?: () => void;
  isSaving?: boolean;
  children?: React.ReactNode;
}

export function EditorToolbar({
  projectTitle,
  onSave,
  onOpen,
  onNew,
  onSample,
  isSaving = false,
  children,
}: EditorToolbarProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isMobile, isTablet } = useBreakpoint();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // モバイル用メニュー
  const MobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>{t('editor.menu.file')}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
          >
            <Home className="w-4 h-4 mr-2" />
            {t('nav.home')}
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => {
              onNew();
              setMobileMenuOpen(false);
            }}
          >
            <FilePlus className="w-4 h-4 mr-2" />
            {t('editor.menu.new')}
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() => {
              onOpen();
              setMobileMenuOpen(false);
            }}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {t('editor.menu.open')}
          </Button>
          {onSample && (
            <Button
              variant="ghost"
              className="justify-start text-purple-600"
              onClick={() => {
                onSample();
                setMobileMenuOpen(false);
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {t('editor.sample')}
            </Button>
          )}
          <Button
            variant="default"
            className="justify-start"
            onClick={() => {
              onSave();
              setMobileMenuOpen(false);
            }}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? t('project.saving') : t('editor.menu.save')}
          </Button>
          <hr className="my-2" />
          {/* 追加コントロール（children）をモバイルメニュー内に表示 */}
          <div className="flex flex-col gap-2">
            {children}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // モバイル表示
  if (isMobile) {
    return (
      <div className="flex items-center justify-between px-2 py-2 bg-white border-b">
        <MobileMenu />
        <span className="text-sm font-semibold truncate max-w-[200px]">
          {projectTitle || t('editor.untitled')}
        </span>
        <Button
          variant="default"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="px-2"
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // タブレット表示
  if (isTablet) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b">
        {/* 左側: ナビゲーション */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            title={t('editor.goHome')}
          >
            <Home className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold truncate max-w-[150px]">
            {projectTitle || t('editor.untitled')}
          </span>
        </div>

        {/* 中央: ファイル操作（アイコンのみ） */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onNew}
            title={t('editor.menu.new')}
          >
            <FilePlus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpen}
            title={t('editor.menu.open')}
          >
            <FolderOpen className="w-4 h-4" />
          </Button>
          {onSample && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSample}
              title={t('editor.sample')}
              className="text-purple-600 border-purple-300"
            >
              <BookOpen className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            title={t('editor.menu.save')}
          >
            <Save className="w-4 h-4" />
          </Button>
        </div>

        {/* 右側: ESP32接続など（childrenで渡す） */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {children}
        </div>
      </div>
    );
  }

  // デスクトップ表示（メニューバー形式）
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white border-b relative z-50">
      {/* ホームボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/')}
        title={t('editor.goHome')}
        aria-label={t('editor.goHome')}
      >
        <Home className="w-4 h-4" />
      </Button>

      {/* プロジェクト名 */}
      <span className="text-sm font-semibold truncate max-w-xs">
        {projectTitle || t('editor.untitledProject')}
      </span>

      {/* メニューバー */}
      <div className="flex items-center gap-1 ml-4">
        {/* その他のメニュー（childrenで渡される - 書き込みボタン、ファイル、表示、設定、ヘルプなど） */}
        {children}
      </div>
    </div>
  );
}
