import { NextRequest, NextResponse } from 'next/server';
import { processPendingJobs, detectStaleRiders, registerJobHandler } from '@/lib/services/background-job.service';
import { dispatchService } from '@/lib/services/dispatch.service';

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

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process pending background jobs (uses FOR UPDATE SKIP LOCKED)
    const jobResult = await processPendingJobs();

    // Detect and mark stale riders
    const staleRidersCount = await detectStaleRiders();

    return NextResponse.json({
      jobs: jobResult,
      stale_riders: staleRidersCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job processing error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
