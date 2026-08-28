import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminService } from '@/lib/services/admin.service';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/orders/[id]/cancel
 * Cancel an order (admin only).
 * Uses the existing cancel_order() PostgreSQL function.
 * Requires admin authorization.
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

    const result = await adminService.cancelOrder(user.id, id, reason);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message.includes('admin role required')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error('Error cancelling order (admin)', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
