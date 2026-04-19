import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTutorialStore } from '@/stores/tutorialStore';
import { getTutorialById } from '@/data/tutorials';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TutorialOverlay() {
  const { t } = useTranslation();
  const {
    currentTutorial,
    currentStep,
    isActive,
    nextStep,
    prevStep,
    skipTutorial,
    completeTutorial,
  } = useTutorialStore();

  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const tutorial = currentTutorial ? getTutorialById(currentTutorial) : null;
  const step = tutorial?.steps[currentStep];
  const isLastStep = tutorial ? currentStep >= tutorial.steps.length - 1 : false;
  const isFirstStep = currentStep === 0;

  // ハイライト対象を探す
  useEffect(() => {
    if (!step?.highlight) {
      setHighlightRect(null);
      return;
    }

    const findElement = () => {
      let element: Element | null = null;

      switch (step.highlight?.type) {
        case 'toolbox':
          // Blocklyツールボックスのカテゴリを探す
          element = document.querySelector(
            `.blocklyToolboxCategory[aria-label*="${step.highlight.target}"], ` +
            `.blocklyTreeLabel:contains("${step.highlight.target}")`
          );
          if (!element) {
            // 代替：テキストで探す
            const labels = document.querySelectorAll('.blocklyTreeLabel');
            for (const label of labels) {
              if (label.textContent?.includes(step.highlight.target)) {
                element = label.closest('.blocklyToolboxCategory') || label;
                break;
              }
            }
          }
          break;
        case 'button':
          // ボタンを探す
          if (step.highlight.target === 'compile') {
            element = document.querySelector('button:has(.lucide-zap)');
          } else if (step.highlight.target === 'serial-monitor') {
            element = document.querySelector('[data-tutorial-target="serial-monitor"]');
          }
          break;
        case 'area':
          if (step.highlight.target === 'code-preview') {
            element = document.querySelector('[class*="CodePreview"]') ||
                     document.querySelector('[data-component="code-preview"]');
          }
          break;
        default:
          break;
      }

      if (element) {
        setHighlightRect(element.getBoundingClientRect());
      } else {
        setHighlightRect(null);
      }
    };

    // 少し遅延して要素を探す（DOMが更新されるのを待つ）
    const timer = setTimeout(findElement, 100);
    return () => clearTimeout(timer);
  }, [step]);

  if (!isActive || !tutorial || !step) {
    return null;
  }

  // ポジションに応じたダイアログ位置
  const getDialogPosition = () => {
    if (!highlightRect || step.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 20;

    switch (step.position) {
      case 'right':
        return {
          top: `${Math.max(padding, highlightRect.top)}px`,
          left: `${highlightRect.right + padding}px`,
        };
      case 'left':
        return {
          top: `${Math.max(padding, highlightRect.top)}px`,
          right: `${window.innerWidth - highlightRect.left + padding}px`,
        };
      case 'bottom':
        return {
          top: `${highlightRect.bottom + padding}px`,
          left: `${Math.max(padding, highlightRect.left)}px`,
        };
      case 'top':
        return {
          bottom: `${window.innerHeight - highlightRect.top + padding}px`,
          left: `${Math.max(padding, highlightRect.left)}px`,
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      completeTutorial();
    } else {
      nextStep();
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 半透明オーバーレイ */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={(e) => e.stopPropagation()} />

      {/* ハイライト領域（穴を開ける） */}
      {highlightRect && (
        <div
          className="absolute bg-transparent pointer-events-none"
          style={{
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            border: '2px solid #3b82f6',
            animation: 'pulse 2s infinite',
          }}
        />
      )}

      {/* チュートリアルダイアログ */}
      <div
        className="absolute w-80 bg-white rounded-lg shadow-xl p-4 pointer-events-auto"
        style={getDialogPosition()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {t('tutorial.step', { defaultValue: 'ステップ {{current}} / {{total}}', current: currentStep + 1, total: tutorial.steps.length })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={skipTutorial}
            className="h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* タイトル */}
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>

        {/* コンテンツ */}
        <p className="text-sm text-gray-600 mb-4">{step.content}</p>

        {/* 進捗バー */}
        <div className="w-full h-1 bg-gray-200 rounded-full mb-4">
          <div
            className="h-1 bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tutorial.steps.length) * 100}%` }}
          />
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={isFirstStep}
            className="text-xs"
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            {t('tutorial.back', { defaultValue: '戻る' })}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={skipTutorial}
            className="text-xs text-gray-500"
          >
            {t('tutorial.skip', { defaultValue: 'スキップ' })}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleNext}
            className={cn(
              "text-xs",
              isLastStep && "bg-green-600 hover:bg-green-700"
            )}
          >
            {isLastStep ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('tutorial.complete', { defaultValue: '完了' })}
              </>
            ) : (
              <>
                {t('tutorial.next', { defaultValue: '次へ' })}
                <ChevronRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CSSアニメーション */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            border-color: #3b82f6;
          }
          50% {
            border-color: #93c5fd;
          }
        }
      `}</style>
    </div>
  );
}
