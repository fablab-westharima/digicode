// Type definitions for DigiCode

export interface User {
  id: number;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// 認証関連の型
export * from './auth';

export interface Project {
  id: number;
  userId: number;
  title: string;
  description?: string;
  blocklyXml: string;
  generatedCode?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: number;
  userId: number;
  status: 'free' | 'active' | 'cancelled' | 'expired';
  planType: 'free' | 'premium';
  startedAt?: string;
  expiresAt?: string;
}
