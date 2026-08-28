import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/health
 *
 * Lightweight health check for monitoring.
 * Returns application status, database connectivity, and job queue health.
 *
 * Unauthenticated — returns operational status only, no sensitive data.
 */
export async function GET() {
  const checks: Record<string, { status: string; latency_ms?: number; pending?: number; stuck?: number }> = {};
  let overallStatus = 'healthy';

  // 1. Database connectivity check
  try {
    const start = Date.now();
    const serviceRole = await createServiceRoleClient();
    const { error } = await serviceRole.from('platform_settings').select('key').limit(1);
    const latencyMs = Date.now() - start;

    if (error) {
      checks.database = { status: 'unhealthy' };
      overallStatus = 'unhealthy';
    } else {
      checks.database = { status: 'healthy', latency_ms: latencyMs };
    }
  } catch {
    checks.database = { status: 'unhealthy' };
    overallStatus = 'unhealthy';
  }

  // 2. Background jobs check
  try {
    const serviceRole = await createServiceRoleClient();
    const { data: pendingJobs } = await serviceRole
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { data: stuckJobs } = await serviceRole
      .from('background_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'processing');

    const pending = pendingJobs?.length ?? 0;
    const stuck = stuckJobs?.length ?? 0;

    checks.background_jobs = {
      status: stuck > 0 ? 'degraded' : 'healthy',
      pending,
      stuck,
    };

    if (stuck > 0 && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  } catch {
    checks.background_jobs = { status: 'unhealthy' };
    overallStatus = 'unhealthy';
  }

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: statusCode }
  );
}
