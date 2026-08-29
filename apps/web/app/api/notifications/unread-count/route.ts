import { NextRequest, NextResponse } from 'next/server';
import { withRequestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';
import { getNotificationService } from '@/lib/notifications';

/**
 * GET /api/notifications/unread-count
 *
 * Get the count of unread notifications for the authenticated user.
 */
export async function GET(request: NextRequest) {
  return withRequestContext(request, async (reqLogger) => {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = getNotificationService();
    const count = await service.getUnreadCount(user.id);

    reqLogger.info('notifications.unread_count', {
      user_id: user.id,
      count,
    });

    return NextResponse.json({ count });
  });
}
