/**
 * OutdatedCompileServerDialog render tests (Session 129 follow-up).
 *
 * Coverage:
 *   - renders nothing when `open=false`
 *   - renders title + 3 steps when open with a sha-mismatch signal
 *   - shows "unknown" label when the local sha is undefined (legacy image)
 *   - close button invokes onOpenChange(false)
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { OutdatedCompileServerDialog } from '../OutdatedCompileServerDialog';

function renderDialog(props: Parameters<typeof OutdatedCompileServerDialog>[0]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <OutdatedCompileServerDialog {...props} />
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('OutdatedCompileServerDialog', () => {
  it('does not render dialog content when open=false', () => {
    renderDialog({ open: false, onOpenChange: vi.fn(), signal: null });
    // Radix Dialog removes the content from the DOM when closed; title
    // would only exist under the open Portal.
    expect(screen.queryByText(/コンパイルサーバーの更新|update required/i)).toBeNull();
  });

  it('renders title + sha differential + close button when open with sha-mismatch signal', () => {
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      signal: { localSha: '0000111', remoteSha: '9999fff', reason: 'sha-mismatch' },
    });
    // Title (canonical JA defaultValue baseline)
    expect(
      screen.getByText(/コンパイルサーバーの更新が必要です|update required/i),
    ).toBeTruthy();
    // SHA differential — both literal shas appear in the rendered output
    expect(screen.getByText('0000111')).toBeTruthy();
    expect(screen.getByText('9999fff')).toBeTruthy();
    // All 3 numbered step titles render (1. / 2. / 3.)
    expect(screen.getByText(/^1\./)).toBeTruthy();
    expect(screen.getByText(/^2\./)).toBeTruthy();
    expect(screen.getByText(/^3\./)).toBeTruthy();
  });

  it('shows "unknown" placeholder for both labels when signal indicates a legacy image', () => {
    renderDialog({
      open: true,
      onOpenChange: vi.fn(),
      signal: { localSha: undefined, remoteSha: undefined, reason: 'legacy-image' },
    });
    // The placeholder is taken from i18n key versionCheck.unknownLabel,
    // which defaults to "不明" in JA. The exact text may localise, but
    // there must be at least two occurrences (one per row).
    const unknownNodes = screen.getAllByText(/不明|unknown|desconhecido|未知|desconocido/i);
    expect(unknownNodes.length).toBeGreaterThanOrEqual(2);
  });

  it('invokes onOpenChange(false) when the close button is clicked', () => {
    const handler = vi.fn();
    renderDialog({
      open: true,
      onOpenChange: handler,
      signal: { localSha: '0000111', remoteSha: '9999fff', reason: 'sha-mismatch' },
    });
    // Both the Radix built-in X icon and our footer button match `/close/i`
    // (sr-only on the icon, visible label on the footer button). Pick the
    // footer one by class — Radix's icon sits at `top-4 right-4 absolute`,
    // our Button uses the shadcn secondary variant without `absolute`.
    const candidates = screen.getAllByRole('button', { name: /close|閉じる|fechar|關閉|cerrar/i });
    const footerCloseBtn = candidates.find((el) => !el.className.includes('absolute'));
    expect(footerCloseBtn).toBeTruthy();
    fireEvent.click(footerCloseBtn!);
    expect(handler).toHaveBeenCalledWith(false);
  });
});
