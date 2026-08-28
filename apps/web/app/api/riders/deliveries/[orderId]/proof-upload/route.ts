import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/riders/deliveries/[orderId]/proof-upload
 * Upload a delivery proof photo to Supabase Storage.
 *
 * Authentication: Required (rider session)
 * Authorization: Rider must be assigned to the order
 * Validation: File type (JPEG/PNG/WebP), file size (≤10MB), order status
 *
 * Request: multipart/form-data with 'file' field
 * Response: { data: { file_url, storage_path } }
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

    // Validate order exists and is assigned to this rider
    const serviceRole = await createServiceRoleClient();
    const { data: order, error: orderError } = await serviceRole
      .from('orders')
      .select('id, assigned_rider_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.assigned_rider_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate order status allows proof upload
    if (!['in_transit', 'arrived_at_destination'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Order must be in transit or arrived at destination to upload proof' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate storage path: {order_id}/{rider_id}/{timestamp}-{uuid}.{ext}
    const ext = file.type.split('/')[1] || 'jpg';
    const timestamp = Math.floor(Date.now() / 1000);
    const randomId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    const storagePath = `${orderId}/${user.id}/${timestamp}-${randomId}.${ext}`;

    // Convert File to ArrayBuffer then to Uint8Array for Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await serviceRole.storage
      .from('delivery-proofs')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('proof_upload.storage_failed', {
        order_id: orderId,
        rider_id: user.id,
        error: uploadError.message,
      });
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Generate a signed URL for the uploaded file (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await serviceRole.storage
      .from('delivery-proofs')
      .createSignedUrl(storagePath, 3600);

    if (signedUrlError) {
      logger.error('proof_upload.signed_url_failed', {
        order_id: orderId,
        storage_path: storagePath,
      });
      // Upload succeeded but signed URL failed — still return the path
      return NextResponse.json({
        data: {
          storage_path: storagePath,
          file_url: null,
          message: 'File uploaded but signed URL generation failed',
        },
      });
    }

    return NextResponse.json({
      data: {
        storage_path: storagePath,
        file_url: signedUrlData.signedUrl,
        expires_in: 3600,
      },
    });
  } catch (error) {
    logger.error('proof_upload.error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to upload delivery proof' },
      { status: 500 }
    );
  }
}
