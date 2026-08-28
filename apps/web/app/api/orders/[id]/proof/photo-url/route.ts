import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const SIGNED_URL_EXPIRY = 1800; // 30 minutes

/**
 * GET /api/orders/[id]/proof/photo-url
 * Generate a signed URL for the customer to view delivery proof photo.
 *
 * Authentication: Required (customer session)
 * Authorization: auth.uid() must equal orders.customer_id
 * Returns: Signed URL with 30-minute expiry
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

    // Get delivery proof with file_url
    const { data: proof, error: proofError } = await serviceRole
      .from('delivery_proofs')
      .select('id, file_url')
      .eq('order_id', id)
      .not('file_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (proofError || !proof || !proof.file_url) {
      return NextResponse.json(
        { error: 'No photo proof available' },
        { status: 404 }
      );
    }

    // The file_url is a storage path — generate a signed URL
    // If it's already a signed URL, return it (but check expiry)
    const storagePath = proof.file_url;

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await serviceRole.storage
      .from('delivery-proofs')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signedUrlError) {
      logger.error('proof_photo_url.generation_failed', {
        order_id: id,
        proof_id: proof.id,
      });
      return NextResponse.json(
        { error: 'Failed to generate photo URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        signed_url: signedUrlData.signedUrl,
        expires_in: SIGNED_URL_EXPIRY,
      },
    });
  } catch (error) {
    logger.error('proof_photo_url.error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
