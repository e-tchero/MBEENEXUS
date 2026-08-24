import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/riders/deliveries/[orderId]/fail
 * Rider reports delivery failure.
 *
 * Authentication: Required (rider session)
 * Authorization: auth.uid() must equal orders.assigned_rider_id
 *
 * Request body:
 * - failure_type: string (required) — one of:
 *   recipient_unavailable, wrong_address, package_damaged,
 *   rider_emergency, unable_to_locate, other
 * - reason: string (required)
 *
 * Response:
 * - success: boolean
 * - message: string
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
    const body = await request.json().catch(() => ({}));
    const { failure_type, reason } = body;

    // Validate required fields
    if (!failure_type) {
      return NextResponse.json(
        { error: 'failure_type is required' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      );
    }

    // Validate failure_type
    const validFailureTypes = [
      'recipient_unavailable',
      'wrong_address',
      'package_damaged',
      'rider_emergency',
      'unable_to_locate',
      'other',
    ];

    if (!validFailureTypes.includes(failure_type)) {
      return NextResponse.json(
        { error: `Invalid failure_type. Must be one of: ${validFailureTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Use service role for the SECURITY DEFINER function call
    const serviceRole = await createServiceRoleClient();

    // Call fail_delivery() — derives authorization from auth.uid()
    // The function verifies assigned_rider_id matches the authenticated user
    const { data, error } = await serviceRole.rpc('fail_delivery', {
      p_order_id: orderId,
      p_failure_type: failure_type,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error('Fail delivery error:', error);
      return NextResponse.json(
        { error: 'Failed to report delivery failure' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No result from failure report' },
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
      },
    });
  } catch (error) {
    console.error('Error reporting delivery failure:', error);
    return NextResponse.json(
      { error: 'Failed to report delivery failure' },
      { status: 500 }
    );
  }
}
