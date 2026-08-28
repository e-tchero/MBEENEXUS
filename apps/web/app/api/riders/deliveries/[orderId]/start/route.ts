import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { activeDeliveryService } from '@/lib/services/active-delivery.service';

/**
 * POST /api/riders/deliveries/[orderId]/start
 * Start delivery - rider is en route to pickup.
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
      'rider_en_route_to_pickup',
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
    logger.error('Error starting delivery', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to start delivery' },
      { status: 500 }
    );
  }
}
