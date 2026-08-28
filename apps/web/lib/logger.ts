/**
 * Structured logger for Embee Nexus.
 *
 * Replaces console.log/console.error with JSON-structured output.
 * Designed for serverless environments (Vercel).
 *
 * Log levels: debug < info < warn < error
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  correlation_id?: string;
  order_id?: string;
  rider_id?: string;
  customer_id?: string;
  job_id?: string;
  job_type?: string;
  event_id?: string;
  event_type?: string;
  duration_ms?: number;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error_name?: string;
  error_message?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function formatEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error_name = error.name;
    entry.error_message = error.message;
  }

  const formatted = formatEntry(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Generate a correlation ID for request tracing.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Structured logger with context binding.
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    log('debug', message, context);
  },

  info(message: string, context?: LogContext): void {
    log('info', message, context);
  },

  warn(message: string, context?: LogContext): void {
    log('warn', message, context);
  },

  error(message: string, context?: LogContext, error?: Error): void {
    log('error', message, context, error);
  },

  /**
   * Create a child logger with pre-bound context.
   */
  child(context: LogContext) {
    return {
      debug(message: string, extra?: LogContext): void {
        log('debug', message, { ...context, ...extra });
      },
      info(message: string, extra?: LogContext): void {
        log('info', message, { ...context, ...extra });
      },
      warn(message: string, extra?: LogContext): void {
        log('warn', message, { ...context, ...extra });
      },
      error(message: string, extra?: LogContext, error?: Error): void {
        log('error', message, { ...context, ...extra }, error);
      },
    };
  },
};

export type { LogLevel, LogContext, LogEntry };
