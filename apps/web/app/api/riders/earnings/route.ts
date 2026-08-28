import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { earningsService } from '@/lib/services/earnings.service';

// =============================================
// GET /api/riders/earnings
// =============================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get rider profile to verify rider role
    const { data: riderProfile, error: riderError } = await supabase
      .from('rider_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (riderError || !riderProfile) {
      return NextResponse.json(
        { error: 'Not authorized: not a rider' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const referenceType = searchParams.get('reference_type') || undefined;

    // Validate parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page parameter' },
        { status: 400 }
      );
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (1-100)' },
        { status: 400 }
      );
    }

    // Get earnings history
    const result = await earningsService.getEarningsHistory(
      user.id,
      page,
      limit,
      referenceType
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[EARNINGS] Error fetching earnings', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
