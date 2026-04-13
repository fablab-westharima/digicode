import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Check,
  AlertTriangle,
  RotateCcw,
  Send,
  Clock,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BlocklyEditor, type BlocklyEditorRef } from '@/components/editor/BlocklyEditor';
import {
  getSubmission,
  gradeSubmission,
  returnSubmission,
  type SubmissionInfo,
} from '@/services/classService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  assignmentId: number;
  submissionId: number | null;
  onChanged: () => void; // 採点・差戻し後に親で一覧再取得
}

function statusDisplay(status: string) {
  switch (status) {
    case 'assigned':
      return { text: '未着手', icon: <Clock className="w-4 h-4" />, color: 'text-muted-foreground' };
    case 'in_progress':
      return { text: '作業中', icon: <FileText className="w-4 h-4" />, color: 'text-primary' };
    case 'submitted':
      return { text: '提出済み', icon: <Send className="w-4 h-4" />, color: 'text-primary' };
    case 'graded':
      return { text: '採点済み', icon: <Check className="w-4 h-4" />, color: 'text-primary' };
    case 'returned':
      return { text: '差戻し', icon: <RotateCcw className="w-4 h-4" />, color: 'text-destructive' };
    default:
      return { text: status, icon: null, color: 'text-muted-foreground' };
  }
}

