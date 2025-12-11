import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  highlight?: {
    type: 'toolbox' | 'block' | 'button' | 'area';
    target: string;
  };
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // 分
  steps: TutorialStep[];
  category: string;
  sampleXml?: string; // サンプルブロックXML（チュートリアル開始時に読み込み）
}

interface TutorialState {
  // 現在のチュートリアル状態
  currentTutorial: string | null;
  currentStep: number;
  isActive: boolean;

  // 完了記録
  completedTutorials: string[];
  stepsCompleted: Record<string, number[]>; // tutorialId -> completed step indices

  // アクション
  startTutorial: (tutorialId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetProgress: () => void;
  goToStep: (stepIndex: number) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      currentTutorial: null,
      currentStep: 0,
      isActive: false,
      completedTutorials: [],
      stepsCompleted: {},

      startTutorial: (tutorialId) => {
        set({
          currentTutorial: tutorialId,
          currentStep: 0,
          isActive: true,
        });
      },

      nextStep: () => {
        const { currentTutorial, currentStep, stepsCompleted } = get();
        if (!currentTutorial) return;

        // 現在のステップを完了済みに追加
        const completedSteps = stepsCompleted[currentTutorial] || [];
        if (!completedSteps.includes(currentStep)) {
          set({
            stepsCompleted: {
              ...stepsCompleted,
              [currentTutorial]: [...completedSteps, currentStep],
            },
          });
        }

        set({ currentStep: currentStep + 1 });
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      skipTutorial: () => {
        set({
          currentTutorial: null,
          currentStep: 0,
          isActive: false,
        });
      },

      completeTutorial: () => {
        const { currentTutorial, completedTutorials } = get();
        if (currentTutorial && !completedTutorials.includes(currentTutorial)) {
          set({
            completedTutorials: [...completedTutorials, currentTutorial],
          });
        }
        set({
          currentTutorial: null,
          currentStep: 0,
          isActive: false,
        });
      },

      resetProgress: () => {
        set({
          completedTutorials: [],
          stepsCompleted: {},
        });
      },

      goToStep: (stepIndex) => {
        set({ currentStep: stepIndex });
      },
    }),
    {
      name: 'tutorial-storage',
      partialize: (state) => ({
        completedTutorials: state.completedTutorials,
        stepsCompleted: state.stepsCompleted,
      }),
    }
  )
);
