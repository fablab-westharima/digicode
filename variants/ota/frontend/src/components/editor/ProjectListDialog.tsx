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
import { parseDigicodeFileContent } from '@/services/projectFileReader';

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
      const text = event.target?.result as string;
      const result = parseDigicodeFileContent(text);
      if (!result.ok) {
        alert(
          result.error === 'invalid-json'
            ? t('project.fileLoadError')
            : t('project.invalidFile'),
        );
        return;
      }
      const data = result.data;
      // Project.language is the literal type 'arduino' (the only CodeLanguage
      // value shipping today). The on-disk format leaves the field free-form
      // string for forward-compat, so we coerce to 'arduino' here — matching
      // the previous `data.language || 'arduino'` fallback semantics.
      const project: Project = {
        id: Date.now(),
        title: data.title || file.name.replace('.digicode.json', ''),
        description: data.description,
        blocklyXml: data.blocklyXml,
        generatedCode: data.generatedCode,
        language: 'arduino',
        createdAt: data.savedAt,
        updatedAt: data.savedAt,
      };
      onSelect(project);
      onOpenChange(false);
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
