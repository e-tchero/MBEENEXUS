import { NextRequest, NextResponse } from 'next/server';
import { withRequestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';
import { getNotificationService } from '@/lib/notifications';

/**
 * PUT /api/notifications/read-all
 *
 * Mark all unread notifications as read for the authenticated user.
 */
export async function PUT(request: NextRequest) {
  return withRequestContext(request, async (reqLogger) => {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = getNotificationService();
    const count = await service.markAllAsRead(user.id);

    reqLogger.info('notifications.all_marked_read', {
      user_id: user.id,
      count,
    });

    return NextResponse.json({ success: true, count });
  });
}
