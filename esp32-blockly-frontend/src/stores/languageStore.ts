import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CodeLanguage = 'micropython' | 'arduino';

interface LanguageState {
  language: CodeLanguage;
  setLanguage: (language: CodeLanguage) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'micropython', // デフォルトはMicroPython
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'code-language-storage', // localStorageのキー
    }
  )
);
