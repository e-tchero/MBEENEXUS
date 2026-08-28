import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderOfferService } from '@/lib/services/rider-offer.service';

/**
 * GET /api/riders/offers/[id]
 * Get details for a specific offer.
 */
export async function GET(
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
    const offer = await riderOfferService.getOfferDetails(id, user.id);

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    return NextResponse.json({ data: offer });
  } catch (error) {
    logger.error('Error fetching offer details', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to fetch offer details' },
      { status: 500 }
    );
  }
}
