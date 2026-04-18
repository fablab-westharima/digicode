import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [classType, setClassType] = useState('workshop');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setClassType('workshop');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('classes.createDialog.nameRequired'));
      return;
    }
    if (trimmed.length > 100) {
      setError(t('classes.createDialog.nameTooLong'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createClass(trimmed, classType);
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('classes.createDialog.error'));
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
          <DialogTitle>{t('classes.createDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* クラス名 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('classes.createDialog.name')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('classes.createDialog.namePlaceholder')}
              maxLength={100}
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {name.length}/100
            </p>
          </div>

          {/* クラス種別 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('classes.createDialog.classType')} <span className="text-destructive">*</span>
            </label>
            <select
              value={classType}
              onChange={(e) => setClassType(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="workshop">{t('classes.createDialog.typeWorkshop')}</option>
              <option value="classroom">{t('classes.createDialog.typeClassroom')}</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {t('classes.createDialog.autoExpiry')}
            </p>
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
            {t('classes.createDialog.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('classes.createDialog.create')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
