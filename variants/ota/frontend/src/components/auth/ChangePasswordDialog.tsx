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
import { fetchWithAuth } from '@/lib/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) {
      setError(t('changePassword.allFieldsRequired'));
      return;
    }
    if (newPassword.length < 4) {
      setError(t('changePassword.tooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.mismatch'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('changePassword.error'));
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('changePassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent
        hideCloseButton={loading}
        onInteractOutside={(e) => { if (loading) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{t('changePassword.title')}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{t('changePassword.success')}</p>
            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
              >
                {t('changePassword.close')}
              </button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('changePassword.currentPassword')}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('changePassword.newPassword')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('changePassword.confirmPassword')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 rounded-md border border-border bg-input text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <button
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-accent text-sm disabled:opacity-50"
              >
                {t('changePassword.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('changePassword.submit')}
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
