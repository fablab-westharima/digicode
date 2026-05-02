import '@testing-library/jest-dom/vitest';

/**
 * jsdom polyfills required by Radix UI primitives (Slider, ScrollArea, etc.)
 * which assume browser-only APIs that jsdom does not implement.
 */

// ResizeObserver — used by Radix UI's Slider / ScrollArea internals.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class NoopResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = NoopResizeObserver as unknown as typeof ResizeObserver;
}

// Element.scrollIntoView — used by some Radix focus management.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function (): void {
    /* no-op */
  };
}
