import { useEffect } from 'react';

// 会話履歴が残っている状態でリロード・タブ閉じを試みた時に標準ブラウザ警告を表示
export function useBeforeUnloadWarning(shouldWarn: boolean) {
  useEffect(() => {
    if (!shouldWarn) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldWarn]);
}
