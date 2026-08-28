import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { refundService } from '@/lib/services/refund.service';

/**
 * GET /api/orders/[id]/refund
 * Customer reads refund status for their order.
 *
 * Authentication: Required (customer session)
 * Authorization: auth.uid() must equal orders.customer_id
 *
 * Response:
 * - refund_id: string
 * - order_id: string
 * - amount: number
 * - status: string
 * - reason: string
 * - created_at: string
 * - updated_at: string
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

    const refund = await refundService.getRefundByOrderId(id, user.id);

    if (!refund) {
      return NextResponse.json(
        { error: 'No refund found for this order' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: refund });
  } catch (error) {
    logger.error('Error fetching refund status', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to fetch refund status' },
      { status: 500 }
    );
  }
}
