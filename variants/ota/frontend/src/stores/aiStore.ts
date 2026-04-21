import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AiProvider } from '@/services/ai/index';

interface AiState {
  // persist fields
  provider: AiProvider;
  apiKey: string;
  customEndpoint?: string;
  model?: string;

  // memory-only
  isGenerating: boolean;
  lastError?: string;

  // actions
  setProvider: (p: AiProvider) => void;
  setApiKey: (k: string) => void;
  setCustomEndpoint: (url: string) => void;
  setModel: (m: string) => void;
  clearCredentials: () => void;
  setGenerating: (v: boolean) => void;
  setError: (msg?: string) => void;
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

      setProvider: (provider) => set({ provider }),
      setApiKey:   (apiKey)   => set({ apiKey }),
      setCustomEndpoint: (customEndpoint) => set({ customEndpoint }),
      setModel: (model) => set({ model }),
      clearCredentials: () => set({ apiKey: '', customEndpoint: undefined, model: undefined }),
      setGenerating: (isGenerating) => set({ isGenerating }),
      setError: (lastError) => set({ lastError }),
    }),
    {
      name: 'ai-store',
      // isGenerating と lastError はメモリのみ、persist しない
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        customEndpoint: state.customEndpoint,
        model: state.model,
      }),
    },
  ),
);
