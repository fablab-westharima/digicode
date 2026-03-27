import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/stores/projectStore';

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (project: Project) => void;
  isAuthenticated?: boolean;
}

export function ProjectListDialog({
  open,
  onOpenChange,
  onSelect,
  isAuthenticated = false,
}: ProjectListDialogProps) {
  const { t, i18n } = useTranslation();
  const { projects, loadProjects, loadProject, deleteProject, isLoading, error } = useProjectStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ダイアログが開いた時にプロジェクト一覧を取得（ログイン済みのみ）
  useEffect(() => {
    if (open && isAuthenticated) {
      loadProjects();
    }
  }, [open, isAuthenticated, loadProjects]);

  const handleSelect = async (projectId: number) => {
    const project = await loadProject(projectId);
    if (project) {
      onSelect(project);
      onOpenChange(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, projectId: number) => {
    e.stopPropagation();
    if (confirm(t('project.deleteConfirm'))) {
      await deleteProject(projectId);
    }
  };

  // ファイルからプロジェクトを読み込み（未ログイン時）
  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.blocklyXml) {
          alert('無効なプロジェクトファイルです');
          return;
        }
        const project: Project = {
          id: Date.now(),
          title: data.title || file.name.replace('.digicode.json', ''),
          description: data.description,
          blocklyXml: data.blocklyXml,
          generatedCode: data.generatedCode || '',
          language: data.language || 'arduino',
          createdAt: data.savedAt,
          updatedAt: data.savedAt,
        };
        onSelect(project);
        onOpenChange(false);
      } catch {
        alert('ファイルの読み込みに失敗しました');
      }
    };
    reader.readAsText(file);
    // 同じファイルを再選択できるようにリセット
    e.target.value = '';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const locale = i18n.language === 'ja' ? 'ja-JP' : 'en-US';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('project.openProject')}</DialogTitle>
          <DialogDescription>
            {t('project.selectProject')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isAuthenticated ? (
            // サーバーから読み込み（ログイン済み）
            <>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">{t('common.loading')}</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('project.noSavedProjects')}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-500/10 cursor-pointer"
                      onClick={() => handleSelect(project.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{project.title}</h4>
                        {project.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {project.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('project.updatedAt')}: {formatDate(project.updatedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        onClick={(e) => handleDelete(e, project.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            // ファイルから読み込み（未ログイン）
            <div className="text-center py-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                保存済みの .digicode.json ファイルを選択してください
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.digicode.json"
                onChange={handleFileOpen}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                ファイルを選択して開く
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
