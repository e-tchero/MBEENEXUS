import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/orders/[id]/cancel
 * Customer cancellation with refund processing.
 *
 * Authentication: Required (customer session)
 * Authorization: auth.uid() must equal orders.customer_id
 *
 * Request body:
 * - reason: string (optional)
 *
 * Response:
 * - success: boolean
 * - message: string
 * - refund_initiated: boolean
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
    const { reason } = body;

    // Use service role for the SECURITY DEFINER function call
    const serviceRole = await createServiceRoleClient();

    // Call cancel_order() — derives authorization from auth.uid()
    // The function verifies customer_id matches the authenticated user
    const { data, error } = await serviceRole.rpc('cancel_order', {
      p_order_id: id,
      p_actor_type: 'customer',
      p_reason: reason || null,
    });

    if (error) {
      logger.error('Cancel order error', {}, error instanceof Error ? error : undefined);
      return NextResponse.json(
        { error: 'Failed to cancel order' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No result from cancellation' },
        { status: 500 }
      );
    }

    const result = data[0];

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
        refund_initiated: result.refund_initiated,
      },
    });
  } catch (error) {
    logger.error('Error cancelling order', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
