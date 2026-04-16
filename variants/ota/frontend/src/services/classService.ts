import { fetchWithAuth } from '@/lib/api';

// --- Types ---

export interface ClassInfo {
  id: number;
  name: string;
  ownerId: number;
  inviteCode: string;
  compileServerTarget: string;
  classType: string;
  expiresAt: string | null;
  status: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentInfo {
  id: number;
  classId: number;
  title: string;
  description: string | null;
  templateBlocklyXml: string | null;
  templateGeneratedCode: string | null;
  dueDate: string | null;
  attachmentFilename: string | null;
  attachmentSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentInfo {
  userId: number;
  loginId: string;
  displayName: string | null;
  password: string | null;
  accountType: string;
  role: string;
  joinedAt: string;
}

export interface CreatedStudent {
  name: string;
  loginId: string;
  password: string;
}

// --- Helper ---

/**
 * 有効期限まで残り何日かを返す。
 * - null: expiresAt が未設定（期限なし）
 * - 正の数: 期限まで N 日
 * - 0: 今日が期限（24 時間以内）
 * - 負の数: 期限切れ
 */
export function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

async function parseErrorOrThrow(response: Response): Promise<never> {
  let message = 'エラーが発生しました';
  try {
    const data = await response.json();
    if (data.error) message = data.error;
  } catch {
    // ignore parse error
  }
  throw new Error(message);
}

// --- API ---

export async function listClasses(): Promise<ClassInfo[]> {
  const res = await fetchWithAuth('/api/classes');
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.classes;
}

export async function createClass(
  name: string,
  classType?: string,
): Promise<ClassInfo> {
  const res = await fetchWithAuth('/api/classes', {
    method: 'POST',
    body: JSON.stringify({ name, classType }),
  });
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.class;
}

export async function duplicateClass(
  classId: number,
  name: string,
): Promise<ClassInfo> {
  const res = await fetchWithAuth(`/api/classes/${classId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.class;
}

export async function getClass(id: number): Promise<ClassInfo> {
  const res = await fetchWithAuth(`/api/classes/${id}`);
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.class;
}

export async function deleteClass(id: number): Promise<void> {
  const res = await fetchWithAuth(`/api/classes/${id}`, { method: 'DELETE' });
  if (!res.ok) await parseErrorOrThrow(res);
}

export async function listStudents(classId: number): Promise<StudentInfo[]> {
  const res = await fetchWithAuth(`/api/classes/${classId}/students`);
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.students;
}

export async function createStudents(
  classId: number,
  names: string[],
): Promise<{ students: CreatedStudent[]; count: number }> {
  const res = await fetchWithAuth(`/api/classes/${classId}/students`, {
    method: 'POST',
    body: JSON.stringify({ students: names.map((name) => ({ name })) }),
  });
  if (!res.ok) await parseErrorOrThrow(res);
  return res.json();
}

export async function deleteStudent(classId: number, studentId: number): Promise<void> {
  const res = await fetchWithAuth(`/api/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) await parseErrorOrThrow(res);
}

export async function resetStudentPassword(
  classId: number,
  studentId: number,
): Promise<{ loginId: string; password: string }> {
  const res = await fetchWithAuth(
    `/api/classes/${classId}/students/${studentId}/reset-password`,
    { method: 'POST' },
  );
  if (!res.ok) await parseErrorOrThrow(res);
  return res.json();
}

// --- Assignments API ---

export async function listAssignments(classId: number): Promise<AssignmentInfo[]> {
  const res = await fetchWithAuth(`/api/classes/${classId}/assignments`);
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.assignments;
}

export async function createAssignment(
  classId: number,
  data: {
    title: string;
    description?: string;
    templateBlocklyXml?: string;
    templateGeneratedCode?: string;
    dueDate?: string;
    attachment?: string; // Base64
    attachmentFilename?: string;
  },
): Promise<AssignmentInfo> {
  const res = await fetchWithAuth(`/api/classes/${classId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) await parseErrorOrThrow(res);
  const result = await res.json();
  return result.assignment;
}

export async function deleteAssignment(classId: number, assignmentId: number): Promise<void> {
  const res = await fetchWithAuth(`/api/classes/${classId}/assignments/${assignmentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) await parseErrorOrThrow(res);
}

export async function distributeAssignment(
  classId: number,
  assignmentId: number,
): Promise<{ distributed: number; total: number }> {
  const res = await fetchWithAuth(
    `/api/classes/${classId}/assignments/${assignmentId}/distribute`,
    { method: 'POST' },
  );
  if (!res.ok) await parseErrorOrThrow(res);
  return res.json();
}

export function getAttachmentUrl(classId: number, assignmentId: number): string {
  const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8787'
    : 'https://esp32-blockly-backend.kazunari-takeda.workers.dev';
  return `${API_URL}/api/classes/${classId}/assignments/${assignmentId}/attachment`;
}

// --- Submissions API ---

export interface SubmissionInfo {
  id: number;
  assignmentId: number;
  studentUserId: number;
  blocklyXml: string | null;
  generatedCode: string | null;
  status: string;
  score: number | null;
  comment: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignmentTitle: string;
  assignmentDescription?: string | null;
  classId: number;
  attachmentFilename: string | null;
  attachmentSize: number;
}

export async function listMySubmissions(): Promise<SubmissionInfo[]> {
  const res = await fetchWithAuth('/api/submissions/my');
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.submissions;
}

export async function getSubmission(id: number): Promise<SubmissionInfo> {
  const res = await fetchWithAuth(`/api/submissions/${id}`);
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.submission;
}

export async function saveSubmission(
  id: number,
  data: { blocklyXml: string; generatedCode: string },
): Promise<SubmissionInfo> {
  const res = await fetchWithAuth(`/api/submissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) await parseErrorOrThrow(res);
  const result = await res.json();
  return result.submission;
}

export async function submitSubmission(id: number): Promise<void> {
  const res = await fetchWithAuth(`/api/submissions/${id}/submit`, {
    method: 'POST',
  });
  if (!res.ok) await parseErrorOrThrow(res);
}

export async function downloadSubmissionAttachment(
  submissionId: number,
  filename: string,
): Promise<void> {
  const res = await fetchWithAuth(`/api/submissions/${submissionId}/attachment`);
  if (!res.ok) await parseErrorOrThrow(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// T2: クラスデータを ZIP でエクスポート
// ClassDetailPage のエクスポートボタンから呼ばれる
// Workers → ML30 で archiver により ZIP が生成され、ブラウザにダウンロードされる
export async function exportClass(
  classId: number,
  className: string,
): Promise<void> {
  const res = await fetchWithAuth(`/api/classes/${classId}/export`);
  if (!res.ok) await parseErrorOrThrow(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // ファイル名: <className>_export_<YYYY-MM-DD>.zip
  // サーバー側の Content-Disposition にもファイル名があるが、フロント側で
  // 明示的に設定することで確実にダウンロード時のファイル名を制御
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeName = className.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100);
  a.download = `${safeName || 'class'}_export_${dateStr}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Admin Dashboard (Step 7) ---

// 課題別 submission 一覧の各行（軽量版、blockly_xml 除外）
// 管理者用ダッシュボード向け
export interface AssignmentSubmissionRow {
  id: number;
  assignmentId: number;
  studentUserId: number;
  status: string;
  score: number | null;
  comment: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignmentTitle: string;
  classId: number;
  attachmentFilename: string | null;
  attachmentSize: number;
  studentEmail: string | null;
  studentDisplayName: string | null;
}

export async function listAssignmentSubmissions(
  classId: number,
  assignmentId: number,
): Promise<AssignmentSubmissionRow[]> {
  const res = await fetchWithAuth(
    `/api/classes/${classId}/assignments/${assignmentId}/submissions`,
  );
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.submissions;
}

export async function gradeSubmission(
  classId: number,
  assignmentId: number,
  submissionId: number,
  data: { score: number | null; comment: string | null },
): Promise<SubmissionInfo> {
  const res = await fetchWithAuth(
    `/api/classes/${classId}/assignments/${assignmentId}/submissions/${submissionId}/grade`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) await parseErrorOrThrow(res);
  const result = await res.json();
  return result.submission;
}

export async function returnSubmission(
  classId: number,
  assignmentId: number,
  submissionId: number,
): Promise<void> {
  const res = await fetchWithAuth(
    `/api/classes/${classId}/assignments/${assignmentId}/submissions/${submissionId}/return`,
    { method: 'POST' },
  );
  if (!res.ok) await parseErrorOrThrow(res);
}

// 課題の詳細取得（既存 listAssignments から個別抽出は可能だが、専用 API が必要）
// Step 7 では listAssignments で取得したリストから探す方式でも良いが、
// AssignmentSubmissionsPage で URL から直接アクセスする場合のため新設
export async function getAssignment(
  classId: number,
  assignmentId: number,
): Promise<AssignmentInfo> {
  const res = await fetchWithAuth(
    `/api/classes/${classId}/assignments/${assignmentId}`,
  );
  if (!res.ok) await parseErrorOrThrow(res);
  const data = await res.json();
  return data.assignment;
}
