import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { earningsService } from '@/lib/services/earnings.service';

// =============================================
// GET /api/riders/earnings/summary
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

    // Get earnings summary
    const result = await earningsService.getEarningsSummary(user.id);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[EARNINGS] Error fetching earnings summary', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
