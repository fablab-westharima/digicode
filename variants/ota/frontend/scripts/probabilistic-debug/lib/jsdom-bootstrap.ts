/**
 * jsdom-bootstrap.ts
 *
 * Imported as a side effect by `blocks-bootstrap.ts` to make the frontend's
 * browser-leaning modules (i18n, zustand persist, Blockly XML parser) usable
 * from a Node CLI. When already running under a DOM-aware environment such
 * as vitest's jsdom env, this is a no-op.
 */

import { JSDOM } from 'jsdom';

if (typeof globalThis.window === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });

  const win = dom.window;

  // Some platforms (Node 21+, vitest with environment:'node') expose `navigator`
  // / `localStorage` as non-configurable getters. defineProperty + try/catch is
  // safer than direct assignment.
  function safeDefine(name: string, value: unknown): void {
    try {
      Object.defineProperty(globalThis, name, {
        value,
        writable: true,
        configurable: true,
      });
    } catch {
      // Already defined in a way we cannot override (e.g., non-configurable);
      // accept the host value and proceed. JSDOM-driven code paths that rely
      // on `window.<name>` still work because we expose `globalThis.window`.
    }
  }

  safeDefine('window', win);
  safeDefine('document', win.document);
  safeDefine('navigator', win.navigator);
  safeDefine('HTMLElement', win.HTMLElement);
  safeDefine('Element', win.Element);
  safeDefine('Node', win.Node);
  safeDefine('DOMParser', win.DOMParser);
  safeDefine('XMLSerializer', win.XMLSerializer);
  safeDefine('localStorage', win.localStorage);
  safeDefine('sessionStorage', win.sessionStorage);
  safeDefine('location', win.location);
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    safeDefine(
      'requestAnimationFrame',
      (cb: FrameRequestCallback): number =>
        Number(setTimeout(() => cb(Date.now()), 16)),
    );
    safeDefine('cancelAnimationFrame', (id: number): void => clearTimeout(id));
  }
}
