'use client';
import { logger } from '@/lib/logger';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('app.unhandled_error', {}, error instanceof Error ? error : undefined);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-embee-white px-4">
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-status-error/20">
          <svg className="h-8 w-8 text-status-error-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-embee-charcoal">Something went wrong</h2>
        <p className="mt-2 text-embee-slate max-w-md">
          An unexpected error occurred. Please try again.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 bg-embee-blue text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-embee-blue/90 transition-colors shadow-sm touch-target"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        Try again
      </button>
    </div>
  );
}
