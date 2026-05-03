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
import {
  serializeDigicodeProjectFile,
  defaultDigicodeFileName,
  type DigicodeProjectFile,
} from '@/services/projectFileReader';

interface SaveProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocklyXml: string;
  generatedCode: string;
  onSaved?: () => void;
}

export function SaveProjectDialog({
  open,
  onOpenChange,
  blocklyXml,
  generatedCode,
  onSaved,
}: SaveProjectDialogProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ダイアログが開いた時に状態をリセット
  useEffect(() => {
    if (open) {
      // Props→State sync: ダイアログ開示時のフォームリセット（意図的）
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle('');
      setDescription('');
      setError('');
    }
  }, [open]);

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

    setIsSaving(true);

    // ファイルとしてダウンロード保存（全ユーザー共通）
    let success = false;
    try {
      const projectData: DigicodeProjectFile = {
        title: title.trim(),
        description: description.trim() || undefined,
        blocklyXml,
        generatedCode,
        language: 'arduino',
        savedAt: new Date().toISOString(),
      };
      const blob = new Blob([serializeDigicodeProjectFile(projectData)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultDigicodeFileName(title);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success = true;
    } catch {
      success = false;
    }

    setIsSaving(false);

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
          <DialogTitle>{t('project.saveAsNew')}</DialogTitle>
          <DialogDescription>{t('project.enterNameToSave')}</DialogDescription>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('project.descriptionOptional')}</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('project.descriptionPlaceholder')}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('project.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
