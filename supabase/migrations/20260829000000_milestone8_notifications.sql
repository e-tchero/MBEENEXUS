-- =============================================
-- MILESTONE 8: NOTIFICATION SYSTEM
-- Adds notification_deliveries for provider tracking
-- and unique constraint for idempotency
-- =============================================

-- 1. Add provider tracking columns to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'in_app';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider_message_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- 2. Add unique constraint for idempotency (one notification per user+type+reference)
-- This prevents duplicate notifications for the same business event
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency
  ON notifications(user_id, type, reference_type, reference_id)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- 3. Create notification_deliveries table for tracking provider delivery attempts
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'permanent_failure')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes for notification_deliveries
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
  ON notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON notification_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_pending
  ON notification_deliveries(delivery_status, created_at)
  WHERE delivery_status IN ('pending', 'retrying');

-- 5. RLS for notification_deliveries (service-role only for writes)
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can read deliveries for their own notifications
CREATE POLICY "notification_deliveries_select_own"
  ON notification_deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications
      WHERE notifications.id = notification_deliveries.notification_id
      AND notifications.user_id = auth.uid()
    )
  );

-- No client-side inserts or updates (service-role only)
-- notification_deliveries are created/updated exclusively via service-role

-- 6. Updated_at trigger for notification_deliveries
CREATE OR REPLACE FUNCTION update_notification_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notification_deliveries_updated_at
  BEFORE UPDATE ON notification_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_deliveries_updated_at();

-- 7. Grant permissions
GRANT SELECT ON notification_deliveries TO authenticated;
GRANT ALL ON notification_deliveries TO service_role;
