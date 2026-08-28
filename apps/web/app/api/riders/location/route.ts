import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderLocationService } from '@/lib/services/rider-location.service';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const UpdateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).max(200).optional(),
  accuracy: z.number().min(0).optional(),
  recorded_at: z.string().datetime().optional(),
});

/**
 * POST /api/riders/location
 * Update rider GPS position.
 * Authenticated rider only. Server determines identity from session.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: GPS tier (authenticated rider)
    const rateLimit = checkRateLimit(`user:${user.id}`, 'gps');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const validatedData = UpdateLocationSchema.parse(body);

    const result = await riderLocationService.updateLocation(user.id, validatedData);

    return NextResponse.json({
      data: {
        accepted: result.accepted,
        reason: result.reason,
        wrote_historical: result.wroteHistorical,
        broadcast: result.broadcast,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error updating rider location', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/riders/location
 * Get rider's current location.
 * Authenticated rider only.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const location = await riderLocationService.getCurrentLocation(user.id);

    return NextResponse.json({ data: location });
  } catch (error) {
    logger.error('Error getting rider location', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to get location' },
      { status: 500 }
    );
  }
}
