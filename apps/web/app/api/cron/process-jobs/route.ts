import { NextRequest, NextResponse } from 'next/server';
import { processPendingJobs, processExpiredOffers, detectStaleRiders } from '@/lib/services/background-job.service';

/**
 * Cron endpoint for processing background jobs.
 *
 * This endpoint should be called periodically (e.g., every 30 seconds)
 * by Vercel Cron or an external scheduler.
 *
 * Security: Validate the cron secret to prevent unauthorized invocations.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process pending background jobs
    const jobResult = await processPendingJobs();

    // Process expired rider offers
    const expiredCount = await processExpiredOffers();

    // Detect and mark stale riders
    const staleRidersCount = await detectStaleRiders();

    return NextResponse.json({
      jobs: jobResult,
      expired_offers: expiredCount,
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
