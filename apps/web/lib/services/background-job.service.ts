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

interface ClaimedJob {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  priority: number;
  attempts: number;
  max_attempts: number;
}

/**
 * Atomically claim the next pending job using FOR UPDATE SKIP LOCKED.
 * This prevents concurrent workers from processing the same job.
 */
async function claimNextJob(): Promise<ClaimedJob | null> {
  const serviceRole = await createServiceRoleClient();

  // Use the PostgreSQL function that wraps FOR UPDATE SKIP LOCKED
  const { data, error } = await serviceRole.rpc('claim_next_pending_job');

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = data[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    job_type: row.job_type as string,
    payload: (row.payload as Record<string, unknown>) || {},
    priority: (row.priority as number) || 0,
    attempts: (row.attempts as number) || 0,
    max_attempts: (row.max_attempts as number) || 3,
  };
}

/**
 * Mark a job as completed.
 */
async function completeJob(jobId: string): Promise<void> {
  const serviceRole = await createServiceRoleClient();
  await serviceRole
    .from('background_jobs')
    .update({
      status: 'completed' satisfies JobStatus,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

/**
 * Mark a job as failed or retrying.
 */
async function failJob(
  jobId: string,
  errorMessage: string,
  attempts: number,
  maxAttempts: number
): Promise<void> {
  const serviceRole = await createServiceRoleClient();
  const shouldRetry = attempts < maxAttempts;

  await serviceRole
    .from('background_jobs')
    .update({
      status: shouldRetry ? ('retrying' satisfies JobStatus) : ('failed' satisfies JobStatus),
      error_message: errorMessage,
      failed_at: shouldRetry ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      scheduled_at: shouldRetry
        ? new Date(Date.now() + 5000 * Math.pow(2, attempts - 1)).toISOString()
        : undefined,
    })
    .eq('id', jobId);
}

/**
 * Process pending background jobs.
 * Called by the cron endpoint on a schedule.
 *
 * Uses FOR UPDATE SKIP LOCKED via claim_next_pending_job() PostgreSQL function.
 * Multiple concurrent workers will never process the same job.
 */
export async function processPendingJobs(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process jobs in batches (max 5 per cron invocation)
  for (let batch = 0; batch < 5; batch++) {
    // Atomically claim one pending job using FOR UPDATE SKIP LOCKED
    const job = await claimNextJob();

    if (!job) {
      // No more pending jobs
      break;
    }

    try {
      // Increment attempts count
      const serviceRole = await createServiceRoleClient();
      await serviceRole
        .from('background_jobs')
        .update({ attempts: job.attempts + 1 })
        .eq('id', job.id);

      // Execute handler
      const handler = handlers[job.job_type as JobType];
      if (handler) {
        await handler(job.payload);
      } else {
        console.warn(`No handler registered for job type: ${job.job_type}`);
      }

      // Mark as completed
      await completeJob(job.id);
      processed++;
    } catch (error) {
      console.error(`Job ${job.id} (${job.job_type}) failed:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await failJob(job.id, errorMessage, job.attempts + 1, job.max_attempts);

      failed++;
      errors.push(`Job ${job.id}: ${errorMessage}`);
    }
  }

  return { processed, failed, errors };
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
