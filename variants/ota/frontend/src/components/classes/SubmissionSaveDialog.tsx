import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Send, Clock, FileText, Check, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { SubmissionInfo } from '@/services/classService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubmissionInfo | null;
  isDirty: boolean;
  onSave: () => Promise<void>;
  onSubmit: () => Promise<void>;
}

function statusDisplay(status: string, t: (key: string) => string) {
  switch (status) {
    case 'assigned': return { text: t('submissions.status.assigned'), icon: <Clock className="w-4 h-4" />, color: 'text-muted-foreground' };
    case 'in_progress': return { text: t('submissions.status.inProgress'), icon: <FileText className="w-4 h-4" />, color: 'text-primary' };
    case 'submitted': return { text: t('submissions.status.submitted'), icon: <Check className="w-4 h-4" />, color: 'text-primary' };
    case 'graded': return { text: t('submissions.status.graded'), icon: <Check className="w-4 h-4" />, color: 'text-primary' };
    case 'returned': return { text: t('submissions.status.returned'), icon: <RotateCcw className="w-4 h-4" />, color: 'text-destructive' };
    default: return { text: status, icon: null, color: 'text-muted-foreground' };
  }
}

export function SubmissionSaveDialog({ open, onOpenChange, submission, isDirty, onSave, onSubmit }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (open) {
      setMessage(null);
    }
  }, [open]);

  if (!submission) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('submissions.save.title')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            {t('submissions.save.noAssignment')}
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const isReadOnly = submission.status === 'submitted' || submission.status === 'graded';
  const st = statusDisplay(submission.status, t);

  const handleSave = async () => {
    if (isReadOnly) {
      setMessage({ text: t('submissions.save.readOnly'), type: 'error' });
      return;
    }
    if (!isDirty) {
      setMessage({ text: t('submissions.save.noChanges'), type: 'info' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await onSave();
      setMessage({ text: t('submissions.save.saved'), type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : t('submissions.save.saveError'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (isReadOnly) {
      setMessage({ text: t('submissions.save.alreadySubmitted'), type: 'error' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit();
      setMessage({ text: t('submissions.save.submitted'), type: 'success' });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : t('submissions.save.submitError'), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && !submitting && onOpenChange(v)}>
      <DialogContent
        hideCloseButton={saving || submitting}
        onInteractOutside={(e) => { if (saving || submitting) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{t('submissions.save.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 課題情報 */}
          <div className="border border-border rounded-md p-3 bg-muted">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{submission.assignmentTitle}</p>
                {submission.assignmentDescription && (
                  <p className="text-xs text-muted-foreground mt-0.5">{submission.assignmentDescription}</p>
                )}
              </div>
              <span className={`flex items-center gap-1 text-xs ${st.color}`}>
                {st.icon}
                {st.text}
              </span>
            </div>
          </div>

          {/* 採点結果 / 差戻しフィードバック */}
          {(submission.status === 'graded' || submission.status === 'returned') &&
            (submission.score !== null || submission.comment) && (
              <div
                className={`border rounded-md p-3 ${
                  submission.status === 'graded'
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-destructive/30 bg-destructive/10'
                }`}
              >
                <p className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                  {submission.status === 'graded' ? (
                    <>
                      <Check className="w-4 h-4 text-primary" />
                      {t('submissions.save.gradedResult')}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 text-destructive" />
                      {t('submissions.save.returnedFeedback')}
                    </>
                  )}
                </p>
                {submission.score !== null && (
                  <p className="text-sm text-foreground">
                    {t('submissions.save.score', { score: submission.score })}
                  </p>
                )}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-0.5">{t('submissions.save.teacherComment')}</p>
                  {submission.comment ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {submission.comment}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {t('submissions.save.noComment')}
                    </p>
                  )}
                </div>
                {submission.gradedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('submissions.save.gradedAt', { date: new Date(submission.gradedAt).toLocaleString('ja-JP') })}
                  </p>
                )}
                {submission.status === 'returned' && (
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                    {t('submissions.save.resubmitNote')}
                  </p>
                )}
              </div>
            )}

          {/* メッセージエリア */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-primary/10 border border-primary/30 text-foreground'
                : message.type === 'error'
                ? 'bg-destructive/10 border border-destructive/30 text-foreground'
                : 'bg-muted border border-border text-foreground'
            }`}>
              {message.type === 'success' && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
              {message.type === 'error' && <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />}
              {message.text}
            </div>
          )}

          {/* 操作ボタン */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || submitting || isReadOnly}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border text-foreground hover:bg-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('submissions.save.saveBtn')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || submitting || isReadOnly}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('submissions.save.submitBtn')}
            </button>
          </div>

          {/* 提出済みの注意書き */}
          {isReadOnly && (
            <p className="text-xs text-muted-foreground text-center">
              {t('submissions.save.submittedReadOnly')}
            </p>
          )}
          {!isReadOnly && (
            <p className="text-xs text-muted-foreground text-center">
              {t('submissions.save.submitWarning')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
