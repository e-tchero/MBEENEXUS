import { NextResponse } from 'next/server';
import { logger, type LogContext } from '@/lib/logger';

/**
 * Standardized API error handler.
 *
 * Prevents stack traces and internal details from reaching clients.
 * Logs errors through the structured logger with correlation context.
 * Preserves HTTP status semantics.
 */

interface ApiError {
  status: number;
  message: string;
}

/**
 * Known error types mapped to HTTP responses.
 */
const ERROR_MAP: Record<string, ApiError> = {
  Unauthorized: { status: 401, message: 'Please sign in' },
  'Not found': { status: 404, message: 'Resource not found' },
  'Quote not found, already consumed, or expired': {
    status: 400,
    message: 'Quote is no longer valid',
  },
  'Order not found': { status: 404, message: 'Order not found' },
  'Order is not awaiting payment': {
    status: 400,
    message: 'Order is not awaiting payment',
  },
  'Payment record not found': { status: 400, message: 'Payment not found' },
  'Customer email not found': { status: 400, message: 'Account error' },
  'Payment initialization failed': {
    status: 402,
    message: 'Payment processing failed',
  },
  'Address not found': { status: 404, message: 'Address not found' },
  'Pickup address not found': { status: 404, message: 'Pickup address not found' },
  'Destination address not found': {
    status: 404,
    message: 'Destination address not found',
  },
  'Failed to create order': { status: 500, message: 'Failed to create order' },
  'Failed to create payment record': {
    status: 500,
    message: 'Payment setup failed',
  },
  'Rider must be approved before going online': {
    status: 400,
    message: 'Rider must be approved first',
  },
  'Service not available in this area': {
    status: 400,
    message: 'Service not available in this area',
  },
  'No pricing rule available for this location': {
    status: 400,
    message: 'Pricing not available for this route',
  },
  'No pricing rule available for this route': {
    status: 400,
    message: 'Pricing not available for this route',
  },
};

/**
 * Handle an API error and return a safe NextResponse.
 *
 * @param error - The caught error
 * @param context - Request context for logging
 * @returns NextResponse with safe error message
 */
export function handleApiError(
  error: unknown,
  context: LogContext = {}
): NextResponse {
  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error';

  // Look up known error messages
  const knownError = ERROR_MAP[errorMessage];

  const status = knownError?.status ?? 500;
  const userMessage = knownError?.message ?? 'Something went wrong';

  // Log the full error details (server-side only)
  logger.error('API error', context, error instanceof Error ? error : undefined);

  return NextResponse.json({ error: userMessage }, { status });
}

/**
 * Create a standardized success response.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

/**
 * Create a standardized error response without throwing.
 */
export function apiError(
  message: string,
  status = 400
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
