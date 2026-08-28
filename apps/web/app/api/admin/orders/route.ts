import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminService } from '@/lib/services/admin.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/orders
 * List orders for admin management.
 * Requires admin authorization.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.split(',').filter(Boolean);
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await adminService.listOrders(user.id, {
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message.includes('admin role required')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    logger.error('Error listing admin orders', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to list orders' },
      { status: 500 }
    );
  }
}
