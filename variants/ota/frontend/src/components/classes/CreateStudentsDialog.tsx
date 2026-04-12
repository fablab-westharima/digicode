import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createStudents, type CreatedStudent } from '@/services/classService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  onCreated: () => void;
}

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

export function CreateStudentsDialog({ open, onOpenChange, classId, onCreated }: Props) {
  const [namesText, setNamesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedStudent[] | null>(null);

  useEffect(() => {
    if (open) {
      setNamesText('');
      setError(null);
      setResult(null);
    }
  }, [open]);

  const names = namesText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const handleCreate = async () => {
    if (names.length === 0) {
      setError('名前を入力してください');
      return;
    }
    if (names.length > 40) {
      setError('1回の作成は40名までです');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await createStudents(classId, names);
      setResult(data.students);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生徒アカウントの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onOpenChange(false);
  };

  const isResultPhase = result !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent
        className={isResultPhase ? 'max-w-2xl' : undefined}
        hideCloseButton={loading}
        onInteractOutside={(e) => {
          if (loading || isResultPhase) e.preventDefault();
        }}
      >
        {!isResultPhase ? (
          <>
            {/* Phase 1: 名前入力 */}
            <DialogHeader>
              <DialogTitle>生徒アカウントを作成</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  生徒の名前（1行に1名）
                </label>
                <textarea
                  value={namesText}
                  onChange={(e) => setNamesText(e.target.value)}
                  placeholder={'田中太郎\n鈴木花子\n佐藤一郎'}
                  rows={8}
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {names.length}名（最大40名）
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <DialogFooter>
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-accent text-sm disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || names.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                作成
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Phase 2: 結果表示 */}
            <DialogHeader>
              <DialogTitle>作成完了（{result.length}名）</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* 警告 */}
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-destructive">重要:</span>{' '}
                    このパスワードは再表示できません。必ず CSV をダウンロードするか、控えてください。
                  </p>
                </div>
              </div>

              {/* テーブル */}
              <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">名前</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">ログインID</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">パスワード</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.map((s, i) => (
                      <tr key={i} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 text-foreground">{s.name}</td>
                        <td className="px-3 py-2">
                          <code className="font-mono text-foreground">{s.loginId}</code>
                        </td>
                        <td className="px-3 py-2">
                          <code className="font-mono text-foreground">{s.password}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <button
                onClick={() => downloadCSV(result)}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-foreground hover:bg-accent text-sm"
              >
                <Download className="w-4 h-4" />
                CSVダウンロード
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
              >
                閉じる
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
