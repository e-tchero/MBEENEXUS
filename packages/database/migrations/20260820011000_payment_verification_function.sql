-- =============================================
-- PAYMENT VERIFICATION FUNCTION
-- =============================================

-- Verify payment and confirm order (called by webhook handler)
CREATE OR REPLACE FUNCTION verify_payment_and_confirm_order(
  p_reference TEXT,
  p_amount DECIMAL,
  p_event_id TEXT
) RETURNS TABLE (order_id UUID, success BOOLEAN) AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  -- Lock payment row
  SELECT * INTO v_payment
  FROM payments
  WHERE paystack_reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE;
    RETURN;
  END IF;

  -- Check idempotency
  IF v_payment.status = 'success' THEN
    RETURN QUERY SELECT v_payment.order_id, TRUE;
    RETURN;
  END IF;

  -- Verify amount
  SELECT * INTO v_order FROM orders WHERE id = v_payment.order_id FOR UPDATE;

  IF v_payment.amount != v_order.total_amount THEN
    -- Amount mismatch - flag for review
    INSERT INTO audit_logs (actor_type, action, resource_type, resource_id, metadata)
    VALUES ('system', 'payment_amount_mismatch', 'payment', v_payment.id,
            jsonb_build_object('expected', v_order.total_amount, 'received', p_amount));
    RETURN QUERY SELECT NULL::UUID, FALSE;
    RETURN;
  END IF;

  -- Update payment
  UPDATE payments
  SET status = 'success',
      verified_at = NOW(),
      updated_at = NOW()
  WHERE id = v_payment.id;

  -- Update order
  UPDATE orders
  SET status = 'paid',
      updated_at = NOW()
  WHERE id = v_payment.order_id;

  -- Record event
  INSERT INTO order_events (order_id, event_type, from_status, to_status, actor_type, metadata)
  VALUES (v_payment.order_id, 'payment_confirmed', 'pending_payment', 'paid', 'system',
          jsonb_build_object('payment_id', v_payment.id, 'amount', p_amount));

  -- Record status history
  INSERT INTO order_status_history (order_id, status, notes, created_by)
  VALUES (v_payment.order_id, 'paid', 'Payment confirmed via webhook', NULL);

  RETURN QUERY SELECT v_payment.order_id, TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
