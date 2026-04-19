import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { type SampleProject } from '@/data/sampleProjects';
import { useLocalizedSampleProjects } from '@/data/sampleProjectsI18n';

interface SampleProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectSample: (sample: SampleProject) => void;
}

export function SampleProjectsDialog({
  open,
  onOpenChange,
  onSelectSample,
}: SampleProjectsDialogProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');
  const { samples, categories: sampleCategories } = useLocalizedSampleProjects();

  const categories = Object.entries(sampleCategories);
  const filteredProjects = samples.filter(p => p.category === selectedCategory);

  const handleSelect = (sample: SampleProject) => {
    onSelectSample(sample);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('project.sampleProjects')}</DialogTitle>
          <DialogDescription>
            {t('project.selectCategorySample')}
          </DialogDescription>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap border-b pb-3">
          {categories.map(([key, { name, icon }]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(key)}
            >
              {icon} {name}
            </Button>
          ))}
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-3">
          {filteredProjects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('project.noCategorySamples')}
            </p>
          ) : (
            filteredProjects.map((sample) => (
              <div
                key={sample.id}
                className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleSelect(sample)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{sample.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {sample.description}
                    </p>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {sample.language === 'arduino' ? 'Arduino C++' : 'MicroPython'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-3 border-t">
          {t('project.sampleLoadNote')}
        </div>
      </DialogContent>
    </Dialog>
  );
}
