import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, Check, Loader2, AlertTriangle,
  KeyRound, Trash2, Plus, Download, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
  getClass,
  listStudents,
  deleteClass,
  deleteStudent,
  resetStudentPassword,
  createStudents,
  type ClassInfo,
  type StudentInfo,
  type CreatedStudent,
} from '@/services/classService';

function downloadCSV(students: CreatedStudent[]) {
  const header = '名前,ログインID,パスワード\n';
  const rows = students.map((s) => `${s.name},${s.loginId},${s.password}`).join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ClassDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // インライン生徒追加
  const [newNames, setNewNames] = useState<string[]>([]);
  const [addingStudents, setAddingStudents] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedStudent[] | null>(null);

  // インライン確認状態
  const [deletingClassConfirm, setDeletingClassConfirm] = useState(false);
  const [deletingClassLoading, setDeletingClassLoading] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<number | null>(null);
  const [deletingStudentLoading, setDeletingStudentLoading] = useState(false);

  // PWリセット結果
  const [resetResult, setResetResult] = useState<{
    studentId: number;
    loginId: string;
    password: string;
  } | null>(null);
  const [resetLoading, setResetLoading] = useState<number | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const classId = id ? parseInt(id) : NaN;

  const fetchData = useCallback(async () => {
    if (isNaN(classId)) return;
    setLoading(true);
    setError(null);
    try {
      const [cls, studs] = await Promise.all([
        getClass(classId),
        listStudents(classId),
      ]);
      setClassInfo(cls);
      setStudents(studs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (user?.plan === 'enterprise') {
      fetchData();
    }
  }, [user?.plan, fetchData]);

  // --- クラス情報系 ---

  const handleCopyInviteCode = async () => {
    if (!classInfo) return;
    try {
      await navigator.clipboard.writeText(classInfo.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch { /* ignore */ }
  };

  const handleDeleteClass = async () => {
    setDeletingClassLoading(true);
    try {
      await deleteClass(classId);
      navigate('/classes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クラスの削除に失敗しました');
      setDeletingClassConfirm(false);
    } finally {
      setDeletingClassLoading(false);
    }
  };

  // --- 生徒追加（インライン行追加方式） ---

  const handleStartAddStudents = () => {
    setNewNames(['']);
    setCreatedResult(null);
  };

  const handleCancelAdd = () => {
    setNewNames([]);
  };

  const handleAddRow = () => {
    if (newNames.length >= 40) return;
    setNewNames((prev) => [...prev, '']);
  };

  const handleRemoveRow = (index: number) => {
    setNewNames((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNameChange = (index: number, value: string) => {
    setNewNames((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const handleSubmitNewStudents = async () => {
    const validNames = newNames.map((n) => n.trim()).filter((n) => n.length > 0);
    if (validNames.length === 0) {
      setError('名前を入力してください');
      return;
    }

    setAddingStudents(true);
    setError(null);
    try {
      const result = await createStudents(classId, validNames);
      setCreatedResult(result.students);
      setNewNames([]);
      // 生徒一覧をリフェッチ
      const studs = await listStudents(classId);
      setStudents(studs);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生徒アカウントの作成に失敗しました');
    } finally {
      setAddingStudents(false);
    }
  };

  const handleDismissResult = () => {
    setCreatedResult(null);
  };

  // --- 生徒操作 ---

  const handleDeleteStudent = async (studentId: number) => {
    setDeletingStudentLoading(true);
    try {
      await deleteStudent(classId, studentId);
      setStudents((prev) => prev.filter((s) => s.userId !== studentId));
      setDeletingStudentId(null);
      if (resetResult?.studentId === studentId) setResetResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生徒の削除に失敗しました');
    } finally {
      setDeletingStudentLoading(false);
    }
  };

  const handleResetPassword = async (studentId: number) => {
    setResetLoading(studentId);
    setResetResult(null);
    try {
      const result = await resetStudentPassword(classId, studentId);
      setResetResult({ studentId, ...result });
      setCopiedPassword(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'パスワードリセットに失敗しました');
    } finally {
      setResetLoading(null);
    }
  };

  const handleCopyPassword = async () => {
    if (!resetResult) return;
    try {
      await navigator.clipboard.writeText(resetResult.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch { /* ignore */ }
  };

  // --- 権限ガード ---
  if (user?.plan !== 'enterprise') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <p className="text-center text-muted-foreground py-20">
            Enterprise プランが必要です
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <p className="text-center text-muted-foreground py-20">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !classInfo) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/classes')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            クラス一覧に戻る
          </button>
          <p className="text-center text-destructive py-20">{error}</p>
        </div>
      </div>
    );
  }

  if (!classInfo) return null;

  const isAddingMode = newNames.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/classes')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold">{classInfo.name}</h1>
          <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
            {classInfo.status}
          </span>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-foreground">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              閉じる
            </button>
          </div>
        )}

        {/* クラス情報 */}
        <div className="border border-border rounded-lg p-4 bg-card mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">招待コード</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="font-mono text-lg bg-muted px-3 py-1 rounded text-foreground">
                  {classInfo.inviteCode}
                </code>
                <button
                  onClick={handleCopyInviteCode}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="コピー"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {classInfo.expiresAt && (
              <div>
                <span className="text-muted-foreground">開講期限</span>
                <p className="mt-1 text-foreground">
                  {new Date(classInfo.expiresAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">作成日</span>
              <p className="mt-1 text-foreground">
                {new Date(classInfo.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </div>
        </div>

        {/* 作成結果表示（パスワードは再表示不可） */}
        {createdResult && (
          <div className="mb-6 border border-primary/30 rounded-lg bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-foreground">
                  {createdResult.length}名の生徒を作成しました — パスワードは再表示できません
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadCSV(createdResult)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-border text-foreground hover:bg-accent"
                >
                  <Download className="w-3 h-3" />
                  CSV
                </button>
                <button
                  onClick={handleDismissResult}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="閉じる"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="border border-border rounded bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">名前</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">ログインID</th>
                    <th className="text-left px-4 py-2 text-muted-foreground font-medium">パスワード</th>
                  </tr>
                </thead>
                <tbody>
                  {createdResult.map((s, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 text-foreground">{s.name}</td>
                      <td className="px-4 py-2"><code className="font-mono text-foreground">{s.loginId}</code></td>
                      <td className="px-4 py-2"><code className="font-mono text-foreground">{s.password}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 生徒一覧 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              生徒一覧（{students.length}名）
            </h2>
            {!isAddingMode && (
              <button
                onClick={handleStartAddStudents}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
              >
                <Plus className="w-4 h-4" />
                生徒を追加
              </button>
            )}
          </div>

          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                    {isAddingMode ? '名前' : 'ログインID'}
                  </th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">参加日</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {/* 既存生徒 */}
                {students.map((student) => (
                  <tr key={student.userId} className="border-b border-border">
                    <td className="px-4 py-3">
                      <code className="font-mono text-foreground">{student.loginId}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(student.joinedAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">
                      {deletingStudentId === student.userId ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-destructive">削除しますか？</span>
                          <button
                            onClick={() => handleDeleteStudent(student.userId)}
                            disabled={deletingStudentLoading}
                            className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                          >
                            {deletingStudentLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '削除'}
                          </button>
                          <button
                            onClick={() => setDeletingStudentId(null)}
                            disabled={deletingStudentLoading}
                            className="px-2 py-1 text-xs rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleResetPassword(student.userId)}
                            disabled={resetLoading === student.userId}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-accent disabled:opacity-50"
                            title="パスワードリセット"
                          >
                            {resetLoading === student.userId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <KeyRound className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeletingStudentId(student.userId)}
                            className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-accent"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* PWリセット結果 */}
                      {resetResult?.studentId === student.userId && (
                        <div className="mt-2 p-2 rounded bg-muted text-sm">
                          <p className="text-xs text-muted-foreground mb-1">新しいパスワード:</p>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-foreground">{resetResult.password}</code>
                            <button
                              onClick={handleCopyPassword}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="コピー"
                            >
                              {copiedPassword ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {/* 新規入力行 */}
                {newNames.map((name, index) => (
                  <tr key={`new-${index}`} className="border-b border-border bg-primary/5">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(index, e.target.value)}
                        placeholder="生徒の名前を入力"
                        disabled={addingStudents}
                        className="w-full px-2 py-1 rounded border border-border bg-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                        autoFocus={index === newNames.length - 1}
                      />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">新規</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleRemoveRow(index)}
                        disabled={addingStudents}
                        className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                        title="行を削除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* 行追加・操作ボタン */}
                {isAddingMode && (
                  <tr>
                    <td colSpan={3} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={handleAddRow}
                          disabled={addingStudents || newNames.length >= 40}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          行を追加
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {newNames.filter((n) => n.trim()).length}名
                          </span>
                          <button
                            onClick={handleCancelAdd}
                            disabled={addingStudents}
                            className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={handleSubmitNewStudents}
                            disabled={addingStudents || newNames.every((n) => !n.trim())}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                          >
                            {addingStudents && <Loader2 className="w-3 h-3 animate-spin" />}
                            作成
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 生徒ゼロ + 追加モードでない場合 */}
            {students.length === 0 && !isAddingMode && (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  生徒がまだいません。「生徒を追加」から作成してください。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* クラス削除 */}
        <div className="border-t border-border pt-6">
          {deletingClassConfirm ? (
            <div className="p-4 rounded-md bg-destructive/10 border border-destructive/30">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    本当にこのクラスを削除しますか？
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    クラスに所属する全ての生徒アカウントも削除されます。この操作は取り消せません。
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setDeletingClassConfirm(false)}
                      disabled={deletingClassLoading}
                      className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDeleteClass}
                      disabled={deletingClassLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {deletingClassLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      削除する
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeletingClassConfirm(true)}
              className="px-4 py-2 text-sm rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              クラスを削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
