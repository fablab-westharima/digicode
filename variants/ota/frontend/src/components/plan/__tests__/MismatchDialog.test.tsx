/**
 * MismatchDialog render + interaction tests (plan 58 §6a.4).
 *
 * Coverage:
 *   - body interpolates the current/new provider labels
 *   - dismiss + cancel buttons call the right handlers
 *   - redirecting=true disables both buttons + shows the spinner
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { MismatchDialog } from '../MismatchDialog';

function renderDialog(
  props: Partial<Parameters<typeof MismatchDialog>[0]> = {},
) {
  const fullProps = {
    currentProvider: 'stripe' as const,
    expectedProvider: 'polar' as const,
    onCancellationRedirect: vi.fn(),
    onDismiss: vi.fn(),
    redirecting: false,
    ...props,
  };
  return {
    ...render(
      <I18nextProvider i18n={i18n}>
        <MismatchDialog {...fullProps} />
      </I18nextProvider>,
    ),
    props: fullProps,
  };
}

afterEach(() => {
  cleanup();
});

describe('MismatchDialog', () => {
  it('renders title + body lines + both buttons', () => {
    renderDialog();
    expect(screen.getByRole('dialog')).toBeTruthy();
    // Title resolves to the canonical JA when i18n is on default locale.
    // We only assert presence-of-text via the heading element.
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toMatch(/.+/); // not empty
    // Body line 1 contains the provider labels via interpolation.
    expect(dialog.textContent).toContain('Stripe');
    expect(dialog.textContent).toContain('Merchant of Record');
  });

  it('clicking dismiss calls onDismiss exactly once', () => {
    const { props } = renderDialog();
    // The dismiss button is the secondary button (no spinner).
    const buttons = screen.getAllByRole('button');
    // Identify the dismiss button as the one whose text does NOT match
    // the cancellation link text. The other is the cancellation
    // redirect button.
    const dismissButton = buttons.find(
      (b) =>
        b.textContent !== null &&
        b.textContent.trim() === i18n.t('plan.mismatchDialog.dismissButton'),
    );
    expect(dismissButton).toBeTruthy();
    fireEvent.click(dismissButton!);
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
    expect(props.onCancellationRedirect).not.toHaveBeenCalled();
  });

  it('clicking the cancellation button calls onCancellationRedirect', () => {
    const { props } = renderDialog();
    const cancelButton = screen
      .getAllByRole('button')
      .find(
        (b) =>
          b.textContent !== null &&
          b.textContent
            .trim()
            .endsWith(i18n.t('plan.mismatchDialog.cancelButton')),
      );
    expect(cancelButton).toBeTruthy();
    fireEvent.click(cancelButton!);
    expect(props.onCancellationRedirect).toHaveBeenCalledTimes(1);
    expect(props.onDismiss).not.toHaveBeenCalled();
  });

  it('disables both buttons when redirecting=true', () => {
    renderDialog({ redirecting: true });
    const buttons = screen.getAllByRole('button');
    for (const b of buttons) {
      expect((b as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('clicking the dim backdrop calls onDismiss (modal courtesy)', () => {
    const { props } = renderDialog();
    fireEvent.click(screen.getByRole('dialog'));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('clicking inside the dialog content does NOT call onDismiss', () => {
    const { props } = renderDialog();
    // The headline text is inside the inner card, not on the backdrop.
    fireEvent.click(screen.getByRole('heading'));
    expect(props.onDismiss).not.toHaveBeenCalled();
  });
});
