import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { activeDeliveryService } from '@/lib/services/active-delivery.service';

/**
 * POST /api/riders/deliveries/[orderId]/complete
 * Complete delivery with proof of delivery.
 *
 * Request body:
 * - proof_type: 'photo' | 'recipient_confirmation' (required)
 * - file_url: string (required for photo)
 * - recipient_name: string (required for recipient_confirmation)
 * - notes: string (optional)
 * - proof_latitude: number (optional)
 * - proof_longitude: number (optional)
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
    const body = await request.json();

    const { proof_type, file_url, recipient_name, notes, proof_latitude, proof_longitude } = body;

    // Validate required fields
    if (!proof_type) {
      return NextResponse.json(
        { error: 'proof_type is required' },
        { status: 400 }
      );
    }

    if (!['photo', 'recipient_confirmation'].includes(proof_type)) {
      return NextResponse.json(
        { error: 'Invalid proof_type. Must be photo or recipient_confirmation' },
        { status: 400 }
      );
    }

    if (proof_type === 'photo' && !file_url) {
      return NextResponse.json(
        { error: 'file_url is required for photo proof' },
        { status: 400 }
      );
    }

    if (proof_type === 'recipient_confirmation' && !recipient_name) {
      return NextResponse.json(
        { error: 'recipient_name is required for recipient_confirmation' },
        { status: 400 }
      );
    }

    const result = await activeDeliveryService.completeDelivery(
      orderId,
      proof_type,
      file_url,
      recipient_name,
      notes,
      proof_latitude,
      proof_longitude
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
        proof_id: result.proof_id,
      },
    });
  } catch (error) {
    console.error('Error completing delivery:', error);
    return NextResponse.json(
      { error: 'Failed to complete delivery' },
      { status: 500 }
    );
  }
}
