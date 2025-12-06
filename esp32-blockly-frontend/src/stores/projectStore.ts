import { create } from 'zustand';
import { api } from '@/lib/api';
import type { CodeLanguage } from './languageStore';

export interface Project {
  id: number;
  title: string;
  description?: string;
  blocklyXml: string;
  generatedCode?: string;
  language?: CodeLanguage;
  createdAt?: string;
  updatedAt?: string;
}

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  setCurrentProject: (project: Project | null) => void;
  updateCurrentProject: (updates: Partial<Project>) => void;
  loadProjects: () => Promise<void>;
  loadProject: (id: number) => Promise<Project | null>;
  createProject: (data: { title: string; description?: string; blocklyXml: string; language?: CodeLanguage }) => Promise<Project | null>;
  saveProject: (blocklyXml: string, generatedCode: string, language?: CodeLanguage) => Promise<boolean>;
  deleteProject: (id: number) => Promise<boolean>;
  clearError: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,

  setCurrentProject: (project) => set({ currentProject: project }),

  updateCurrentProject: (updates) => set((state) => ({
    currentProject: state.currentProject
      ? { ...state.currentProject, ...updates }
      : null,
  })),

  clearError: () => set({ error: null }),

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.projects.list();
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロジェクト一覧の取得に失敗しました');
      }
      const data = await response.json();
      // スネークケースからキャメルケースに変換
      const projects = (data.projects || []).map((p: Record<string, unknown>) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        blocklyXml: p.blockly_xml,
        generatedCode: p.generated_code,
        language: p.language || 'micropython',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
      set({ projects, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'エラーが発生しました',
        isLoading: false,
      });
    }
  },

  loadProject: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.projects.get(id);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロジェクトの取得に失敗しました');
      }
      const data = await response.json();
      const p = data.project;
      const project: Project = {
        id: p.id,
        title: p.title,
        description: p.description,
        blocklyXml: p.blockly_xml,
        generatedCode: p.generated_code,
        language: p.language || 'micropython',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
      set({ currentProject: project, isLoading: false });
      return project;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'エラーが発生しました',
        isLoading: false,
      });
      return null;
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.projects.create(data);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'プロジェクトの作成に失敗しました');
      }
      const result = await response.json();
      const p = result.project;
      const project: Project = {
        id: p.id,
        title: p.title,
        description: p.description,
        blocklyXml: p.blockly_xml,
        generatedCode: p.generated_code,
        language: p.language || 'micropython',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
      set((state) => ({
        currentProject: project,
        projects: [project, ...state.projects],
        isLoading: false,
      }));
      return project;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'エラーが発生しました',
        isLoading: false,
      });
      return null;
    }
  },

  saveProject: async (blocklyXml: string, generatedCode: string, language?: CodeLanguage) => {
    const { currentProject } = get();
    if (!currentProject) {
      set({ error: 'プロジェクトが選択されていません' });
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await api.projects.update(currentProject.id, {
        blocklyXml,
        generatedCode,
        language,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロジェクトの保存に失敗しました');
      }
      const data = await response.json();
      const p = data.project;
      const project: Project = {
        id: p.id,
        title: p.title,
        description: p.description,
        blocklyXml: p.blockly_xml,
        generatedCode: p.generated_code,
        language: p.language || 'micropython',
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
      set((state) => ({
        currentProject: project,
        projects: state.projects.map((proj) =>
          proj.id === project.id ? project : proj
        ),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'エラーが発生しました',
        isLoading: false,
      });
      return false;
    }
  },

  deleteProject: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.projects.delete(id);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロジェクトの削除に失敗しました');
      }
      set((state) => ({
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        projects: state.projects.filter((p) => p.id !== id),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'エラーが発生しました',
        isLoading: false,
      });
      return false;
    }
  },
}));