export function SubmissionViewerDialog({
  open,
  onOpenChange,
  classId,
  assignmentId,
  submissionId,
  onChanged,
}: Props) {
  const blocklyRef = useRef<BlocklyEditorRef>(null);
  const [submission, setSubmission] = useState<SubmissionInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 採点フォーム
  const [scoreInput, setScoreInput] = useState<string>('');
  const [commentInput, setCommentInput] = useState<string>('');
  const [grading, setGrading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // 差戻し確認状態
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [returning, setReturning] = useState(false);

  // submission を取得
  useEffect(() => {
    if (!open || submissionId === null) {
      setSubmission(null);
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setConfirmingReturn(false);
    getSubmission(submissionId)
      .then((sub) => {
        setSubmission(sub);
        setScoreInput(sub.score !== null ? String(sub.score) : '');
        setCommentInput(sub.comment ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'エラーが発生しました'))
      .finally(() => setLoading(false));
  }, [open, submissionId]);

  // Blockly に XML を読み込み + 読み取り専用化 + 中央配置
  useEffect(() => {
    if (!submission || !blocklyRef.current) return;
    // 少し遅延させて Blockly の初期化を待つ
    const timer = setTimeout(() => {
      blocklyRef.current?.loadXml(submission.blocklyXml ?? '<xml></xml>');
      blocklyRef.current?.setReadOnly(true);
      // ツールボックス非表示化後にブロックを中央配置
      requestAnimationFrame(() => {
        blocklyRef.current?.centerView();
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [submission]);

  const handleGrade = async () => {
    if (!submission) return;

    // score バリデーション
    let score: number | null = null;
    if (scoreInput.trim() !== '') {
      const parsed = Number(scoreInput);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        setMessage({ text: 'スコアは 0〜100 の整数で入力してください', type: 'error' });
        return;
      }
      score = parsed;
    }
    const comment = commentInput.trim() === '' ? null : commentInput;

    setGrading(true);
    setMessage(null);
    try {
      await gradeSubmission(classId, assignmentId, submission.id, { score, comment });
      setMessage({ text: '採点して返却しました', type: 'success' });
      onChanged();
      // ダイアログを少し待ってから閉じる
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '採点に失敗しました', type: 'error' });
    } finally {
      setGrading(false);
    }
  };

  const handleReturnConfirm = async () => {
    if (!submission) return;
    setReturning(true);
    setMessage(null);
    try {
      await returnSubmission(classId, assignmentId, submission.id);
      setMessage({ text: '差戻しました', type: 'success' });
      onChanged();
      setTimeout(() => {
        onOpenChange(false);
      }, 800);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '差戻しに失敗しました', type: 'error' });
      setConfirmingReturn(false);
    } finally {
      setReturning(false);
    }
  };

  const canGrade =
    submission && (submission.status === 'submitted' || submission.status === 'graded');
  const canReturn =
    submission && (submission.status === 'submitted' || submission.status === 'graded');
  const busy = grading || returning;
  const st = submission ? statusDisplay(submission.status) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent
        className="max-w-6xl h-[85vh] flex flex-col"
        hideCloseButton={busy}
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            答案の閲覧・採点
            {st && (
              <span className={`flex items-center gap-1 text-sm ${st.color}`}>
                {st.icon}
                {st.text}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : !submission ? null : (
          <div className="flex-1 flex gap-4 min-h-0">
            {/* 左側: Blockly ビューア（読み取り専用） */}
            <div className="flex-1 min-w-0 border border-border rounded-md overflow-hidden relative">
              {(!submission.blocklyXml || submission.blocklyXml === '<xml></xml>') && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 pointer-events-none">
                  <p className="text-sm text-muted-foreground">未着手の答案です</p>
                </div>
              )}
              <BlocklyEditor ref={blocklyRef} />
            </div>

            {/* 右側: 採点パネル */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
              {/* 生徒情報 */}
              <div className="border border-border rounded-md p-3 bg-card">
                <p className="text-xs text-muted-foreground mb-1">生徒</p>
                <p className="text-sm font-medium text-foreground">
                  {submission.studentUserId}
                </p>
                {submission.submittedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    提出: {new Date(submission.submittedAt).toLocaleString('ja-JP')}
                  </p>
                )}
                {submission.gradedAt && (
                  <p className="text-xs text-muted-foreground">
                    採点: {new Date(submission.gradedAt).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>

              {/* 採点フォーム */}
              {canGrade ? (
                <div className="border border-border rounded-md p-3 bg-card space-y-3">
                  <p className="text-sm font-medium text-foreground">採点</p>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      スコア（0-100、空欄可）
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      disabled={busy}
                      className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                      placeholder="85"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      コメント（2000 文字以内）
                    </label>
                    <textarea
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      disabled={busy}
                      maxLength={2000}
                      rows={5}
                      className="w-full px-2 py-1.5 text-sm rounded border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
                      placeholder="よくできました！"
                    />
                    <p className="text-xs text-muted-foreground text-right mt-0.5">
                      {commentInput.length} / 2000
                    </p>
                  </div>
                  <button
                    onClick={handleGrade}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    採点して返却
                  </button>
                </div>
              ) : (
                <div className="border border-border rounded-md p-3 bg-muted">
                  <p className="text-xs text-muted-foreground">
                    {submission.status === 'assigned' || submission.status === 'in_progress'
                      ? 'まだ提出されていないため採点できません。'
                      : submission.status === 'returned'
                      ? 'この答案は差戻し中です。生徒が再提出するまで採点できません。'
                      : '採点できません'}
                  </p>
                </div>
              )}

              {/* 差戻し */}
              {canReturn && !confirmingReturn && (
                <button
                  onClick={() => setConfirmingReturn(true)}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm rounded border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  差戻し
                </button>
              )}

              {/* 差戻し確認（インライン） */}
              {confirmingReturn && (
                <div className="border border-destructive/30 rounded-md p-3 bg-destructive/10 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      生徒が再編集・再提出できる状態に戻します。既存の採点（スコア・コメント）は
                      差戻し中の間は生徒に表示されますが、再提出されるとクリアされます。
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingReturn(false)}
                      disabled={returning}
                      className="flex-1 px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleReturnConfirm}
                      disabled={returning}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {returning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      差戻す
                    </button>
                  </div>
                </div>
              )}

              {/* メッセージ */}
              {message && (
                <div
                  className={`flex items-center gap-2 p-2 rounded-md text-sm ${
                    message.type === 'success'
                      ? 'bg-primary/10 border border-primary/30 text-foreground'
                      : message.type === 'error'
                      ? 'bg-destructive/10 border border-destructive/30 text-foreground'
                      : 'bg-muted border border-border text-foreground'
                  }`}
                >
                  {message.type === 'success' && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  {message.type === 'error' && (
                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                  )}
                  <span className="flex-1">{message.text}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
