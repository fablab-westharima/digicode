import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Copy, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { listClasses, type ClassInfo } from '@/services/classService';
import { CreateClassDialog } from '@/components/classes/CreateClassDialog';

export function ClassesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クラス一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.plan === 'enterprise') {
      fetchClasses();
    }
  }, [user?.plan, fetchClasses]);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  // 権限ガード
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
          <div className="text-center py-20">
            <p className="text-lg text-foreground mb-2">クラス管理は Enterprise プラン専用です</p>
            <p className="text-sm text-muted-foreground">
              Enterprise プランにアップグレードすると、クラスの作成・生徒管理が利用できます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold">クラス管理</h1>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
          >
            <Plus className="w-4 h-4" />
            クラスを作成
          </button>
        </div>

        {/* コンテンツ */}
        {loading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-destructive">{error}</p>
            <button
              onClick={fetchClasses}
              className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
            >
              再試行
            </button>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">
              クラスがまだありません。「クラスを作成」から始めましょう。
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                onClick={() => navigate(`/classes/${cls.id}`)}
                className="border border-border rounded-lg p-4 bg-card hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{cls.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">クラスコード:</span>
                        <code className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-foreground">
                          {cls.inviteCode}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCode(cls.inviteCode);
                          }}
                          className="p-1 text-muted-foreground hover:text-foreground"
                          title="コピー"
                        >
                          {copiedCode === cls.inviteCode ? (
                            <Check className="w-3 h-3 text-primary" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      {cls.expiresAt && (
                        <span className="text-xs text-muted-foreground">
                          期限: {new Date(cls.expiresAt).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                      {cls.classType === 'workshop' ? 'WS' : '教室'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                      {cls.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateClassDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={fetchClasses}
      />
    </div>
  );
}
