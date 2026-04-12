import { useState, useEffect } from 'react';
import { Loader2, FileText, Check, Clock, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { listMySubmissions, type SubmissionInfo } from '@/services/classService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (submission: SubmissionInfo) => void;
}

function statusLabel(status: string) {
  switch (status) {
    case 'assigned': return { text: '未着手', icon: <Clock className="w-3 h-3" />, color: 'text-muted-foreground' };
    case 'in_progress': return { text: '作業中', icon: <FileText className="w-3 h-3" />, color: 'text-primary' };
    case 'submitted': return { text: '提出済み', icon: <Send className="w-3 h-3" />, color: 'text-primary' };
    case 'graded': return { text: '採点済み', icon: <Check className="w-3 h-3" />, color: 'text-primary' };
    default: return { text: status, icon: null, color: 'text-muted-foreground' };
  }
}

export function SubmissionListDialog({ open, onOpenChange, onSelect }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listMySubmissions()
      .then(setSubmissions)
      .catch((err) => setError(err instanceof Error ? err.message : 'エラーが発生しました'))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>課題一覧</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-4">{error}</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            配布された課題はありません
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {submissions.map((sub) => {
              const st = statusLabel(sub.status);
              const isEditable = sub.status !== 'submitted' && sub.status !== 'graded';
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    onSelect(sub);
                    onOpenChange(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {sub.assignmentTitle}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isEditable ? '編集可能' : '閲覧のみ'}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs ${st.color}`}>
                      {st.icon}
                      {st.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
