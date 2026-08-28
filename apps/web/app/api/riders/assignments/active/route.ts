import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderOfferService } from '@/lib/services/rider-offer.service';

/**
 * GET /api/riders/assignments/active
 * Get the rider's current active assignment.
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

    const assignment = await riderOfferService.getActiveAssignment(user.id);

    return NextResponse.json({ data: assignment });
  } catch (error) {
    logger.error('Error fetching active assignment', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to fetch active assignment' },
      { status: 500 }
    );
  }
}
