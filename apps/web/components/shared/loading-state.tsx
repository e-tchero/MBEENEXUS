import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  variant?: 'spinner' | 'skeleton';
}

export function LoadingState({ message = 'Loading...', className, variant = 'spinner' }: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-4', className)} role="status" aria-label={message}>
        <div className="sr-only">{message}</div>
        <div className="bg-white rounded-lg p-4 space-y-3 shadow-embee-sm">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="skeleton h-3 w-full" />
          <div className="skeleton h-3 w-2/3" />
        </div>
        <div className="bg-white rounded-lg p-4 space-y-3 shadow-embee-sm">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="skeleton h-3 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center py-12', className)} role="status" aria-label={message}>
      <div className="flex items-center gap-3 text-embee-slate">
        <svg
          className="h-5 w-5 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
