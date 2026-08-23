-- =============================================
-- PHASE 4B: EARNINGS CONSISTENCY FIX
-- =============================================
-- This migration fixes the complete_delivery() function to:
-- 1. Calculate balance_after as the true running balance
-- 2. Update rider_profiles.cached_total_earnings
-- 3. Update rider_profiles.total_deliveries
-- =============================================

-- Drop the existing function first to allow signature/behavior changes
DROP FUNCTION IF EXISTS complete_delivery(UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL, DECIMAL);

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
  v_current_balance DECIMAL;
  v_new_balance DECIMAL;
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

  -- Calculate earnings (idempotent - check for existing)
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

    -- Get current running balance for this rider
    SELECT COALESCE(
      (SELECT balance_after
       FROM earnings_ledger
       WHERE rider_id = v_caller_id
       ORDER BY created_at DESC
       LIMIT 1),
      0
    ) INTO v_current_balance;

    -- Calculate new running balance
    v_new_balance := v_current_balance + v_rider_earning;

    -- Create earnings ledger entry with correct running balance
    INSERT INTO earnings_ledger (rider_id, order_id, credit, debit, balance_after, description, reference_type, reference_id)
    VALUES (
      v_caller_id,
      p_order_id,
      v_rider_earning,
      0,
      v_new_balance,
      format('Delivery earnings for order %s', v_order.order_number),
      'delivery',
      v_proof_id
    );

    -- Update rider profile caches
    UPDATE rider_profiles
    SET cached_total_earnings = v_new_balance,
        total_deliveries = total_deliveries + 1,
        updated_at = NOW()
    WHERE id = v_caller_id;
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
