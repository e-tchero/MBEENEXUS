import { NextRequest, NextResponse } from 'next/server';
import { withRequestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';
import { getNotificationService } from '@/lib/notifications';

/**
 * GET /api/notifications
 *
 * List notifications for the authenticated user.
 * Supports pagination and unread-only filtering.
 */
export async function GET(request: NextRequest) {
  return withRequestContext(request, async (reqLogger) => {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const service = getNotificationService();
    const result = await service.listNotifications(user.id, { page, limit, unreadOnly });

    reqLogger.info('notifications.listed', {
      user_id: user.id,
      total: result.total,
      page,
      limit,
    });

    return NextResponse.json({
      data: result.notifications,
      total: result.total,
      page,
      limit,
      has_more: result.total > page * limit,
    });
  });
}
