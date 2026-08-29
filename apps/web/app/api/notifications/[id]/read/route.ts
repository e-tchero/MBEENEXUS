import { NextRequest, NextResponse } from 'next/server';
import { withRequestContext } from '@/lib/request-context';
import { createClient } from '@/lib/supabase/server';
import { getNotificationService } from '@/lib/notifications';

/**
 * PUT /api/notifications/[id]/read
 *
 * Mark a single notification as read.
 * Users can only mark their own notifications.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRequestContext(request, async (reqLogger) => {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 });
    }

    const service = getNotificationService();
    const success = await service.markAsRead(id, user.id);

    if (!success) {
      return NextResponse.json({ error: 'Notification not found or already read' }, { status: 404 });
    }

    reqLogger.info('notifications.marked_read', {
      notification_id: id,
      user_id: user.id,
    });

    return NextResponse.json({ success: true });
  });
}
