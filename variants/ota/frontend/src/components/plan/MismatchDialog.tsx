/**
 * MismatchDialog — state (C) for the §6a.3 PlanPage state machine.
 *
 * Shown when the user has an active subscription on one provider but
 * the backend's `expectedProvider` (derived from CF-IPCountry for the
 * current request) points at a different one. We refuse to start a
 * new checkout on a different provider because that would create a
 * duplicate subscription — see plan 58 §6a for the full rationale.
 *
 * The dialog has two outs:
 *   - "Go to cancellation" → POST /api/subscriptions/portal, redirect to
 *     the provider's hosted Customer Portal. The user cancels there,
 *     comes back via the portal's return_url, and PlanPage transitions
 *     to state (A) once the cancellation propagates.
 *   - "Dismiss" → close the dialog, no state change.
 */

import { useTranslation } from 'react-i18next';
import { ExternalLink, Loader2 } from 'lucide-react';
import type { ProviderId } from '@/services/subscriptionService';

interface MismatchDialogProps {
  currentProvider: ProviderId;
  expectedProvider: ProviderId;
  onCancellationRedirect: () => void;
  onDismiss: () => void;
  /** When true, the cancellation button shows a spinner and is disabled. */
  redirecting?: boolean;
}

export function MismatchDialog({
  currentProvider,
  expectedProvider,
  onCancellationRedirect,
  onDismiss,
  redirecting,
}: MismatchDialogProps) {
  const { t } = useTranslation();

  const currentProviderLabel = t(`plan.providerLabel.${currentProvider}`);
  const newProviderLabel = t(`plan.providerLabel.${expectedProvider}`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mismatch-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onDismiss}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="mismatch-dialog-title"
          className="text-lg font-bold text-foreground mb-3"
        >
          {t('plan.mismatchDialog.title')}
        </h2>
        <div className="space-y-3 mb-4">
          <p className="text-sm text-foreground">
            {t('plan.mismatchDialog.bodyLine1', {
              currentProviderLabel,
              newProviderLabel,
            })}
          </p>
          <p className="text-sm text-foreground">
            {t('plan.mismatchDialog.bodyLine2')}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onDismiss}
            disabled={redirecting}
            className="px-4 py-2 text-sm rounded border border-border text-foreground hover:bg-accent disabled:opacity-50"
          >
            {t('plan.mismatchDialog.dismissButton')}
          </button>
          <button
            type="button"
            onClick={onCancellationRedirect}
            disabled={redirecting}
            className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {redirecting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ExternalLink className="w-3 h-3" />
            )}
            {t('plan.mismatchDialog.cancelButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
