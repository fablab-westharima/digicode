// 41.md Phase 2 — 要望フォーム API client。
// Backend: esp32-blockly-backend `routes/feedback.ts` (POST) + `routes/admin-feedback.ts` (Admin 4 endpoints)。
// Auth: fetchWithAuth が Bearer + Accept-Language を自動付与。X-App-Version は build-globals.d.ts 経由。

import { fetchWithAuth } from '@/lib/api';

export type FeedbackCategory = 'bug' | 'feature' | 'ui' | 'block' | 'docs' | 'other';

export type FeedbackStatus = 'new' | 'triaged' | 'planned' | 'closed';

export interface FeedbackInput {
  category: FeedbackCategory;
  title: string;
  body: string;
}

export interface FeedbackSubmitResponse {
  id: number;
  createdAt: string;
}

export interface FeedbackItem {
  id: number;
  userId: number;
  userEmail: string | null;
  userPlan: string | null;
  category: FeedbackCategory;
  title: string;
  body: string;
  status: FeedbackStatus;
  adminNote: string | null;
  locale: string | null;
  appVersion: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  items: FeedbackItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface FeedbackListParams {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  limit?: number;
  offset?: number;
  sort?: 'created_desc' | 'created_asc' | 'status';
}

export interface FeedbackPatchInput {
  status?: FeedbackStatus;
  adminNote?: string;
}

interface BackendErrorBody {
  error?: string;
  errorCode?: string;
}

async function throwApiError(res: Response, fallbackKey: string): Promise<never> {
  const data: BackendErrorBody = await res.json().catch(() => ({}));
  const err = new Error(data.error || fallbackKey) as Error & { errorCode?: string; status?: number };
  err.errorCode = data.errorCode;
  err.status = res.status;
  throw err;
}

// User-side: 要望投稿
export async function submitFeedback(input: FeedbackInput): Promise<FeedbackSubmitResponse> {
  const res = await fetchWithAuth('/api/feedback', {
    method: 'POST',
    headers: {
      'X-App-Version': __APP_VERSION__,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, 'feedback.error.network');
  return res.json();
}

// Admin: list (filter + pagination)
export async function fetchAdminFeedback(params: FeedbackListParams = {}): Promise<FeedbackListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  if (params.sort) qs.set('sort', params.sort);
  const path = qs.toString() ? `/api/admin/feedback?${qs.toString()}` : '/api/admin/feedback';
  const res = await fetchWithAuth(path);
  if (!res.ok) await throwApiError(res, 'admin.feedback.error.fetchFailed');
  return res.json();
}

// Admin: detail
export async function fetchAdminFeedbackDetail(id: number): Promise<FeedbackItem> {
  const res = await fetchWithAuth(`/api/admin/feedback/${id}`);
  if (!res.ok) await throwApiError(res, 'admin.feedback.error.fetchFailed');
  return res.json();
}

// Admin: status / admin_note 更新
export async function patchAdminFeedback(id: number, input: FeedbackPatchInput): Promise<FeedbackItem> {
  const res = await fetchWithAuth(`/api/admin/feedback/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, 'admin.feedback.error.patchFailed');
  return res.json();
}

// Admin: CSV export — fetchWithAuth で blob 取得 → object URL → <a download> click
export async function downloadAdminFeedbackCsv(): Promise<void> {
  const res = await fetchWithAuth('/api/admin/feedback/export');
  if (!res.ok) await throwApiError(res, 'admin.feedback.error.exportFailed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Content-Disposition から filename を抽出 (なければ default)
  const disposition = res.headers.get('Content-Disposition') || '';
  const m = /filename="?([^";]+)"?/i.exec(disposition);
  a.download = m?.[1] ?? `feedback_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
