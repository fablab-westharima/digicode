import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tutorials, tutorialCategories } from '@/data/tutorials';
import { useTutorialStore } from '@/stores/tutorialStore';
import { Clock, Star, CheckCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TutorialSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialSelectDialog({ open, onOpenChange }: TutorialSelectDialogProps) {
  const { t } = useTranslation();
  const { startTutorial, completedTutorials } = useTutorialStore();

  const handleStartTutorial = (tutorialId: string) => {
    startTutorial(tutorialId);
    onOpenChange(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return t('tutorial.beginner');
      case 'intermediate':
        return t('tutorial.intermediate');
      case 'advanced':
        return t('tutorial.advanced');
      default:
        return difficulty;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('tutorial.selectTutorial')}</DialogTitle>
          <DialogDescription>
            {t('tutorial.selectTutorialDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(tutorialCategories).map(([categoryId, category]) => {
            if (category.tutorials.length === 0) return null;

            return (
              <div key={categoryId}>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">
                  {category.name}
                </h3>
                <div className="grid gap-3">
                  {category.tutorials.map((tutorial) => {
                    const isCompleted = completedTutorials.includes(tutorial.id);

                    return (
                      <div
                        key={tutorial.id}
                        className={cn(
                          "border rounded-lg p-4 transition-all hover:shadow-md",
                          isCompleted ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200 hover:border-green-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{tutorial.title}</h4>
                              {isCompleted && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {tutorial.description}
                            </p>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full",
                                getDifficultyColor(tutorial.difficulty)
                              )}>
                                {getDifficultyLabel(tutorial.difficulty)}
                              </span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock className="w-3 h-3" />
                                {t('tutorial.estimatedTime', { time: tutorial.estimatedTime })}
                              </span>
                              <span className="flex items-center gap-1 text-gray-500">
                                <Star className="w-3 h-3" />
                                {t('tutorial.stepCount', { count: tutorial.steps.length })}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleStartTutorial(tutorial.id)}
                            className={cn(
                              "ml-4",
                              isCompleted && "bg-gray-400 hover:bg-gray-500/100"
                            )}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            {isCompleted ? t('tutorial.again') : t('tutorial.start')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* 進捗情報 */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {t('tutorial.progress', { completed: completedTutorials.length, total: tutorials.length })}
            </span>
            {completedTutorials.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => useTutorialStore.getState().resetProgress()}
                className="text-xs text-gray-500"
              >
                {t('tutorial.resetProgress')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
