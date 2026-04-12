import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClass } from '@/services/classService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateClassDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setExpiresAt('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('クラス名を入力してください');
      return;
    }
    if (trimmed.length > 100) {
      setError('クラス名は100文字以内にしてください');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createClass(trimmed, undefined, expiresAt || undefined);
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クラスの作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent
        hideCloseButton={loading}
        onInteractOutside={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>新しいクラスを作成</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* クラス名 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              クラス名 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 3年B組 プログラミング"
              maxLength={100}
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {name.length}/100
            </p>
          </div>

          {/* 開講期限 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              開講期限（任意）
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
          </div>

          {/* エラー */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-accent text-sm disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            作成
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
