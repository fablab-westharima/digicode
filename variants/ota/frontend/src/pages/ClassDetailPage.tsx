import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, Check, Loader2, AlertTriangle,
  KeyRound, Trash2, Plus, Download, X,
  FileText, Send, Upload, Paperclip, BarChart3, Archive, CopyPlus,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { fetchWithAuth } from '@/lib/api';
import {
  getClass,
  listStudents,
  deleteClass,
  deleteStudent,
  resetStudentPassword,
  createStudents,
  listAssignments,
  createAssignment,
  deleteAssignment,
  distributeAssignment,
  exportClass,
  duplicateClass,
  daysUntilExpiry,
  type ClassInfo,
  type StudentInfo,
  type AssignmentInfo,
} from '@/services/classService';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadStudentsCsv(students: StudentInfo[], className: string) {
  const header = '名前,ログインID,初期パスワード\n';
  const rows = students.map((s) =>
    `${s.displayName || ''},${s.loginId},${s.password || ''}`
  ).join('\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + header + rows], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `${className}_students_${new Date().toISOString().slice(0, 10)}.csv`);
}

function downloadStudentsHtml(students: StudentInfo[], className: string) {
  const date = new Date().toLocaleDateString('ja-JP');
  const rows = students.map((s) =>
    `      <tr>
        <td>${s.displayName || ''}</td>
        <td>${s.loginId}</td>
        <td>${s.password || ''}</td>
      </tr>`
  ).join('\n');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${className} — 生徒一覧</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; color: #222; }
    h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
    p { font-size: 0.85rem; color: #666; margin-bottom: 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    td:nth-child(2), td:nth-child(3) { font-family: monospace; }
  </style>
</head>
<body>
  <h1>${className} — 生徒一覧</h1>
  <p>出力日: ${date}</p>
  <table>
    <thead>
      <tr><th>名前</th><th>ログインID</th><th>パスワード</th></tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, `${className}_students_${new Date().toISOString().slice(0, 10)}.html`);
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

  // インライン確認状態
  const [deletingClassConfirm, setDeletingClassConfirm] = useState(false);
  const [deletingClassLoading, setDeletingClassLoading] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<number | null>(null);
  const [deletingStudentLoading, setDeletingStudentLoading] = useState(false);

  // PWリセット
  const [resetLoading, setResetLoading] = useState<number | null>(null);

  // 課題
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '' });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<number | null>(null);
  const [deletingAssignmentLoading, setDeletingAssignmentLoading] = useState(false);
  const [distributingId, setDistributingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportConfirm, setExportConfirm] = useState(false);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [duplicating, setDuplicating] = useState(false);

  const classId = id ? parseInt(id) : NaN;

  const fetchData = useCallback(async () => {
    if (isNaN(classId)) return;
    setLoading(true);
    setError(null);
    try {
      const [cls, studs, assigns] = await Promise.all([
        getClass(classId),
        listStudents(classId),
        listAssignments(classId).catch(() => [] as AssignmentInfo[]),
      ]);
      setClassInfo(cls);
      setStudents(studs);
      setAssignments(assigns);
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
      await createStudents(classId, validNames);
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

  // --- 生徒操作 ---

  const handleDeleteStudent = async (studentId: number) => {
    setDeletingStudentLoading(true);
    try {
      await deleteStudent(classId, studentId);
      setStudents((prev) => prev.filter((s) => s.userId !== studentId));
      setDeletingStudentId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生徒の削除に失敗しました');
    } finally {
      setDeletingStudentLoading(false);
    }
  };

  const handleResetPassword = async (studentId: number) => {
    setResetLoading(studentId);
    try {
      await resetStudentPassword(classId, studentId);
      // リフェッチで新PWが表示される（plain_password が更新されるため）
      const studs = await listStudents(classId);
      setStudents(studs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'パスワードリセットに失敗しました');
    } finally {
      setResetLoading(null);
    }
  };

  // --- 課題操作 ---

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim()) {
      setError('課題タイトルを入力してください');
      return;
    }

    setCreatingAssignment(true);
    setError(null);
    try {
      let attachment: string | undefined;
      let attachmentFilename: string | undefined;

      if (attachmentFile) {
        if (attachmentFile.size > 2 * 1024 * 1024) {
          setError('添付ファイルは2MB以内にしてください');
          setCreatingAssignment(false);
          return;
        }
        // FileReader で Base64 に変換（btoa + スプレッドはスタックオーバーフロー）
        attachment = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            // "data:application/pdf;base64,XXXX" から Base64 部分を取り出す
            resolve(dataUrl.split(',')[1]);
          };
          reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
          reader.readAsDataURL(attachmentFile);
        });
        attachmentFilename = attachmentFile.name;
      }

      // 期限は完全な YYYY-MM-DD 形式のときのみ送信（部分入力は無視）
      const validDueDate = /^\d{4}-\d{2}-\d{2}$/.test(newAssignment.dueDate)
        ? newAssignment.dueDate
        : undefined;

      await createAssignment(classId, {
        title: newAssignment.title.trim(),
        description: newAssignment.description.trim() || undefined,
        dueDate: validDueDate,
        attachment,
        attachmentFilename,
      });

      setShowCreateAssignment(false);
      setNewAssignment({ title: '', description: '', dueDate: '' });
      setAttachmentFile(null);
      const assigns = await listAssignments(classId);
      setAssignments(assigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : '課題の作成に失敗しました');
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    setDeletingAssignmentLoading(true);
    try {
      await deleteAssignment(classId, assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      setDeletingAssignmentId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '課題の削除に失敗しました');
    } finally {
      setDeletingAssignmentLoading(false);
    }
  };

  const handleDistribute = async (assignmentId: number) => {
    setDistributingId(assignmentId);
    setError(null);
    try {
      const result = await distributeAssignment(classId, assignmentId);
      setError(null);
      if (result.distributed === 0) {
        alert('既に全員に配布済みです');
      } else {
        alert(`${result.distributed}名に配布しました（全${result.total}名）`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '課題の配布に失敗しました');
    } finally {
      setDistributingId(null);
    }
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

        {/* 期限前警告バナー（Step 8 scope B） */}
        {(() => {
          const days = daysUntilExpiry(classInfo.expiresAt);
          if (days === null) return null;
          if (days < 0) {
            return (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    このクラスは開講期限を過ぎています
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    毎日深夜 00:00 の自動処理で削除されます。必要なデータは事前にダウンロードしてください。
                  </p>
                </div>
              </div>
            );
          }
          if (days <= 7) {
            return (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    開講期限まで残り {days} 日です
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    期限到達後、毎日深夜 00:00 の自動処理でクラスと関連データが削除されます。
                  </p>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* クラス情報 */}
        <div className="border border-border rounded-lg p-4 bg-card mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">クラスコード</span>
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

        {/* 生徒一覧 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              生徒一覧（{students.length}名）
            </h2>
            <div className="flex items-center gap-2">
              {students.length > 0 && (
                <>
                  <button
                    onClick={() => downloadStudentsCsv(students, classInfo.name)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                  <button
                    onClick={() => downloadStudentsHtml(students, classInfo.name)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent"
                  >
                    <Download className="w-4 h-4" />
                    HTML
                  </button>
                </>
              )}
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
          </div>

          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">名前</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">ログインID</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">初期パスワード</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">参加日</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {/* 既存生徒 */}
                {students.map((student) => (
                  <tr key={student.userId} className="border-b border-border">
                    <td className="px-4 py-3 text-foreground">
                      {student.displayName || ''}
                    </td>
                    <td className="px-4 py-3">
                      <code className="font-mono text-foreground">{student.loginId}</code>
                    </td>
                    <td className="px-4 py-3">
                      {student.password ? (
                        <code className="font-mono text-foreground">{student.password}</code>
                      ) : (
                        <span className="text-muted-foreground text-xs">生徒変更済み</span>
                      )}
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
                    <td className="px-4 py-2 text-muted-foreground text-xs" colSpan={3}>自動生成</td>
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
                    <td colSpan={5} className="px-4 py-3">
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

        {/* 課題一覧 */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              課題（{assignments.length}件）
            </h2>
            {!showCreateAssignment && (
              <button
                onClick={() => setShowCreateAssignment(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
              >
                <Plus className="w-4 h-4" />
                課題を作成
              </button>
            )}
          </div>

          {/* 課題作成フォーム */}
          {showCreateAssignment && (
            <div className="border border-border rounded-lg p-4 bg-card mb-3">
              <h3 className="text-sm font-medium text-foreground mb-3">新しい課題</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">タイトル *</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="例: LED点滅プログラム"
                    disabled={creatingAssignment}
                    className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">説明（任意）</label>
                  <textarea
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="課題の説明や指示"
                    rows={3}
                    disabled={creatingAssignment}
                    className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">期限（任意）</label>
                  {(() => {
                    // dueDate は 'YYYY-MM-DD' 形式、または空文字
                    const parts = newAssignment.dueDate.split('-');
                    const selYear = parts[0] || '';
                    const selMonth = parts[1] || '';
                    const selDay = parts[2] || '';
                    const currentYear = new Date().getFullYear();
                    const years = [currentYear, currentYear + 1];
                    const months = Array.from({ length: 12 }, (_, i) => i + 1);
                    const daysInMonth =
                      selYear && selMonth
                        ? new Date(parseInt(selYear), parseInt(selMonth), 0).getDate()
                        : 31;
                    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                    const update = (y: string, m: string, d: string) => {
                      if (!y && !m && !d) {
                        setNewAssignment((prev) => ({ ...prev, dueDate: '' }));
                        return;
                      }
                      if (y && m && d) {
                        // 日が月末を超えていたら月末に丸める
                        const maxDay = new Date(parseInt(y), parseInt(m), 0).getDate();
                        const dd = Math.min(parseInt(d), maxDay);
                        setNewAssignment((prev) => ({
                          ...prev,
                          dueDate: `${y}-${m.padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
                        }));
                      } else {
                        // 部分入力（3 つ揃うまでは保存しない、UI 状態として保持するため便宜的に中間表現）
                        setNewAssignment((prev) => ({
                          ...prev,
                          dueDate: `${y}-${m}-${d}`,
                        }));
                      }
                    };

                    const selectClass =
                      'px-2 py-2 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50';

                    return (
                      <div className="flex items-center gap-2">
                        <select
                          value={selYear}
                          onChange={(e) => update(e.target.value, selMonth, selDay)}
                          disabled={creatingAssignment}
                          className={selectClass}
                        >
                          <option value="">年</option>
                          {years.map((y) => (
                            <option key={y} value={String(y)}>
                              {y}年
                            </option>
                          ))}
                        </select>
                        <select
                          value={selMonth}
                          onChange={(e) => update(selYear, e.target.value, selDay)}
                          disabled={creatingAssignment}
                          className={selectClass}
                        >
                          <option value="">月</option>
                          {months.map((m) => (
                            <option key={m} value={String(m).padStart(2, '0')}>
                              {m}月
                            </option>
                          ))}
                        </select>
                        <select
                          value={selDay}
                          onChange={(e) => update(selYear, selMonth, e.target.value)}
                          disabled={creatingAssignment}
                          className={selectClass}
                        >
                          <option value="">日</option>
                          {days.map((d) => (
                            <option key={d} value={String(d).padStart(2, '0')}>
                              {d}日
                            </option>
                          ))}
                        </select>
                        {newAssignment.dueDate && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewAssignment((prev) => ({ ...prev, dueDate: '' }))
                            }
                            disabled={creatingAssignment}
                            className="ml-1 p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-accent disabled:opacity-50"
                            title="期限をクリア"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground mt-1">
                    期限を設定すると、生徒の課題一覧と管理者のダッシュボードで表示されます
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    課題PDF（任意、2MBまで）
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded border border-border text-foreground hover:bg-accent text-sm cursor-pointer">
                      <Upload className="w-4 h-4" />
                      ファイルを選択
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                        disabled={creatingAssignment}
                      />
                    </label>
                    {attachmentFile && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(0)}KB)
                        <button onClick={() => setAttachmentFile(null)} className="text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowCreateAssignment(false);
                      setNewAssignment({ title: '', description: '', dueDate: '' });
                      setAttachmentFile(null);
                    }}
                    disabled={creatingAssignment}
                    className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCreateAssignment}
                    disabled={creatingAssignment || !newAssignment.title.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {creatingAssignment && <Loader2 className="w-3 h-3 animate-spin" />}
                    作成
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 課題一覧テーブル */}
          {assignments.length === 0 && !showCreateAssignment ? (
            <div className="border border-border rounded-lg p-8 bg-card text-center">
              <p className="text-muted-foreground">
                課題がまだありません。「課題を作成」から始めましょう。
              </p>
            </div>
          ) : assignments.length > 0 && (
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">タイトル</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">添付</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">期限</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">作成日</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3">
                        <p className="text-foreground font-medium">{assignment.title}</p>
                        {assignment.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{assignment.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {assignment.attachmentFilename ? (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetchWithAuth(
                                  `/api/classes/${classId}/assignments/${assignment.id}/attachment`
                                );
                                if (!res.ok) throw new Error('ダウンロードに失敗しました');
                                const blob = await res.blob();
                                triggerDownload(blob, assignment.attachmentFilename || 'attachment.pdf');
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'ダウンロードに失敗しました');
                              }
                            }}
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            {assignment.attachmentFilename}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {assignment.dueDate ? (
                          (() => {
                            const days = Math.ceil(
                              (new Date(assignment.dueDate).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24)
                            );
                            const dateStr = new Date(assignment.dueDate).toLocaleDateString('ja-JP');
                            if (days < 0) {
                              return (
                                <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                  <AlertTriangle className="w-3 h-3" />
                                  {dateStr}（期限切れ）
                                </span>
                              );
                            }
                            if (days <= 3) {
                              return (
                                <span className="text-xs text-destructive">
                                  {dateStr}（あと {days} 日）
                                </span>
                              );
                            }
                            return (
                              <span className="text-xs text-muted-foreground">{dateStr}</span>
                            );
                          })()
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(assignment.createdAt).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-4 py-3">
                        {deletingAssignmentId === assignment.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-destructive">削除しますか？</span>
                            <button
                              onClick={() => handleDeleteAssignment(assignment.id)}
                              disabled={deletingAssignmentLoading}
                              className="px-2 py-1 text-xs rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                            >
                              {deletingAssignmentLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : '削除'}
                            </button>
                            <button
                              onClick={() => setDeletingAssignmentId(null)}
                              disabled={deletingAssignmentLoading}
                              className="px-2 py-1 text-xs rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDistribute(assignment.id)}
                              disabled={distributingId === assignment.id}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                              title="生徒に配布"
                            >
                              {distributingId === assignment.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              配布
                            </button>
                            <button
                              onClick={() => navigate(`/classes/${classId}/assignments/${assignment.id}/submissions`)}
                              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-foreground hover:bg-accent"
                              title="進捗確認・答案閲覧・採点"
                            >
                              <BarChart3 className="w-3 h-3" />
                              進捗
                            </button>
                            <button
                              onClick={() => setDeletingAssignmentId(assignment.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-accent"
                              title="削除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* クラス複製 & 記録保存 & 削除 */}
        <div className="border-t border-border pt-6">
          {duplicateConfirm ? (
            <div className="p-4 rounded-md bg-accent border border-border">
              <div className="flex items-start gap-3">
                <CopyPlus className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    このクラスを複製します
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    課題テンプレート・添付PDFをコピーして新しいクラスを作成します。
                    生徒や答案は複製されません。
                  </p>
                  <div className="mt-3">
                    <input
                      type="text"
                      value={duplicateName}
                      onChange={(e) => setDuplicateName(e.target.value)}
                      placeholder="新しいクラス名を入力"
                      maxLength={100}
                      disabled={duplicating}
                      className="w-full px-3 py-1.5 text-sm rounded border border-border bg-background text-foreground placeholder:text-muted-foreground disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {duplicateName.length}/100
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setDuplicateConfirm(false);
                        setDuplicateName('');
                      }}
                      disabled={duplicating}
                      className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        if (!duplicateName.trim()) return;
                        setDuplicating(true);
                        setError(null);
                        try {
                          const newClass = await duplicateClass(classId, duplicateName.trim());
                          setDuplicateConfirm(false);
                          setDuplicateName('');
                          navigate(`/classes/${newClass.id}`);
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : 'クラスの複製に失敗しました',
                          );
                        } finally {
                          setDuplicating(false);
                        }
                      }}
                      disabled={duplicating || !duplicateName.trim()}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {duplicating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CopyPlus className="w-3 h-3" />
                      )}
                      複製する
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : exportConfirm ? (
            <div className="p-4 rounded-md bg-accent border border-border">
              <div className="flex items-start gap-3">
                <Archive className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    クラス記録を保存します
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    このZIPは<strong className="text-foreground">成績記録と答案のスナップショット</strong>です。
                    課題テンプレート・添付PDF・生徒一覧・答案・採点結果・コメントを含みます。
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ※ このファイルを DigiCode へ再インポートしてクラスを復元することは
                    <strong className="text-foreground">できません</strong>。
                    同じ教材で新しいクラスを始めるには「このクラスを複製」をご利用ください。
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setExportConfirm(false)}
                      disabled={exporting}
                      className="px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        setExporting(true);
                        setError(null);
                        try {
                          await exportClass(classId, classInfo.name);
                          setExportConfirm(false);
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : '記録の保存に失敗しました',
                          );
                        } finally {
                          setExporting(false);
                        }
                      }}
                      disabled={exporting}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {exporting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Archive className="w-3 h-3" />
                      )}
                      保存する
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : deletingClassConfirm ? (
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
                  <p className="text-sm text-muted-foreground mt-1">
                    必要に応じて、削除前に「クラス記録を保存」で成績記録を手元に保管してください。
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDuplicateConfirm(true);
                  setDuplicateName('');
                }}
                className="flex items-center gap-1 px-4 py-2 text-sm rounded border border-border text-foreground hover:bg-accent"
                title="課題テンプレートをコピーして新しいクラスを作成します"
              >
                <CopyPlus className="w-4 h-4" />
                このクラスを複製
              </button>
              <button
                onClick={() => setExportConfirm(true)}
                className="flex items-center gap-1 px-4 py-2 text-sm rounded border border-border text-foreground hover:bg-accent"
                title="成績記録・答案・添付PDFを ZIP で保存します（再インポート不可）"
              >
                <Archive className="w-4 h-4" />
                クラス記録を保存
              </button>
              <button
                onClick={() => setDeletingClassConfirm(true)}
                className="px-4 py-2 text-sm rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                クラスを削除
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
