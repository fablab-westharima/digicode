import { useState, useEffect, useCallback } from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((text: string, type: ToastType) => void) | null = null;

// eslint-disable-next-line react-refresh/only-export-components -- showToast は ToastContainer の副作用経由で動作する既存 API、分離より維持を優先
export function showToast(text: string, type: ToastType = 'info') {
  addToastFn?.(text, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((text: string, type: ToastType) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm min-w-[250px] animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-primary text-primary-foreground'
              : toast.type === 'error'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-card text-foreground border border-border'
          }`}
        >
          {toast.type === 'success' && <Check className="w-4 h-4 flex-shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{toast.text}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="flex-shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
