import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/orders/[id]/proof
 * Customer retrieves delivery proof for their order.
 *
 * Authentication: Required (customer session)
 * Authorization: auth.uid() must equal orders.customer_id
 * Returns: Text-based proof info (recipient_name, notes, timestamp)
 * Note: No storage bucket created — photo proof deferred to Phase 5D
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
    const serviceRole = await createServiceRoleClient();

    // Verify order exists and belongs to customer
    const { data: order, error: orderError } = await serviceRole
      .from('orders')
      .select('id, customer_id')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get delivery proof
    const { data: proof, error: proofError } = await serviceRole
      .from('delivery_proofs')
      .select('id, proof_type, recipient_name, notes, recorded_at, created_at')
      .eq('order_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (proofError || !proof) {
      return NextResponse.json({ error: 'No delivery proof found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        proof_id: proof.id,
        proof_type: proof.proof_type,
        recipient_name: proof.recipient_name,
        notes: proof.notes,
        recorded_at: proof.recorded_at,
        created_at: proof.created_at,
      },
    });
  } catch (error) {
    logger.error('[PROOF] Error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
