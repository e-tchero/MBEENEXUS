-- =============================================
-- PHASE 4C: CANCELLATION, FAILURE & REFUND
-- =============================================
-- 1. Add paystack_transaction_id to payments
-- 2. Create fail_delivery() function
-- 3. Modify cancel_order() to create refund + job
-- 4. Add refund idempotency index
-- 5. Add cancellation policy settings
-- 6. Update transition_order_status() for rider failures
-- =============================================

-- =============================================
-- 1. ADD PAYSTACK TRANSACTION ID TO PAYMENTS
-- =============================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS paystack_transaction_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_paystack_txn ON payments(paystack_transaction_id);

-- =============================================
-- 2. REFUND IDEMPOTENCY INDEX
-- =============================================

-- Prevent duplicate pending/processing refunds per order
-- Uses partial unique index so completed/failed refunds don't block new ones
CREATE UNIQUE INDEX IF NOT EXISTS idx_refunds_one_pending_per_order
  ON refunds (order_id)
  WHERE status IN ('pending', 'processing');

-- =============================================
-- 3. FAIL DELIVERY FUNCTION
-- =============================================

DROP FUNCTION IF EXISTS fail_delivery(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION fail_delivery(
  p_order_id UUID,
  p_failure_type TEXT,
  p_reason TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT;
    RETURN;
  END IF;

  -- Validate failure_type
  IF p_failure_type NOT IN (
    'recipient_unavailable', 'wrong_address', 'package_damaged',
    'rider_emergency', 'unable_to_locate', 'other'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Invalid failure type'::TEXT;
    RETURN;
  END IF;

  -- Validate reason is provided
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN QUERY SELECT FALSE, 'Failure reason is required'::TEXT;
    RETURN;
  END IF;

  -- Lock the order row
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found'::TEXT;
    RETURN;
  END IF;

  -- Validate caller is assigned rider
  IF v_order.assigned_rider_id IS NULL OR v_order.assigned_rider_id != v_caller_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized: not the assigned rider'::TEXT;
    RETURN;
  END IF;

  -- Validate order is in a failure-eligible state
  IF v_order.status NOT IN (
    'rider_assigned', 'rider_en_route_to_pickup',
    'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_destination'
  ) THEN
    RETURN QUERY SELECT FALSE,
      format('Cannot report failure from status: %s', v_order.status)::TEXT;
    RETURN;
  END IF;

  -- Transition order to failed
  UPDATE orders
  SET status = 'failed',
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Cancel active rider assignments
  UPDATE rider_assignments
  SET status = 'cancelled', responded_at = NOW()
  WHERE order_id = p_order_id AND status IN ('offered', 'accepted');

  -- Restore rider availability
  UPDATE rider_current_locations
  SET is_available = TRUE
  WHERE rider_id = v_caller_id;

  -- Record order event
  INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_id, actor_type, metadata)
  VALUES (
    p_order_id,
    'delivery_failed',
    v_order.status,
    'failed',
    v_caller_id,
    'rider',
    jsonb_build_object(
      'failure_type', p_failure_type,
      'reason', p_reason
    )
  );

  -- Record status history
  INSERT INTO order_status_history (order_id, status, notes, created_by)
  VALUES (p_order_id, 'failed', format('Delivery failed: %s - %s', p_failure_type, p_reason), v_caller_id);

  RETURN QUERY SELECT TRUE, 'Delivery failure reported'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- =============================================
-- 4. CANCEL ORDER WITH REFUND
-- =============================================

DROP FUNCTION IF EXISTS cancel_order(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id UUID,
  p_actor_type TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  refund_initiated BOOLEAN
) AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_payment payments%ROWTYPE;
  v_caller_id UUID;
  v_refund_id UUID;
  v_refund_initiated BOOLEAN := FALSE;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Lock the order row
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Validate order is in a cancellable state
  IF v_order.status NOT IN (
    'paid', 'searching_rider', 'rider_assigned',
    'rider_en_route_to_pickup', 'arrived_at_pickup'
  ) THEN
    RETURN QUERY SELECT FALSE,
      format('Cannot cancel order in status: %s', v_order.status)::TEXT,
      FALSE;
    RETURN;
  END IF;

  -- Authorization
  IF p_actor_type = 'rider' THEN
    IF v_order.assigned_rider_id IS NULL OR v_order.assigned_rider_id != v_caller_id THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: not the assigned rider'::TEXT, FALSE;
      RETURN;
    END IF;
    -- Rider cannot cancel after pickup
    IF v_order.status IN ('picked_up', 'in_transit', 'arrived_at_destination', 'delivered') THEN
      RETURN QUERY SELECT FALSE, 'Cannot cancel after package pickup'::TEXT, FALSE;
      RETURN;
    END IF;

  ELSIF p_actor_type = 'customer' THEN
    IF v_order.customer_id != v_caller_id THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: not the order owner'::TEXT, FALSE;
      RETURN;
    END IF;
    -- Customer cannot cancel after pickup
    IF v_order.status IN ('picked_up', 'in_transit', 'arrived_at_destination', 'delivered') THEN
      RETURN QUERY SELECT FALSE, 'Cannot cancel after package pickup'::TEXT, FALSE;
      RETURN;
    END IF;

  ELSIF p_actor_type = 'admin' THEN
    IF NOT (get_user_role() IN ('admin', 'super_admin', 'operations')) THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: admin role required'::TEXT, FALSE;
      RETURN;
    END IF;

  ELSE
    RETURN QUERY SELECT FALSE, 'Invalid actor type'::TEXT, FALSE;
    RETURN;
  END IF;

  -- Perform cancellation
  UPDATE orders
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancelled_by = v_caller_id,
      cancellation_reason = COALESCE(p_reason, 'No reason provided'),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Cancel active assignments
  UPDATE rider_assignments
  SET status = 'cancelled', responded_at = NOW()
  WHERE order_id = p_order_id AND status IN ('offered', 'accepted');

  -- Restore rider availability
  IF v_order.assigned_rider_id IS NOT NULL THEN
    UPDATE rider_current_locations
    SET is_available = TRUE
    WHERE rider_id = v_order.assigned_rider_id;
  END IF;

  -- Record order event
  INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_id, actor_type, metadata)
  VALUES (
    p_order_id,
    'order_cancelled',
    v_order.status,
    'cancelled',
    v_caller_id,
    p_actor_type,
    jsonb_build_object('reason', p_reason)
  );

  -- Initiate refund if payment was captured
  IF v_order.status IN ('paid', 'searching_rider', 'rider_assigned',
                         'rider_en_route_to_pickup', 'arrived_at_pickup',
                         'picked_up', 'in_transit', 'arrived_at_destination') THEN

    -- Find the successful payment for this order
    SELECT * INTO v_payment
    FROM payments
    WHERE order_id = p_order_id AND status = 'success'
    LIMIT 1;

    IF v_payment IS NOT NULL THEN
      -- Check for existing refund (idempotency)
      SELECT id INTO v_refund_id
      FROM refunds
      WHERE order_id = p_order_id
      LIMIT 1;

      IF v_refund_id IS NULL THEN
        -- Create refund record
        INSERT INTO refunds (payment_id, order_id, amount, reason, refund_type, status, metadata)
        VALUES (
          v_payment.id,
          p_order_id,
          v_payment.amount,
          COALESCE(p_reason, 'Order cancelled'),
          'full',
          'pending',
          jsonb_build_object(
            'cancelled_by', v_caller_id,
            'actor_type', p_actor_type,
            'paystack_reference', v_payment.paystack_reference,
            'paystack_transaction_id', v_payment.paystack_transaction_id
          )
        )
        RETURNING id INTO v_refund_id;

        -- Create REFUND_PROCESS background job
        INSERT INTO background_jobs (job_type, payload, priority)
        VALUES (
          'REFUND_PROCESS',
          jsonb_build_object(
            'refund_id', v_refund_id,
            'order_id', p_order_id,
            'payment_id', v_payment.id,
            'amount', v_payment.amount,
            'paystack_reference', v_payment.paystack_reference,
            'paystack_transaction_id', v_payment.paystack_transaction_id
          ),
          5
        );

        v_refund_initiated := TRUE;

        -- Record refund initiated event
        INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_id, actor_type, metadata)
        VALUES (
          p_order_id,
          'refund_initiated',
          'cancelled',
          'cancelled',
          v_caller_id,
          p_actor_type,
          jsonb_build_object('refund_id', v_refund_id, 'amount', v_payment.amount)
        );
      ELSE
        -- Refund already exists — check if it needs processing
        v_refund_initiated := TRUE;
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, 'Order cancelled successfully'::TEXT, v_refund_initiated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- =============================================
-- 5. UPDATE transition_order_status() FOR RIDER FAILURES
-- =============================================

