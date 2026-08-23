import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderOfferService } from '@/lib/services/rider-offer.service';

/**
 * GET /api/riders/offers
 * List pending offers for the authenticated rider.
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

    const offers = await riderOfferService.getPendingOffers(user.id);

    return NextResponse.json({ data: offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}
