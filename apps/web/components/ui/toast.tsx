'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (options: { variant?: ToastVariant; title: string; description?: string }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ variant = 'info', title, description }: { variant?: ToastVariant; title: string; description?: string }) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, variant, title, description }]);

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-status-success text-status-success-foreground border-status-success-foreground/20',
  error: 'bg-status-error text-status-error-foreground border-status-error-foreground/20',
  warning: 'bg-status-warning text-status-warning-foreground border-status-warning-foreground/20',
  info: 'bg-status-info text-status-info-foreground border-status-info-foreground/20',
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-embee-lg animate-toast-in',
            VARIANT_STYLES[t.variant]
          )}
        >
          <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
            {VARIANT_ICONS[t.variant]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && (
              <p className="text-sm mt-0.5 opacity-80">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