DROP FUNCTION IF EXISTS transition_order_status(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id UUID,
  p_target_status TEXT,
  p_actor_type TEXT DEFAULT 'rider',
  p_cancellation_reason TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_status TEXT
) AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller_id UUID;
  v_valid_transitions JSONB;
  v_allowed_next JSONB;
  v_timestamp_column TEXT;
BEGIN
  -- Get the authenticated user
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Lock the order row to prevent concurrent transitions
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Define valid transitions
  v_valid_transitions := '{
    "rider_assigned": ["rider_en_route_to_pickup", "cancelled", "failed"],
    "rider_en_route_to_pickup": ["arrived_at_pickup", "cancelled", "failed"],
    "arrived_at_pickup": ["picked_up", "cancelled", "failed"],
    "picked_up": ["in_transit", "arrived_at_destination", "cancelled", "failed"],
    "in_transit": ["arrived_at_destination", "cancelled", "failed"],
    "arrived_at_destination": ["delivered", "cancelled", "failed"],
    "delivered": ["completed"]
  }'::JSONB;

  -- Get allowed next states for current status
  v_allowed_next := v_valid_transitions -> v_order.status;

  -- If no transitions defined for this status, reject
  IF v_allowed_next IS NULL THEN
    RETURN QUERY SELECT FALSE,
      format('No transitions allowed from status: %s', v_order.status)::TEXT,
      v_order.status;
    RETURN;
  END IF;

  -- Check if target status is allowed
  IF NOT (v_allowed_next @> to_jsonb(p_target_status)) THEN
    RETURN QUERY SELECT FALSE,
      format('Invalid transition: %s -> %s', v_order.status, p_target_status)::TEXT,
      v_order.status;
    RETURN;
  END IF;

  -- Authorization checks
  IF p_actor_type = 'rider' THEN
    -- Rider must be the assigned rider
    IF v_order.assigned_rider_id IS NULL OR v_order.assigned_rider_id != v_caller_id THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: not the assigned rider'::TEXT, v_order.status;
      RETURN;
    END IF;

    -- Rider cannot cancel after pickup
    IF p_target_status = 'cancelled' AND v_order.status IN ('picked_up', 'in_transit', 'arrived_at_destination', 'delivered') THEN
      RETURN QUERY SELECT FALSE, 'Cannot cancel after package pickup'::TEXT, v_order.status;
      RETURN;
    END IF;

  ELSIF p_actor_type = 'customer' THEN
    -- Customer must be the order owner
    IF v_order.customer_id != v_caller_id THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: not the order owner'::TEXT, v_order.status;
      RETURN;
    END IF;

    -- Customer can only cancel
    IF p_target_status != 'cancelled' THEN
      RETURN QUERY SELECT FALSE, 'Customers can only cancel orders'::TEXT, v_order.status;
      RETURN;
    END IF;

    -- Customer cannot cancel after pickup
    IF v_order.status IN ('picked_up', 'in_transit', 'arrived_at_destination', 'delivered') THEN
      RETURN QUERY SELECT FALSE, 'Cannot cancel after package pickup'::TEXT, v_order.status;
      RETURN;
    END IF;

  ELSIF p_actor_type = 'admin' THEN
    -- Admin can perform any valid transition
    IF NOT (get_user_role() IN ('admin', 'super_admin', 'operations')) THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: admin role required'::TEXT, v_order.status;
      RETURN;
    END IF;

  ELSIF p_actor_type = 'system' THEN
    -- System transitions (background jobs, service-role)
    -- Only allowed through service-role client (bypasses RLS)

  ELSE
    RETURN QUERY SELECT FALSE, format('Unknown actor type: %s', p_actor_type)::TEXT, v_order.status;
    RETURN;
  END IF;

  -- Determine timestamp column to update
  v_timestamp_column := CASE p_target_status
    WHEN 'rider_en_route_to_pickup' THEN NULL
    WHEN 'arrived_at_pickup' THEN 'rider_arrived_at_pickup'
    WHEN 'picked_up' THEN 'rider_picked_up_at'
    WHEN 'arrived_at_destination' THEN 'rider_arrived_at_destination'
    WHEN 'delivered' THEN 'delivered_at'
    WHEN 'completed' THEN 'completed_at'
    WHEN 'cancelled' THEN 'cancelled_at'
    WHEN 'failed' THEN NULL
    ELSE NULL
  END;

  -- Update order status and appropriate timestamp
  IF v_timestamp_column IS NOT NULL THEN
    EXECUTE format(
      'UPDATE orders SET status = $1, %I = NOW(), updated_at = NOW() WHERE id = $2',
      v_timestamp_column
    ) USING p_target_status, p_order_id;
  ELSE
    UPDATE orders SET status = p_target_status, updated_at = NOW()
    WHERE id = p_order_id;
  END IF;

  -- Handle cancellation fields
  IF p_target_status = 'cancelled' THEN
    UPDATE orders
    SET cancelled_at = NOW(),
        cancelled_by = v_caller_id,
        cancellation_reason = COALESCE(p_cancellation_reason, 'No reason provided')
    WHERE id = p_order_id;

    -- Cancel active assignment if exists
    UPDATE rider_assignments
    SET status = 'cancelled', responded_at = NOW()
    WHERE order_id = p_order_id AND status IN ('offered', 'accepted');

    -- Restore rider availability
    UPDATE rider_current_locations
    SET is_available = TRUE
    WHERE rider_id = v_order.assigned_rider_id
      AND v_order.assigned_rider_id IS NOT NULL;
  END IF;

  -- Handle failure: cancel assignments and restore availability
  IF p_target_status = 'failed' THEN
    UPDATE rider_assignments
    SET status = 'cancelled', responded_at = NOW()
    WHERE order_id = p_order_id AND status IN ('offered', 'accepted');

    UPDATE rider_current_locations
    SET is_available = TRUE
    WHERE rider_id = v_order.assigned_rider_id
      AND v_order.assigned_rider_id IS NOT NULL;
  END IF;

  -- Complete assignment when order is completed
  IF p_target_status = 'completed' THEN
    UPDATE rider_assignments
    SET status = 'completed', responded_at = NOW()
    WHERE order_id = p_order_id AND status = 'accepted';
  END IF;

  -- Record order event
  INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_id, actor_type, metadata)
  VALUES (
    p_order_id,
    'status_transition',
    v_order.status,
    p_target_status,
    v_caller_id,
    p_actor_type,
    jsonb_build_object(
      'previous_status', v_order.status,
      'target_status', p_target_status,
      'cancellation_reason', p_cancellation_reason
    )
  );

  RETURN QUERY SELECT TRUE,
    format('Transition successful: %s -> %s', v_order.status, p_target_status)::TEXT,
    p_target_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- =============================================
-- 6. CANCELLATION POLICY SETTINGS
-- =============================================

INSERT INTO platform_settings (key, value, category, description)
VALUES
  ('cancellation_refund_enabled', '{"enabled": true}'::jsonb, 'cancellation', 'Enable refunds on order cancellation'),
  ('cancellation_refund_before_dispatch', '{"enabled": true}'::jsonb, 'cancellation', 'Refund before rider is dispatched'),
  ('cancellation_refund_after_dispatch', '{"enabled": true}'::jsonb, 'cancellation', 'Refund after rider is dispatched but before pickup')
ON CONFLICT (key) DO NOTHING;
