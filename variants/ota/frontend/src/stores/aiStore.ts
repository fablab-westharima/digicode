import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AiProvider, AiMode, Message } from '@/services/ai/index';

interface AiState {
  // persist fields（4 項目固定、判断 4）
  provider: AiProvider;
  apiKey: string;
  customEndpoint?: string;
  model?: string;

  // memory-only（リロードで消える、会話履歴は persist しない）
  isGenerating: boolean;
  lastError?: string;
  currentMode: AiMode;
  conversationBlockGen: Message[];
  conversationHelpBot: Message[];
  // Phase 4 controllerCustomize 会話履歴 (50.md §4.2 #5、aiStore 拡張)。
  // memory-only、persist しない (他 2 mode と同方針)。
  conversationControllerCustomize: Message[];
  lastTokenUsage: number;

  // actions
  setProvider: (p: AiProvider) => void;
  setApiKey: (k: string) => void;
  setCustomEndpoint: (url: string) => void;
  setModel: (m: string) => void;
  clearCredentials: () => void;
  setGenerating: (v: boolean) => void;
  setError: (msg?: string) => void;
  setCurrentMode: (mode: AiMode) => void;
  appendMessage: (mode: AiMode, message: Message) => void;
  clearConversation: (mode: AiMode) => void;
  setLastTokenUsage: (tokens: number) => void;
}

export const useAiStore = create<AiState>()(
  persist(
    (set) => ({
      provider: 'openai',
      apiKey: '',
      customEndpoint: undefined,
      model: undefined,
      isGenerating: false,
      lastError: undefined,
      currentMode: 'blockGen',
      conversationBlockGen: [],
      conversationHelpBot: [],
      conversationControllerCustomize: [],
      lastTokenUsage: 0,

      setProvider: (provider) => set({ provider }),
      setApiKey:   (apiKey)   => set({ apiKey }),
      setCustomEndpoint: (customEndpoint) => set({ customEndpoint }),
      setModel: (model) => set({ model }),
      clearCredentials: () => set({ apiKey: '', customEndpoint: undefined, model: undefined }),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setError: (lastError) => set({ lastError }),
      setCurrentMode: (currentMode) => set({ currentMode }),
      appendMessage: (mode, message) => set((state) => ({
        conversationBlockGen: mode === 'blockGen'
          ? [...state.conversationBlockGen, message]
          : state.conversationBlockGen,
        conversationHelpBot: mode === 'helpBot'
          ? [...state.conversationHelpBot, message]
          : state.conversationHelpBot,
        conversationControllerCustomize: mode === 'controllerCustomize'
          ? [...state.conversationControllerCustomize, message]
          : state.conversationControllerCustomize,
      })),
      clearConversation: (mode) => set((state) => ({
        conversationBlockGen: mode === 'blockGen' ? [] : state.conversationBlockGen,
        conversationHelpBot:  mode === 'helpBot'  ? [] : state.conversationHelpBot,
        conversationControllerCustomize:
          mode === 'controllerCustomize' ? [] : state.conversationControllerCustomize,
      })),
      setLastTokenUsage: (lastTokenUsage) => set({ lastTokenUsage }),
    }),
    {
      name: 'ai-store',
      // isGenerating / lastError / currentMode / conversation* / lastTokenUsage はメモリのみ
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        customEndpoint: state.customEndpoint,
        model: state.model,
      }),
    },
  ),
);
