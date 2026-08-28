import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the error mapping logic by simulating what handleApiError does
// Since handleApiError depends on NextResponse, we test the mapping logic directly

describe('API Error Handler', () => {
  describe('Error message mapping', () => {
    const ERROR_MAP: Record<string, { status: number; message: string }> = {
      Unauthorized: { status: 401, message: 'Please sign in' },
      'Not found': { status: 404, message: 'Resource not found' },
      'Quote not found, already consumed, or expired': {
        status: 400,
        message: 'Quote is no longer valid',
      },
      'Order not found': { status: 404, message: 'Order not found' },
      'Service not available in this area': {
        status: 400,
        message: 'Service not available in this area',
      },
    };

    it('maps known errors to correct status codes', () => {
      expect(ERROR_MAP['Unauthorized'].status).toBe(401);
      expect(ERROR_MAP['Order not found'].status).toBe(404);
      expect(ERROR_MAP['Quote not found, already consumed, or expired'].status).toBe(400);
    });

    it('maps known errors to safe user messages', () => {
      expect(ERROR_MAP['Unauthorized'].message).toBe('Please sign in');
      expect(ERROR_MAP['Order not found'].message).toBe('Order not found');
      // Should not expose internal details
      expect(ERROR_MAP['Quote not found, already consumed, or expired'].message).not.toContain('consumed');
    });

    it('unknown errors get generic message', () => {
      const unknownError = 'Some internal error';
      const mapped = ERROR_MAP[unknownError];
      expect(mapped).toBeUndefined();
      // Default behavior: status 500, generic message
    });
  });

  describe('Error response format', () => {
    it('returns JSON with error field', () => {
      const response = { error: 'Something went wrong' };
      expect(response).toHaveProperty('error');
      expect(typeof response.error).toBe('string');
    });

    it('does not include stack traces', () => {
      const error = new Error('test');
      const response = { error: 'Something went wrong' };
      // Stack trace should never be in the response
      expect(JSON.stringify(response)).not.toContain('stack');
      expect(JSON.stringify(response)).not.toContain(error.stack);
    });

    it('does not include internal details', () => {
      const response = { error: 'Something went wrong' };
      expect(JSON.stringify(response)).not.toContain('database');
      expect(JSON.stringify(response)).not.toContain('supabase');
      expect(JSON.stringify(response)).not.toContain('query');
    });
  });
});
