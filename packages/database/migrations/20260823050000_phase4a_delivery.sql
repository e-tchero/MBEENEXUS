-- =============================================
-- PHASE 4A — Security Hardening & Active Delivery
-- =============================================

-- =============================================
-- 1. SECURITY: Remove dangerous RLS policies
-- =============================================

-- Remove rider direct UPDATE on orders (CRITICAL security hole)
DROP POLICY IF EXISTS "orders_update_rider" ON orders;

-- Remove customer direct UPDATE on orders
-- Customer cancellation will go through cancel_order() function instead
DROP POLICY IF EXISTS "orders_update_customer" ON orders;

-- =============================================
-- 2. STATE TRANSITION FUNCTION
-- =============================================

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
    "picked_up": ["in_transit", "arrived_at_destination", "cancelled"],
    "in_transit": ["arrived_at_destination", "cancelled"],
    "arrived_at_destination": ["delivered", "cancelled"],
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
      format('Invalid transition: %s → %s', v_order.status, p_target_status)::TEXT,
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
    format('Transition successful: %s → %s', v_order.status, p_target_status)::TEXT,
    p_target_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- =============================================
-- 3. COMPLETE DELIVERY FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION complete_delivery(
  p_order_id UUID,
  p_proof_type TEXT,
  p_file_url TEXT DEFAULT NULL,
  p_recipient_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_proof_latitude DECIMAL DEFAULT NULL,
  p_proof_longitude DECIMAL DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  proof_id UUID
) AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller_id UUID;
  v_proof_id UUID;
  v_commission_rate DECIMAL;
  v_rider_earning DECIMAL;
  v_platform_commission DECIMAL;
  v_existing_proof UUID;
  v_existing_earnings UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Lock the order row
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validate caller is assigned rider
  IF v_order.assigned_rider_id IS NULL OR v_order.assigned_rider_id != v_caller_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized: not the assigned rider'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validate order state
  IF v_order.status NOT IN ('arrived_at_destination', 'picked_up', 'in_transit') THEN
    RETURN QUERY SELECT FALSE,
      format('Cannot complete delivery from status: %s', v_order.status)::TEXT,
      NULL::UUID;
    RETURN;
  END IF;

  -- Validate proof type
  IF p_proof_type NOT IN ('photo', 'signature', 'pin', 'recipient_confirmation') THEN
    RETURN QUERY SELECT FALSE, 'Invalid proof type'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validate required fields based on proof type
  IF p_proof_type = 'photo' AND (p_file_url IS NULL OR p_file_url = '') THEN
    RETURN QUERY SELECT FALSE, 'Photo proof requires file_url'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_proof_type = 'recipient_confirmation' AND (p_recipient_name IS NULL OR p_recipient_name = '') THEN
    RETURN QUERY SELECT FALSE, 'Recipient confirmation requires recipient_name'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check for existing proof (idempotency)
  SELECT id INTO v_existing_proof
  FROM delivery_proofs
  WHERE order_id = p_order_id AND proof_type = p_proof_type
  LIMIT 1;

  IF v_existing_proof IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, 'Proof already submitted'::TEXT, v_existing_proof;
    RETURN;
  END IF;

  -- Create delivery proof record
  INSERT INTO delivery_proofs (order_id, rider_id, proof_type, file_url, recipient_name, notes, proof_latitude, proof_longitude)
  VALUES (p_order_id, v_caller_id, p_proof_type, p_file_url, p_recipient_name, p_notes, p_proof_latitude, p_proof_longitude)
  RETURNING id INTO v_proof_id;

  -- Update order status to delivered
  UPDATE orders
  SET status = 'delivered',
      delivered_at = NOW(),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Record order event
  INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_id, actor_type, metadata)
  VALUES (
    p_order_id,
    'delivery_completed',
    v_order.status,
    'delivered',
    v_caller_id,
    'rider',
    jsonb_build_object(
      'proof_id', v_proof_id,
      'proof_type', p_proof_type,
      'recipient_name', p_recipient_name
    )
  );

  -- Calculate earnings (idempotent)
  SELECT id INTO v_existing_earnings
  FROM earnings_ledger
  WHERE order_id = p_order_id AND reference_type = 'delivery'
  LIMIT 1;

  IF v_existing_earnings IS NULL THEN
    -- Read commission rate from platform_settings
    SELECT COALESCE((value->>'rate')::DECIMAL, 0.15) INTO v_commission_rate
    FROM platform_settings WHERE key = 'platform_commission_rate';

    v_commission_rate := COALESCE(v_commission_rate, 0.15);
    v_platform_commission := v_order.total_amount * v_commission_rate;
    v_rider_earning := v_order.total_amount - v_platform_commission;

    -- Create earnings ledger entry
    INSERT INTO earnings_ledger (rider_id, order_id, credit, debit, balance_after, description, reference_type, reference_id)
    VALUES (
      v_caller_id,
      p_order_id,
      v_rider_earning,
      0,
      v_rider_earning,
      format('Delivery earnings for order %s', v_order.order_number),
      'delivery',
      v_proof_id
    );
  END IF;

  -- Mark assignment as completed
  UPDATE rider_assignments
  SET status = 'completed', responded_at = NOW()
  WHERE order_id = p_order_id AND status = 'accepted';

  -- Restore rider availability
  UPDATE rider_current_locations
  SET is_available = TRUE
  WHERE rider_id = v_caller_id;

  RETURN QUERY SELECT TRUE, 'Delivery completed successfully'::TEXT, v_proof_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- =============================================
