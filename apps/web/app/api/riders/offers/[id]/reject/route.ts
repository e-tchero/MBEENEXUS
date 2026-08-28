import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderOfferService } from '@/lib/services/rider-offer.service';
import { z } from 'zod';

const RejectOfferSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * POST /api/riders/offers/[id]/reject
 * Reject a rider offer.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = RejectOfferSchema.parse(body);

    const result = await riderOfferService.rejectOffer(id, user.id, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ data: { success: true, message: result.message } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error rejecting offer', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to reject offer' },
      { status: 500 }
    );
  }
}
