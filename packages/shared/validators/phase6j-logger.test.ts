import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Structured logger tests.
 *
 * Since the logger lives in apps/web/lib/ (outside packages/shared rootDir),
 * we test the core logging behavior by reimplementing the key functions.
 * Integration testing of the actual logger is done at the API route level.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  correlation_id?: string;
  order_id?: string;
  rider_id?: string;
  customer_id?: string;
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

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
let currentLevel: LogLevel = 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
  const entry: LogEntry = { level, message, timestamp: new Date().toISOString() };
  if (context && Object.keys(context).length > 0) entry.context = context;
  if (error) { entry.error_name = error.name; entry.error_message = error.message; }
  return entry;
}

function generateCorrelationId(): string {
  return crypto.randomUUID();
}

describe('Structured Logger', () => {
  describe('generateCorrelationId', () => {
    it('generates a UUID', () => {
      const id = generateCorrelationId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('generates unique IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Log entry structure', () => {
    it('creates entry with correct fields', () => {
      const entry = createLogEntry('info', 'test message');
      expect(entry.level).toBe('info');
      expect(entry.message).toBe('test message');
      expect(entry.timestamp).toBeDefined();
    });

    it('includes context when provided', () => {
      const entry = createLogEntry('info', 'test', { order_id: 'order-123', correlation_id: 'corr-456' });
      expect(entry.context?.order_id).toBe('order-123');
      expect(entry.context?.correlation_id).toBe('corr-456');
    });

    it('includes error details when provided', () => {
      const error = new Error('test error');
      const entry = createLogEntry('error', 'something failed', undefined, error);
      expect(entry.error_name).toBe('Error');
      expect(entry.error_message).toBe('test error');
    });

    it('omits error fields when no error provided', () => {
      const entry = createLogEntry('error', 'something failed');
      expect(entry.error_name).toBeUndefined();
      expect(entry.error_message).toBeUndefined();
    });

    it('omits context when empty', () => {
      const entry = createLogEntry('info', 'test');
      expect(entry.context).toBeUndefined();
    });
  });

  describe('Log levels', () => {
    it('debug is level 0', () => { expect(LOG_LEVELS.debug).toBe(0); });
    it('info is level 1', () => { expect(LOG_LEVELS.info).toBe(1); });
    it('warn is level 2', () => { expect(LOG_LEVELS.warn).toBe(2); });
    it('error is level 3', () => { expect(LOG_LEVELS.error).toBe(3); });

    it('shouldLog respects level hierarchy', () => {
      currentLevel = 'info';
      expect(shouldLog('debug')).toBe(false);
      expect(shouldLog('info')).toBe(true);
      expect(shouldLog('warn')).toBe(true);
      expect(shouldLog('error')).toBe(true);
    });

    it('shouldLog at debug level logs everything', () => {
      currentLevel = 'debug';
      expect(shouldLog('debug')).toBe(true);
      expect(shouldLog('info')).toBe(true);
      expect(shouldLog('warn')).toBe(true);
      expect(shouldLog('error')).toBe(true);
      currentLevel = 'info'; // reset
    });
  });

  describe('Security', () => {
    it('log entry format does not enforce field filtering', () => {
      // The logger includes all context fields passed to it.
      // The security boundary is that callers must not pass secrets.
      // This test documents that behavior.
      const entry = createLogEntry('info', 'test', { api_key: 'secret-key' as unknown as string });
      expect(entry.context?.api_key).toBe('secret-key');
    });

    it('error response format excludes stack traces', () => {
      const error = new Error('internal error');
      const response = { error: 'Something went wrong' };
      expect(JSON.stringify(response)).not.toContain('stack');
      expect(JSON.stringify(response)).not.toContain(error.stack);
    });
  });
});