-- 4. CANCEL ORDER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION cancel_order(
  p_order_id UUID,
  p_actor_type TEXT,
  p_reason TEXT DEFAULT NULL
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

  -- Lock the order row
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND is_deleted = FALSE
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found'::TEXT;
    RETURN;
  END IF;

  -- Validate order is in a cancellable state
  IF v_order.status NOT IN ('rider_assigned', 'rider_en_route_to_pickup', 'arrived_at_pickup', 'searching_rider', 'paid') THEN
    RETURN QUERY SELECT FALSE,
      format('Cannot cancel order in status: %s', v_order.status)::TEXT;
    RETURN;
  END IF;

  -- Authorization
  IF p_actor_type = 'rider' THEN
    IF v_order.assigned_rider_id IS NULL OR v_order.assigned_rider_id != v_caller_id THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: not the assigned rider'::TEXT;
      RETURN;
    END IF;
    -- Rider cannot cancel after pickup
    IF v_order.status IN ('picked_up', 'in_transit', 'arrived_at_destination', 'delivered') THEN
      RETURN QUERY SELECT FALSE, 'Cannot cancel after package pickup'::TEXT;
      RETURN;
    END IF;

  ELSIF p_actor_type = 'customer' THEN
    IF v_order.customer_id != v_caller_id THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: not the order owner'::TEXT;
      RETURN;
    END IF;
    -- Customer cannot cancel after pickup
    IF v_order.status IN ('picked_up', 'in_transit', 'arrived_at_destination', 'delivered') THEN
      RETURN QUERY SELECT FALSE, 'Cannot cancel after package pickup'::TEXT;
      RETURN;
    END IF;

  ELSIF p_actor_type = 'admin' THEN
    IF NOT (get_user_role() IN ('admin', 'super_admin', 'operations')) THEN
      RETURN QUERY SELECT FALSE, 'Not authorized: admin role required'::TEXT;
      RETURN;
    END IF;

  ELSE
    RETURN QUERY SELECT FALSE, 'Invalid actor type'::TEXT;
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

  RETURN QUERY SELECT TRUE, 'Order cancelled successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- =============================================
-- 5. EARNINGS UNIQUE INDEX
-- =============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_earnings_ledger_order_delivery
  ON earnings_ledger (order_id)
  WHERE reference_type = 'delivery';

-- =============================================
-- 6. DELIVERY PROOFS RLS POLICY
-- =============================================

-- Allow riders to read their own proofs
CREATE POLICY "delivery_proofs_select_rider" ON delivery_proofs
  FOR SELECT USING (rider_id = auth.uid());

-- =============================================
-- 7. STORAGE BUCKET (will be created via API)
-- =============================================

-- Note: Storage bucket creation is handled by the application
-- This migration provides the database foundation only
