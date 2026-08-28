import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminService } from '@/lib/services/admin.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/orders/[id]
 * Get order detail for admin view.
 * Requires admin authorization.
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

    const order = await adminService.getOrderDetail(user.id, id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    if (error instanceof Error && error.message.includes('admin role required')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error('Error getting admin order detail', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to get order detail' },
      { status: 500 }
    );
  }
}
