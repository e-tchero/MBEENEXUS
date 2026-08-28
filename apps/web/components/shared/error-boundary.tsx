'use client';

import React from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Production-safe error boundary.
 * Catches React rendering errors and displays a safe fallback.
 * Logs errors through the structured logger.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React error boundary caught error', {
      context: this.props.context || 'unknown',
      component_stack: errorInfo.componentStack?.substring(0, 500),
    }, error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
          <div className="text-center">
            <h2 className="text-xl font-bold text-embee-charcoal">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-embee-slate">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: undefined });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 bg-embee-blue text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-embee-blue/90 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
