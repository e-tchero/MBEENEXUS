import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { activeDeliveryService } from '@/lib/services/active-delivery.service';

/**
 * POST /api/riders/deliveries/[orderId]/arrive-destination
 * Confirm arrival at destination.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
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

    const { orderId } = await params;
    const result = await activeDeliveryService.transitionStatus(
      orderId,
      'arrived_at_destination',
      'rider'
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        success: true,
        message: result.message,
        status: result.new_status,
      },
    });
  } catch (error) {
    logger.error('Error confirming destination arrival', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to confirm destination arrival' },
      { status: 500 }
    );
  }
}
