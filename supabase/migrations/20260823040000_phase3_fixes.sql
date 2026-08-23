-- =============================================
-- PHASE 3 FIXES — Atomic Job Claiming + Configurable Dispatch
-- =============================================

-- 1. Atomic job claiming with FOR UPDATE SKIP LOCKED
-- This function atomically claims the next pending job, preventing
-- concurrent workers from processing the same job.
CREATE OR REPLACE FUNCTION claim_next_pending_job()
RETURNS TABLE (
  id UUID,
  job_type TEXT,
  payload JSONB,
  priority INTEGER,
  attempts INTEGER,
  max_attempts INTEGER,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMZ
) AS $$
BEGIN
  RETURN QUERY
  UPDATE background_jobs
  SET
    status = 'processing',
    started_at = NOW(),
    updated_at = NOW()
  WHERE background_jobs.id = (
    SELECT bj.id
    FROM background_jobs bj
    WHERE bj.status = 'pending'
      AND bj.scheduled_at <= NOW()
    ORDER BY bj.priority DESC, bj.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING
    background_jobs.id,
    background_jobs.job_type,
    background_jobs.payload,
    background_jobs.priority,
    background_jobs.attempts,
    background_jobs.max_attempts,
    background_jobs.scheduled_at,
    background_jobs.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Make dispatch_rider_v2() read config from platform_settings
-- instead of hardcoding radius/timeout values.
CREATE OR REPLACE FUNCTION dispatch_rider_v2(p_order_id UUID)
RETURNS TABLE (success BOOLEAN, rider_id UUID, message TEXT) AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_rider RECORD;
  v_assignment_id UUID;
  v_radius_km DECIMAL;
  v_offer_timeout_seconds INTEGER;
  v_max_riders INTEGER;
BEGIN
  -- Read dispatch config from platform_settings
  SELECT COALESCE((value->>'km')::DECIMAL, 10) INTO v_radius_km
  FROM platform_settings WHERE key = 'dispatch_radius_km';

  SELECT COALESCE((value->>'seconds')::INTEGER, 30) INTO v_offer_timeout_seconds
  FROM platform_settings WHERE key = 'dispatch_offer_timeout_seconds';

  SELECT COALESCE((value->>'count')::INTEGER, 1) INTO v_max_riders
  FROM platform_settings WHERE key = 'dispatch_max_riders_per_attempt';

  -- Apply defaults if settings not found
  v_radius_km := COALESCE(v_radius_km, 10);
  v_offer_timeout_seconds := COALESCE(v_offer_timeout_seconds, 30);
  v_max_riders := COALESCE(v_max_riders, 1);

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_order.status NOT IN ('paid', 'searching_rider') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Order not in dispatchable state'::TEXT;
    RETURN;
  END IF;

  UPDATE orders SET status = 'searching_rider', updated_at = NOW() WHERE id = p_order_id;

  FOR v_rider IN
    SELECT * FROM find_nearest_riders(
      v_order.pickup_latitude, v_order.pickup_longitude, v_radius_km, v_max_riders
    )
  LOOP
    BEGIN
      INSERT INTO rider_assignments (order_id, rider_id, status, expires_at)
      VALUES (p_order_id, v_rider.rider_id, 'offered', NOW() + (v_offer_timeout_seconds || ' seconds')::INTERVAL)
      RETURNING id INTO v_assignment_id;

      UPDATE rider_current_locations SET is_available = FALSE
      WHERE rider_id = v_rider.rider_id;

      -- Order stays searching_rider until rider accepts
      RETURN QUERY SELECT TRUE, v_rider.rider_id, 'Offer sent to rider'::TEXT;
      RETURN;

    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = p_order_id;
  RETURN QUERY SELECT FALSE, NULL::UUID, 'No eligible riders available'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a unique constraint on background_jobs to prevent duplicate
-- DISPATCH_RETRY jobs for the same order when one is already pending.
-- Uses a partial unique index on (job_type, payload) WHERE status IN ('pending', 'processing')
CREATE UNIQUE INDEX IF NOT EXISTS idx_background_jobs_no_duplicate_retry
  ON background_jobs (job_type, (payload->>'order_id'))
  WHERE status IN ('pending', 'processing')
    AND job_type IN ('DISPATCH_RETRY', 'OFFER_TIMEOUT');
