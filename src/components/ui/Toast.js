// src/components/ui/Toast.js
// Système de notifications « toast » global et accessible.
// Usage : envelopper l'app dans <ToastProvider>, puis `const toast = useToast();`
// et appeler toast.success('...') / toast.error('...') / toast.info('...').
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext({
  push: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

const styles = {
  success: { bar: 'bg-success-500', icon: 'text-success-500', Icon: CheckCircle2 },
  error: { bar: 'bg-danger-500', icon: 'text-danger-500', Icon: AlertCircle },
  warning: { bar: 'bg-warning-500', icon: 'text-warning-500', Icon: AlertTriangle },
  info: { bar: 'bg-primary-500', icon: 'text-primary-500', Icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind, message, duration = 4500) => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, kind, message }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  const api = {
    push,
    success: (m, d) => push('success', m, d),
    error: (m, d) => push('error', m, d),
    info: (m, d) => push('info', m, d),
    warning: (m, d) => push('warning', m, d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 sm:right-4 sm:left-auto sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const { bar, icon, Icon } = styles[t.kind] || styles.info;
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border border-ink-100 bg-white p-3.5 pl-5 shadow-pop animate-toast-in"
            >
              <span className={twMerge('absolute left-0 top-0 h-full w-1', bar)} />
              <Icon className={twMerge('mt-px h-5 w-5 flex-shrink-0', icon)} aria-hidden="true" />
              <p className="flex-1 pt-px text-sm font-medium text-ink-800">{t.message}</p>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Fermer"
                className="-mr-1 -mt-1 rounded-md p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export default ToastProvider;
