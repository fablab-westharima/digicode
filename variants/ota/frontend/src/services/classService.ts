import { fetchWithAuth } from '@/lib/api';

// --- Types ---

export interface ClassInfo {
  id: number;
  name: string;
  ownerId: number;
  inviteCode: string;
  compileServerTarget: string;
  expiresAt: string | null;
  status: string;
  archivedAt: string | null;
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
  compileServerTarget?: string,
  expiresAt?: string,
): Promise<ClassInfo> {
  const res = await fetchWithAuth('/api/classes', {
    method: 'POST',
    body: JSON.stringify({ name, compileServerTarget, expiresAt }),
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
