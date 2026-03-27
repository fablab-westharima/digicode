import { create } from 'zustand';
import { api } from '@/lib/api';

// Arduino C++ のみをサポート
export type CodeLanguage = 'arduino';

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

// ローカルプロジェクト保存用
const LOCAL_PROJECTS_KEY = 'digicode-local-projects';

function getLocalProjects(): Project[] {
  try {
    const data = localStorage.getItem(LOCAL_PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalProjects(projects: Project[]): void {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
}

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  setCurrentProject: (project: Project | null) => void;
  updateCurrentProject: (updates: Partial<Project>) => void;
  // サーバー保存（ログイン済みユーザー用）
  loadProjects: () => Promise<void>;
  loadProject: (id: number) => Promise<Project | null>;
  createProject: (data: { title: string; description?: string; blocklyXml: string; language?: CodeLanguage }) => Promise<Project | null>;
  saveProject: (blocklyXml: string, generatedCode: string, language?: CodeLanguage) => Promise<boolean>;
  deleteProject: (id: number) => Promise<boolean>;
  // ローカル保存（未ログインユーザー用）
  loadLocalProjects: () => void;
  loadLocalProject: (id: number) => Project | null;
  createLocalProject: (data: { title: string; description?: string; blocklyXml: string; language?: CodeLanguage }) => Project;
  saveLocalProject: (blocklyXml: string, generatedCode: string) => boolean;
  deleteLocalProject: (id: number) => boolean;
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
        language: p.language || 'arduino',
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
        language: p.language || 'arduino',
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
        language: p.language || 'arduino',
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
        language: p.language || 'arduino',
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

  // ローカル保存関数群
  loadLocalProjects: () => {
    const projects = getLocalProjects();
    set({ projects, isLoading: false });
  },

  loadLocalProject: (id: number) => {
    const projects = getLocalProjects();
    const project = projects.find(p => p.id === id) || null;
    if (project) {
      set({ currentProject: project });
    }
    return project;
  },

  createLocalProject: (data) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: Date.now(),
      title: data.title,
      description: data.description,
      blocklyXml: data.blocklyXml,
      language: data.language || 'arduino',
      createdAt: now,
      updatedAt: now,
    };
    const projects = getLocalProjects();
    projects.unshift(project);
    setLocalProjects(projects);
    set((state) => ({
      currentProject: project,
      projects: [project, ...state.projects],
    }));
    return project;
  },

  saveLocalProject: (blocklyXml: string, generatedCode: string) => {
    const { currentProject } = get();
    if (!currentProject) return false;

    const now = new Date().toISOString();
    const updated: Project = {
      ...currentProject,
      blocklyXml,
      generatedCode,
      updatedAt: now,
    };
    const projects = getLocalProjects().map(p =>
      p.id === updated.id ? updated : p
    );
    setLocalProjects(projects);
    set((state) => ({
      currentProject: updated,
      projects: state.projects.map(p => p.id === updated.id ? updated : p),
    }));
    return true;
  },

  deleteLocalProject: (id: number) => {
    const projects = getLocalProjects().filter(p => p.id !== id);
    setLocalProjects(projects);
    set((state) => ({
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
      projects: state.projects.filter(p => p.id !== id),
    }));
    return true;
  },
}));
