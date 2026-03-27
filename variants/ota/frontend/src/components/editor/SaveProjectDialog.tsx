import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectStore } from '@/stores/projectStore';

interface SaveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocklyXml: string;
  generatedCode: string;
  isAuthenticated?: boolean;
  onSaved?: () => void;
}

export function SaveProjectDialog({
  open,
  onOpenChange,
  blocklyXml,
  generatedCode,
  isAuthenticated = false,
  onSaved,
}: SaveProjectDialogProps) {
  const { t } = useTranslation();
  const { currentProject, createProject, saveProject, isLoading } = useProjectStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // ダイアログが開いた時に現在のプロジェクト情報を反映
  useEffect(() => {
    if (open) {
      setTitle(currentProject?.title || '');
      setDescription(currentProject?.description || '');
      setError('');
    }
  }, [open, currentProject]);

  const handleSave = async () => {
    setError('');

    // バリデーション
    if (!title.trim()) {
      setError(t('project.titleRequiredError'));
      return;
    }

    if (title.length > 100) {
      setError(t('project.titleMaxLength'));
      return;
    }

    let success = false;

    if (isAuthenticated) {
      // サーバー保存（ログイン済み）
      if (currentProject) {
        success = await saveProject(blocklyXml, generatedCode, 'arduino');
      } else {
        const project = await createProject({
          title: title.trim(),
          description: description.trim() || undefined,
          blocklyXml,
          language: 'arduino',
        });
        success = project !== null;
      }
    } else {
      // ファイルとしてダウンロード保存（未ログイン）
      try {
        const projectData = {
          title: title.trim(),
          description: description.trim() || undefined,
          blocklyXml,
          generatedCode,
          language: 'arduino',
          savedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.trim()}.digicode.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        success = true;
      } catch {
        success = false;
      }
    }

    if (success) {
      onOpenChange(false);
      onSaved?.();
    } else {
      setError(t('project.saveError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {currentProject ? t('project.saveProject') : t('project.saveAsNew')}
          </DialogTitle>
          <DialogDescription>
            {currentProject
              ? t('project.saveChanges')
              : t('project.enterNameToSave')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('project.titleRequired')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('project.titlePlaceholder')}
              maxLength={100}
              disabled={!!currentProject}
            />
          </div>

          {!currentProject && (
            <div className="space-y-2">
              <Label htmlFor="description">{t('project.descriptionOptional')}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('project.descriptionPlaceholder')}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? t('project.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
