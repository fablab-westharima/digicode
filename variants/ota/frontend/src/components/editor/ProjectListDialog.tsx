import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/projectStore';
import type { Project } from '@/stores/projectStore';

interface ProjectListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (project: Project) => void;
}

export function ProjectListDialog({
  open,
  onOpenChange,
  onSelect,
}: ProjectListDialogProps) {
  const { t, i18n } = useTranslation();
  const { projects, loadProjects, loadProject, deleteProject, isLoading, error } = useProjectStore();

  // ダイアログが開いた時にプロジェクト一覧を取得
  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open, loadProjects]);

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
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
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
                    className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => handleDelete(e, project.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
