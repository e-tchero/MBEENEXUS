import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { processPendingJobs, detectStaleRiders, recoverStuckJobs, registerJobHandler } from '@/lib/services/background-job.service';
import { dispatchService } from '@/lib/services/dispatch.service';
import { refundService } from '@/lib/services/refund.service';
import { logger } from '@/lib/logger';

// Register dispatch job handlers
registerJobHandler('DISPATCH_ORDER', async (payload) => {
  const orderId = payload.order_id as string;
  if (orderId) {
    await dispatchService.processDispatchJob(orderId);
  }
});

registerJobHandler('DISPATCH_RETRY', async (payload) => {
  const orderId = payload.order_id as string;
  if (orderId) {
    await dispatchService.processDispatchRetry(orderId);
  }
});

registerJobHandler('OFFER_TIMEOUT', async (payload) => {
  const orderId = payload.order_id as string;
  if (orderId) {
    await dispatchService.processOfferTimeout(orderId);
  }
});

registerJobHandler('REFUND_PROCESS', async (payload) => {
  await refundService.processRefundJob(payload);
});

/**
 * Cron endpoint for processing background jobs.
 *
 * This endpoint should be called periodically (e.g., every 30 seconds)
 * by Vercel Cron or an external scheduler.
 *
 * Security: Validate the cron secret to prevent unauthorized invocations.
 *
 * Expiration handling is done exclusively through OFFER_TIMEOUT background jobs.
 * processExpiredOffers() was removed to prevent duplicate DISPATCH_RETRY jobs.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Fail closed: if CRON_SECRET is not configured, deny all access.
    // Do not allow unauthenticated cron invocations in production.
    if (!cronSecret || !authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Timing-safe comparison to prevent timing attacks
    const expectedHeader = `Bearer ${cronSecret}`;
    const headerBuf = Buffer.from(authHeader);
    const expectedBuf = Buffer.from(expectedHeader);
    if (headerBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(headerBuf, expectedBuf)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Recover jobs stuck in 'processing' after worker crashes
    const recoveredCount = await recoverStuckJobs();

    // 2. Process pending background jobs (uses FOR UPDATE SKIP LOCKED)
    const jobResult = await processPendingJobs();

    // 3. Detect and mark stale riders
    const staleRidersCount = await detectStaleRiders();

    return NextResponse.json({
      recovered_stuck: recoveredCount,
      jobs: jobResult,
      stale_riders: staleRidersCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('cron.processing_failed', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
