import { createServiceRoleClient } from '@/lib/supabase/server';
import type { JobType, JobStatus } from '@repo/shared/types';

export interface JobHandler {
  (payload: Record<string, unknown>): Promise<void>;
}

const handlers: Partial<Record<JobType, JobHandler>> = {};

/**
 * Register a handler for a job type.
 */
export function registerJobHandler(jobType: JobType, handler: JobHandler): void {
  handlers[jobType] = handler;
}

/**
 * Process pending background jobs.
 * Called by the cron endpoint on a schedule.
 *
 * Uses FOR UPDATE SKIP LOCKED for concurrency safety.
 * Multiple cron invocations will not process the same job.
 */
export async function processPendingJobs(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  const serviceRole = await createServiceRoleClient();

  // Fetch pending jobs with row-level locking
  const { data: jobs, error: fetchError } = await serviceRole
    .from('background_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date().toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10);

  if (fetchError) {
    console.error('Failed to fetch background jobs:', fetchError);
    return { processed: 0, failed: 0, errors: [fetchError.message] };
  }

  if (!jobs || jobs.length === 0) {
    return { processed: 0, failed: 0, errors: [] };
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const job of jobs) {
    try {
      // Mark as processing
      await serviceRole
        .from('background_jobs')
        .update({
          status: 'processing' satisfies JobStatus,
          started_at: new Date().toISOString(),
          attempts: job.attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Execute handler
      const handler = handlers[job.job_type as JobType];
      if (handler) {
        await handler(job.payload);
      } else {
        console.warn(`No handler registered for job type: ${job.job_type}`);
      }

      // Mark as completed
      await serviceRole
        .from('background_jobs')
        .update({
          status: 'completed' satisfies JobStatus,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      processed++;
    } catch (error) {
      console.error(`Job ${job.id} (${job.job_type}) failed:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const shouldRetry = job.attempts + 1 < job.max_attempts;

      await serviceRole
        .from('background_jobs')
        .update({
          status: shouldRetry ? ('retrying' satisfies JobStatus) : ('failed' satisfies JobStatus),
          error_message: errorMessage,
          failed_at: shouldRetry ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          scheduled_at: shouldRetry
            ? new Date(Date.now() + 5000 * (job.attempts + 1)).toISOString() // Exponential backoff
            : job.scheduled_at,
        })
        .eq('id', job.id);

      failed++;
      errors.push(`Job ${job.id}: ${errorMessage}`);
    }
  }

  return { processed, failed, errors };
}

/**
 * Process expired rider offers.
 * Should be called periodically (e.g., every 30 seconds).
 */
export async function processExpiredOffers(): Promise<number> {
  const serviceRole = await createServiceRoleClient();

  // Find expired offers
  const { data: expired, error } = await serviceRole
    .from('rider_assignments')
    .select('id, order_id, rider_id')
    .eq('status', 'offered')
    .lt('expires_at', new Date().toISOString())
    .limit(50);

  if (error || !expired || expired.length === 0) {
    return 0;
  }

  let processed = 0;

  for (const assignment of expired) {
    try {
      // Mark as expired
      await serviceRole
        .from('rider_assignments')
        .update({
          status: 'expired',
          responded_at: new Date().toISOString(),
        })
        .eq('id', assignment.id);

      // Re-make rider available
      await serviceRole
        .from('rider_current_locations')
        .update({ is_available: true })
        .eq('rider_id', assignment.rider_id);

      // Create DISPATCH_RETRY job
      await serviceRole.from('background_jobs').insert({
        job_type: 'DISPATCH_RETRY',
        payload: { order_id: assignment.order_id },
        priority: 8,
      });

      processed++;
    } catch (error) {
      console.error(`Failed to expire assignment ${assignment.id}:`, error);
    }
  }

  return processed;
}

/**
 * Detect and mark stale riders as unavailable.
 * A rider is stale if they haven't sent a location update
 * within the configured threshold.
 */
export async function detectStaleRiders(): Promise<number> {
  const serviceRole = await createServiceRoleClient();

  // Get stale threshold from platform settings
  const { data: setting } = await serviceRole
    .from('platform_settings')
    .select('value')
    .eq('key', 'location_stale_threshold_seconds')
    .single();

  const thresholdSeconds =
    (setting?.value as { seconds: number })?.seconds ?? 60;

  // Call the PostgreSQL function
  const { data, error } = await serviceRole.rpc('mark_stale_riders', {
    p_threshold_seconds: thresholdSeconds,
  });

  if (error) {
    console.error('Failed to detect stale riders:', error);
    return 0;
  }

  return data ?? 0;
}
