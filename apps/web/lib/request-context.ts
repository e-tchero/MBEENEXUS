/**
 * Request Context Wrapper for Embee Nexus.
 *
 * Establishes correlation_id per request, creates child logger,
 * measures duration, and sets response headers.
 *
 * Usage:
 *   export async function POST(request: NextRequest) {
 *     return withRequestContext(request, async (reqLogger, user) => {
 *       // ... handler logic using reqLogger
 *     });
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, generateCorrelationId, type LogContext } from '@/lib/logger';

const MAX_CORRELATION_ID_LENGTH = 128;

/**
 * Extract or generate a correlation ID for the request.
 * Accepts incoming X-Request-Id header if present and valid.
 */
function resolveCorrelationId(request: NextRequest): string {
  const incoming = request.headers.get('x-request-id');
  if (incoming && incoming.length <= MAX_CORRELATION_ID_LENGTH && /^[a-zA-Z0-9\-_]+$/.test(incoming)) {
    return incoming;
  }
  return generateCorrelationId();
}

type RequestHandler = (
  reqLogger: ReturnType<typeof logger.child>,
  user?: { id: string; email?: string }
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with request correlation context.
 *
 * - Generates or accepts a correlation_id
 * - Creates a child logger bound to the request context
 * - Measures request duration
 * - Sets X-Request-Id response header
 * - Logs request completion or failure
 */
export async function withRequestContext(
  request: NextRequest,
  handler: RequestHandler
): Promise<NextResponse> {
  const correlationId = resolveCorrelationId(request);
  const route = request.nextUrl.pathname;
  const method = request.method;
  const startTime = Date.now();

  const reqLogger = logger.child({
    correlation_id: correlationId,
    route,
    method,
  });

  try {
    const response = await handler(reqLogger);
    const durationMs = Date.now() - startTime;

    // Attach correlation header to all responses
    response.headers.set('X-Request-Id', correlationId);

    // Log request completion
    reqLogger.info('request.completed', {
      status: response.status,
      duration_ms: durationMs,
    });

    return response;
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log unexpected error
    reqLogger.error('request.failed', {
      status: 500,
      duration_ms: durationMs,
    }, error instanceof Error ? error : undefined);

    // Return safe error response with correlation header
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    response.headers.set('X-Request-Id', correlationId);
    return response;
  }
}
