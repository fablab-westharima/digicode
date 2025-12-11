import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Fingerprint, Trash2, Loader2, AlertCircle, Plus } from 'lucide-react';
import {
  listPasskeys,
  deletePasskey,
  type PasskeyInfo,
} from '@/services/passkeyService';
import { PasskeyRegisterDialog } from './PasskeyRegisterDialog';

interface PasskeyManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasskeyManagementDialog({ open, onOpenChange }: PasskeyManagementDialogProps) {
  const { t } = useTranslation();
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  const loadPasskeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listPasskeys();
      setPasskeys(data);
    } catch (err) {
      console.error('Failed to load passkeys:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load passkeys'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPasskeys();
    }
  }, [open]);

  const handleDelete = async (id: number) => {
    if (!confirm(t('auth.passkey.confirmDelete'))) {
      return;
    }

    setDeletingId(id);
    try {
      await deletePasskey(id);
      // Reload passkeys after deletion
      await loadPasskeys();
    } catch (err) {
      console.error('Failed to delete passkey:', err);
      setError(
        err instanceof Error ? err.message : t('auth.passkey.deleteError')
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegisterClose = () => {
    setShowRegisterDialog(false);
    // Reload passkeys after registration
    loadPasskeys();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('auth.passkey.neverUsed');
    // D1 datetime('now') returns UTC time without 'Z' suffix, so we add it
    const utcDateString = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    return new Date(utcDateString).toLocaleString();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              {t('auth.passkey.managePasskeys')}
            </DialogTitle>
            <DialogDescription>
              {t('auth.passkey.passkeyList')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : passkeys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Fingerprint className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('auth.passkey.noPasskeys')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {passkeys.map((passkey) => (
                  <Card key={passkey.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Fingerprint className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {passkey.deviceName || `Passkey #${passkey.id}`}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            <p>
                              {t('auth.passkey.createdAt')}: {formatDate(passkey.createdAt)}
                            </p>
                            <p>
                              {t('auth.passkey.lastUsedAt')}: {formatDate(passkey.lastUsedAt)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(passkey.id)}
                          disabled={deletingId === passkey.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          {deletingId === passkey.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t('common.delete')}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Button
              onClick={() => setShowRegisterDialog(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('auth.passkey.registerNewPasskey')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PasskeyRegisterDialog
        open={showRegisterDialog}
        onOpenChange={handleRegisterClose}
      />
    </>
  );
}
