import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onSave?: () => void;
  onOpen?: () => void;
  onNew?: () => void;
  onCompile?: () => void;
  onToggleMonitor?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 入力フィールドにフォーカスがある場合はショートカットを無効化
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Escapeは入力フィールドでも許可
      if (event.key !== 'Escape') {
        return;
      }
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;

    // Ctrl/Cmd + S: 保存
    if (modifierKey && event.key === 's') {
      event.preventDefault();
      handlers.onSave?.();
      return;
    }

    // Ctrl/Cmd + O: 開く
    if (modifierKey && event.key === 'o') {
      event.preventDefault();
      handlers.onOpen?.();
      return;
    }

    // Ctrl/Cmd + N: 新規作成
    if (modifierKey && event.key === 'n') {
      event.preventDefault();
      handlers.onNew?.();
      return;
    }

    // Ctrl/Cmd + Enter: コンパイル＆書き込み
    if (modifierKey && event.key === 'Enter') {
      event.preventDefault();
      handlers.onCompile?.();
      return;
    }

    // Ctrl/Cmd + M: シリアルモニター切り替え
    if (modifierKey && event.key === 'm') {
      event.preventDefault();
      handlers.onToggleMonitor?.();
      return;
    }

    // Escape: ダイアログを閉じる
    if (event.key === 'Escape') {
      handlers.onEscape?.();
      return;
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ショートカット一覧を返すヘルパー
export function getShortcutsList(): { key: string; description: string; mac: string; windows: string }[] {
  return [
    { key: 'save', description: '保存', mac: '⌘S', windows: 'Ctrl+S' },
    { key: 'open', description: '開く', mac: '⌘O', windows: 'Ctrl+O' },
    { key: 'new', description: '新規作成', mac: '⌘N', windows: 'Ctrl+N' },
    { key: 'compile', description: 'コンパイル＆書き込み', mac: '⌘Enter', windows: 'Ctrl+Enter' },
    { key: 'monitor', description: 'シリアルモニター切り替え', mac: '⌘M', windows: 'Ctrl+M' },
    { key: 'escape', description: 'ダイアログを閉じる', mac: 'Esc', windows: 'Esc' },
  ];
}
