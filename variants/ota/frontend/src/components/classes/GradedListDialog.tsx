import { useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Check,
  RotateCcw,
  ArrowLeft,
  Eye,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BlocklyEditor, type BlocklyEditorRef } from '@/components/editor/BlocklyEditor';
import {
  listMySubmissions,
  getSubmission,
  type SubmissionInfo,
} from '@/services/classService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View = 'list' | 'detail';

export function GradedListDialog({ open, onOpenChange }: Props) {
  const [view, setView] = useState<View>('list');
  const [submissions, setSubmissions] = useState<SubmissionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 詳細表示用
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<SubmissionInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const blocklyRef = useRef<BlocklyEditorRef>(null);

  // 一覧取得
  useEffect(() => {
    if (!open) return;
    setView('list');
    setSelectedId(null);
    setDetail(null);
    setShowAnswer(false);
    setLoading(true);
    setError(null);
    listMySubmissions()
      .then((all) => {
        // 採点済み / 差戻し で score または comment があるものだけ
        const filtered = all.filter(
          (s) =>
            (s.status === 'graded' || s.status === 'returned') &&
            (s.score !== null || s.comment)
        );
        setSubmissions(filtered);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'エラーが発生しました'))
      .finally(() => setLoading(false));
  }, [open]);

  // 詳細表示時: submission 詳細を取得（blocklyXml 含む）
  useEffect(() => {
    if (view !== 'detail' || selectedId === null) return;
    setDetailLoading(true);
    setError(null);
    getSubmission(selectedId)
      .then(setDetail)
      .catch((err) => setError(err instanceof Error ? err.message : '詳細取得に失敗しました'))
      .finally(() => setDetailLoading(false));
  }, [view, selectedId]);

  // 答案表示時: Blockly に XML ロード + 読み取り専用
  useEffect(() => {
    if (!showAnswer || !detail) return;
    const timer = setTimeout(() => {
      blocklyRef.current?.loadXml(detail.blocklyXml ?? '<xml></xml>');
      blocklyRef.current?.setReadOnly(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [showAnswer, detail]);

  const handleSelect = (sub: SubmissionInfo) => {
    setSelectedId(sub.id);
    setView('detail');
    setShowAnswer(false);
  };

  const handleBack = () => {
    setView('list');
    setSelectedId(null);
    setDetail(null);
    setShowAnswer(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={showAnswer ? 'max-w-6xl h-[85vh] flex flex-col' : 'max-w-lg'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === 'detail' && (
              <button
                onClick={handleBack}
                className="p-1 rounded hover:bg-accent"
                title="一覧に戻る"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            採点結果
          </DialogTitle>
        </DialogHeader>

        {/* 一覧ビュー */}
        {view === 'list' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-4">{error}</p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                採点された課題はまだありません
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {submissions.map((sub) => {
                  const isGraded = sub.status === 'graded';
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSelect(sub)}
                      className="w-full text-left p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {sub.assignmentTitle}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span
                              className={`flex items-center gap-1 ${
                                isGraded ? 'text-primary' : 'text-destructive'
                              }`}
                            >
                              {isGraded ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              {isGraded ? '採点済み' : '差戻し'}
                            </span>
                            {sub.gradedAt && (
                              <span className="text-muted-foreground">
                                {new Date(sub.gradedAt).toLocaleDateString('ja-JP')}
                              </span>
                            )}
                          </div>
                        </div>
                        {sub.score !== null && (
                          <div className="flex-shrink-0 text-right">
                            <span className="font-mono font-bold text-lg text-foreground">
                              {sub.score}
                            </span>
                            <span className="text-xs text-muted-foreground"> / 100</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 詳細ビュー */}
        {view === 'detail' && (
          <>
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-4">{error}</p>
            ) : !detail ? null : showAnswer ? (
              // 答案ビュー（BlocklyEditor 読み取り専用）
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <button
                  onClick={() => setShowAnswer(false)}
                  className="self-start flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border text-foreground hover:bg-accent"
                >
                  <ArrowLeft className="w-4 h-4" />
                  採点結果に戻る
                </button>
                <div className="flex-1 min-h-0 border border-border rounded-md overflow-hidden relative">
                  {(!detail.blocklyXml || detail.blocklyXml === '<xml></xml>') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 pointer-events-none">
                      <p className="text-sm text-muted-foreground">答案が空です</p>
                    </div>
                  )}
                  <BlocklyEditor ref={blocklyRef} />
                </div>
              </div>
            ) : (
              // 詳細情報ビュー
              <div className="space-y-4">
                {/* 課題名 */}
                <div className="border border-border rounded-md p-3 bg-muted">
                  <p className="text-xs text-muted-foreground mb-0.5">課題</p>
                  <p className="text-sm font-medium text-foreground">
                    {detail.assignmentTitle}
                  </p>
                  {detail.assignmentDescription && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {detail.assignmentDescription}
                    </p>
                  )}
                </div>

                {/* スコア */}
                {detail.score !== null && (
                  <div
                    className={`border rounded-md p-4 ${
                      detail.status === 'graded'
                        ? 'border-primary/30 bg-primary/10'
                        : 'border-destructive/30 bg-destructive/10'
                    }`}
                  >
                    <p className="text-xs text-muted-foreground mb-0.5">スコア</p>
                    <p className="text-foreground">
                      <span className="font-mono font-bold text-3xl">{detail.score}</span>
                      <span className="text-sm text-muted-foreground"> / 100 点</span>
                    </p>
                  </div>
                )}

                {/* コメント（常に表示、空なら「なし」と明示） */}
                <div className="border border-border rounded-md p-3 bg-card">
                  <p className="text-xs text-muted-foreground mb-1">先生からのコメント</p>
                  {detail.comment ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {detail.comment}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      コメントはありません
                    </p>
                  )}
                </div>

                {/* 日時 */}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {detail.submittedAt && (
                    <p>提出日時: {new Date(detail.submittedAt).toLocaleString('ja-JP')}</p>
                  )}
                  {detail.gradedAt && (
                    <p>採点日時: {new Date(detail.gradedAt).toLocaleString('ja-JP')}</p>
                  )}
                </div>

                {/* 差戻しの注意書き */}
                {detail.status === 'returned' && (
                  <div className="border border-destructive/30 rounded-md p-3 bg-destructive/10">
                    <p className="text-sm text-foreground">
                      この課題は差戻されています。編集して再提出すると、前回の採点は
                      クリアされます。
                    </p>
                  </div>
                )}

                {/* 答案を見るボタン */}
                <button
                  onClick={() => setShowAnswer(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm rounded border border-border text-foreground hover:bg-accent"
                >
                  <Eye className="w-4 h-4" />
                  提出した答案を見る
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
