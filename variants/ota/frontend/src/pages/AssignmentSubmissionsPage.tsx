import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Send,
  RotateCcw,
  Eye,
} from 'lucide-react';
import {
  listAssignmentSubmissions,
  getAssignment,
  type AssignmentSubmissionRow,
  type AssignmentInfo,
} from '@/services/classService';
import { SubmissionViewerDialog } from '@/components/classes/SubmissionViewerDialog';

function statusDisplay(status: string, t: (key: string) => string) {
  switch (status) {
    case 'assigned':
      return { text: t('submissions.status.assigned'), icon: <Clock className="w-3 h-3" />, color: 'text-muted-foreground' };
    case 'in_progress':
      return { text: t('submissions.status.inProgress'), icon: <FileText className="w-3 h-3" />, color: 'text-primary' };
    case 'submitted':
      return { text: t('submissions.status.submitted'), icon: <Send className="w-3 h-3" />, color: 'text-primary' };
    case 'graded':
      return { text: t('submissions.status.graded'), icon: <Check className="w-3 h-3" />, color: 'text-primary' };
    case 'returned':
      return { text: t('submissions.status.returned'), icon: <RotateCcw className="w-3 h-3" />, color: 'text-destructive' };
    default:
      return { text: status, icon: null, color: 'text-muted-foreground' };
  }
}

export function AssignmentSubmissionsPage() {
  const { classId: classIdStr, assignmentId: assignmentIdStr } = useParams<{
    classId: string;
    assignmentId: string;
  }>();
  const classId = classIdStr ? parseInt(classIdStr) : NaN;
  const assignmentId = assignmentIdStr ? parseInt(assignmentIdStr) : NaN;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewingId, setViewingId] = useState<number | null>(null);

  const load = async () => {
    if (isNaN(classId) || isNaN(assignmentId)) {
      setError(t('submissions.progress.urlError'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [asn, subs] = await Promise.all([
        getAssignment(classId, assignmentId),
        listAssignmentSubmissions(classId, assignmentId),
      ]);
      setAssignment(asn);
      setSubmissions(subs);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('submissions.progress.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, assignmentId]);

  // 集計（ダッシュボード表示用）
  const counts = {
    total: submissions.length,
    submitted: submissions.filter((s) => s.status === 'submitted').length,
    graded: submissions.filter((s) => s.status === 'graded').length,
    returned: submissions.filter((s) => s.status === 'returned').length,
    inProgress: submissions.filter((s) => s.status === 'in_progress').length,
    assigned: submissions.filter((s) => s.status === 'assigned').length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/classes/${classId}`)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('submissions.progress.backToClass')}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="border border-destructive/30 rounded-md p-4 bg-destructive/10">
            <p className="text-sm text-foreground">{error}</p>
          </div>
        ) : (
          <>
            {/* 課題情報 */}
            <div className="border border-border rounded-lg p-4 bg-card">
              <h1 className="text-xl font-bold text-foreground">
                {assignment?.title ?? t('submissions.progress.assignment')}
              </h1>
              {assignment?.description && (
                <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
              )}
            </div>

            {/* 進捗サマリー */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryCard label={t('submissions.progress.all')} value={counts.total} color="text-foreground" />
              <SummaryCard label={t('submissions.progress.assigned')} value={counts.assigned} color="text-muted-foreground" />
              <SummaryCard label={t('submissions.progress.inProgress')} value={counts.inProgress} color="text-primary" />
              <SummaryCard
                label={t('submissions.progress.submitted')}
                value={counts.submitted + counts.graded + counts.returned}
                color="text-primary"
              />
              <SummaryCard label={t('submissions.progress.gradedShort')} value={counts.graded} color="text-primary" />
            </div>

            {/* 生徒一覧テーブル */}
            {submissions.length === 0 ? (
              <div className="border border-border rounded-lg p-8 bg-card text-center">
                <p className="text-muted-foreground">{t('submissions.progress.empty')}</p>
              </div>
            ) : (
              <div className="border border-border rounded-lg bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('submissions.progress.student')}</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('submissions.progress.status')}</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('submissions.progress.score')}</th>
                      <th className="text-left px-4 py-3 text-muted-foreground font-medium">{t('submissions.progress.submittedAt')}</th>
                      <th className="text-right px-4 py-3 text-muted-foreground font-medium">{t('submissions.progress.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((sub) => {
                      const st = statusDisplay(sub.status, t);
                      return (
                        <tr key={sub.id} className="border-b border-border last:border-b-0">
                          <td className="px-4 py-3">
                            <p className="text-foreground font-medium">
                              {sub.studentDisplayName || sub.studentEmail || `#${sub.studentUserId}`}
                            </p>
                            {sub.studentDisplayName && sub.studentEmail && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {sub.studentEmail}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 text-xs ${st.color}`}>
                              {st.icon}
                              {st.text}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {sub.score !== null ? (
                              <span className="font-mono">{sub.score}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {sub.submittedAt
                              ? new Date(sub.submittedAt).toLocaleString('ja-JP')
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end">
                              <button
                                onClick={() => setViewingId(sub.id)}
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-foreground hover:bg-accent"
                                title={t('submissions.viewer.viewGrade')}
                              >
                                <Eye className="w-3 h-3" />
                                {t('submissions.viewer.viewGradeShort')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* 閲覧・採点ダイアログ */}
      <SubmissionViewerDialog
        open={viewingId !== null}
        onOpenChange={(v) => {
          if (!v) setViewingId(null);
        }}
        classId={classId}
        assignmentId={assignmentId}
        submissionId={viewingId}
        onChanged={() => void load()}
      />
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-border rounded-md p-3 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color} mt-0.5`}>{value}</p>
    </div>
  );
}
