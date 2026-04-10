import { useRef } from 'react';
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
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルからプロジェクトを読み込み
  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.blocklyXml) {
          alert(t('project.invalidFile'));
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
        alert(t('project.fileLoadError'));
      }
    };
    reader.readAsText(file);
    // 同じファイルを再選択できるようにリセット
    e.target.value = '';
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
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('project.selectFileToOpen')}
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
              {t('project.selectFileButton')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
