import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { activeDeliveryService } from '@/lib/services/active-delivery.service';

/**
 * GET /api/riders/deliveries/[orderId]
 * Get delivery details for the rider's active delivery.
 */
export async function GET(
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
    const delivery = await activeDeliveryService.getActiveDelivery(user.id);

    if (!delivery || delivery.order_id !== orderId) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: delivery });
  } catch (error) {
    console.error('Error fetching delivery details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery details' },
      { status: 500 }
    );
  }
}
