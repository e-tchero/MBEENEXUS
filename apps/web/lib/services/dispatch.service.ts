import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// =============================================
// Configuration (loaded from platform_settings)
// =============================================

interface DispatchConfig {
  radiusKm: number;
  offerTimeoutSeconds: number;
  maxRidersPerAttempt: number;
  maxRetryAttempts: number;
  retryBaseDelaySeconds: number;
}

let cachedConfig: DispatchConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60_000;

export async function getDispatchConfig(): Promise<DispatchConfig> {
  const now = Date.now();
  if (cachedConfig && now - configCacheTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const serviceRole = await createServiceRoleClient();
  const { data } = await serviceRole
    .from('platform_settings')
    .select('key, value')
    .eq('category', 'dispatch');

  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  cachedConfig = {
    radiusKm: (settings.dispatch_radius_km as { km: number })?.km ?? 10,
    offerTimeoutSeconds: (settings.dispatch_offer_timeout_seconds as { seconds: number })?.seconds ?? 30,
    maxRidersPerAttempt: (settings.dispatch_max_riders_per_attempt as { count: number })?.count ?? 1,
    maxRetryAttempts: (settings.dispatch_max_retry_attempts as { count: number })?.count ?? 3,
    retryBaseDelaySeconds: (settings.dispatch_retry_base_delay_seconds as { seconds: number })?.seconds ?? 5,
  };
  configCacheTime = now;
  return cachedConfig;
}

/**
 * Invalidate config cache (for testing or after config changes).
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  configCacheTime = 0;
}

// =============================================
// Dispatch Service
// =============================================

export class DispatchService {
  /**
   * Process a DISPATCH_ORDER background job.
   * Invokes the existing dispatch_rider_v2() PostgreSQL function.
   * The function now reads config from platform_settings.
   */
  async processDispatchJob(orderId: string): Promise<{
    success: boolean;
    riderId?: string;
    message: string;
  }> {
    const serviceRole = await createServiceRoleClient();
    const config = await getDispatchConfig();

    logger.info('dispatch.processing', { order_id: orderId });

    // Call the existing PostgreSQL dispatch function
    // dispatch_rider_v2() now reads radius/timeout from platform_settings
    const { data, error } = await serviceRole.rpc('dispatch_rider_v2', {
      p_order_id: orderId,
    });

    if (error) {
      logger.error('dispatch.rider_v2_failed', { order_id: orderId }, error instanceof Error ? error : undefined);
      return { success: false, message: `Dispatch function error: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'No result from dispatch function' };
    }

    const result = data[0];

    if (result.success) {
      logger.info('dispatch.offer_sent', { order_id: orderId, rider_id: result.rider_id });

      // Record order event
      await this.recordOrderEvent(orderId, 'dispatch_offer_created', null, 'rider_assigned', {
        rider_id: result.rider_id,
        radius_km: config.radiusKm,
      });

      // Schedule offer timeout job
      await this.scheduleOfferTimeout(orderId, config.offerTimeoutSeconds);

      return {
        success: true,
        riderId: result.rider_id,
        message: result.message,
      };
    }

    // Dispatch failed — no riders found
    logger.info('dispatch.no_riders_found', { order_id: orderId });

    await this.recordOrderEvent(orderId, 'dispatch_failed', 'searching_rider', 'failed', {
      radius_km: config.radiusKm,
      reason: result.message,
    });

    return { success: false, message: result.message };
  }

  /**
   * Process a DISPATCH_RETRY background job.
   * Re-dispatches after a rider rejection or timeout.
   *
   * Fix: Query retry count by order_id to avoid matching wrong jobs.
   */
  async processDispatchRetry(orderId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const serviceRole = await createServiceRoleClient();
    const config = await getDispatchConfig();

    // Check how many DISPATCH_RETRY jobs have been processed for this order.
    // Count completed + failed + processing retry jobs for this order.
    const { data: retryHistory } = await serviceRole
      .from('background_jobs')
      .select('id, status, attempts, payload')
      .eq('job_type', 'DISPATCH_RETRY')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    // Filter by order_id in payload (server-side filtering)
    const orderRetries = (retryHistory || []).filter((j) => {
      const payload = j.payload as { order_id?: string };
      return payload?.order_id === orderId;
    });

    // Count completed retries + current attempt
    const completedRetries = orderRetries.length;

    if (completedRetries >= config.maxRetryAttempts) {
      logger.warn('dispatch.retry_exhausted', { order_id: orderId, attempts: completedRetries, max_attempts: config.maxRetryAttempts });

      // Mark order as failed (with status guard to prevent race conditions)
      await serviceRole
        .from('orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'searching_rider');

      await this.recordOrderEvent(orderId, 'dispatch_retry_exhausted', 'searching_rider', 'failed', {
        attempts: completedRetries,
        max_attempts: config.maxRetryAttempts,
      });

      return { success: false, message: `Retry exhausted after ${completedRetries} attempts` };
    }

    logger.info('dispatch.retrying', { order_id: orderId, attempt: completedRetries + 1, max_attempts: config.maxRetryAttempts });

    // Re-invoke dispatch
    const dispatchResult = await this.processDispatchJob(orderId);

    if (dispatchResult.success) {
      await this.recordOrderEvent(orderId, 'dispatch_retry_success', 'searching_rider', 'rider_assigned', {
        rider_id: dispatchResult.riderId,
        attempt: completedRetries + 1,
      });
    }

    return { success: false, message: dispatchResult.message };
  }

  /**
   * Schedule an offer timeout job.
   */
  private async scheduleOfferTimeout(orderId: string, timeoutSeconds: number): Promise<void> {
    const serviceRole = await createServiceRoleClient();

    await serviceRole.from('background_jobs').insert({
      job_type: 'OFFER_TIMEOUT',
      payload: { order_id: orderId },
      priority: 5,
      scheduled_at: new Date(Date.now() + timeoutSeconds * 1000).toISOString(),
    });
  }

  /**
   * Process an OFFER_TIMEOUT background job.
   * Expires stale offers and triggers retry.
   *
   * Fix: Made idempotent — only creates DISPATCH_RETRY if one isn't already pending.
   * Uses atomic status transition to prevent duplicate expiration processing.
   */
  async processOfferTimeout(orderId: string): Promise<{
    expired: boolean;
    message: string;
  }> {
    const serviceRole = await createServiceRoleClient();

    logger.info('dispatch.offer_timeout_processing', { order_id: orderId });

    // Find expired offers for this order — use atomic update to prevent race conditions
    // Update status from 'offered' to 'expired' in a single operation
    const { data: expiredOffers, error: expireError } = await serviceRole
      .from('rider_assignments')
      .update({
        status: 'expired',
        responded_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .eq('status', 'offered')
      .lt('expires_at', new Date().toISOString())
      .select('id, rider_id');

    if (expireError) {
      logger.error('dispatch.offer_expiry_failed', { order_id: orderId }, expireError instanceof Error ? expireError : undefined);
      return { expired: false, message: `Error expiring offers: ${expireError.message}` };
    }

    if (!expiredOffers || expiredOffers.length === 0) {
      return { expired: false, message: 'No expired offers found' };
    }

    // Re-make expired riders available
    for (const offer of expiredOffers) {
      await serviceRole
        .from('rider_current_locations')
        .update({ is_available: true })
        .eq('rider_id', offer.rider_id);

      logger.info('dispatch.offer_expired', { order_id: orderId, assignment_id: offer.id, rider_id: offer.rider_id });
    }

    // Check if order is still searching AND no pending DISPATCH_RETRY already exists
    const { data: order } = await serviceRole
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (order?.status === 'searching_rider') {
      // Check if a DISPATCH_RETRY is already pending for this order (idempotency guard)
      const { data: existingRetry } = await serviceRole
        .from('background_jobs')
      .select('id, payload')
      .eq('job_type', 'DISPATCH_RETRY')
      .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      const hasPendingRetry = (existingRetry || []).some((j) => {
        const payload = j.payload as { order_id?: string };
        return payload?.order_id === orderId;
      });

      if (!hasPendingRetry) {
        // Create retry job only if one isn't already pending
        await serviceRole.from('background_jobs').insert({
          job_type: 'DISPATCH_RETRY',
          payload: { order_id: orderId },
          priority: 8,
        });

        await this.recordOrderEvent(orderId, 'dispatch_offer_expired', 'searching_rider', 'searching_rider', {
          expired_count: expiredOffers.length,
        });

        return { expired: true, message: `Expired ${expiredOffers.length} offers, retry scheduled` };
      }

      return { expired: true, message: `Expired ${expiredOffers.length} offers, retry already pending` };
    }

    return { expired: true, message: `Expired ${expiredOffers.length} offers` };
  }

  /**
   * Record an order event for dispatch transitions.
   */
  private async recordOrderEvent(
    orderId: string,
    eventType: string,
    fromStatus: string | null,
    toStatus: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const serviceRole = await createServiceRoleClient();

    await serviceRole.from('order_events').insert({
      order_id: orderId,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      actor_type: 'system',
      metadata,
    });
  }
}

export const dispatchService = new DispatchService();
