import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminService } from '@/lib/services/admin.service';

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

    if (!id) {
      return NextResponse.json({ error: 'Rider ID required' }, { status: 400 });
    }

    const rider = await adminService.getRiderDetail(user.id, id);

    return NextResponse.json({ data: rider });
  } catch (error: any) {
    logger.error('Error getting rider detail', {}, error instanceof Error ? error : undefined);

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to get rider detail' },
      { status: 500 }
    );
  }
}
