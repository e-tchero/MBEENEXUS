-- =============================================
-- ATOMIC ORDER NUMBER GENERATION
-- Replaces unsafe COUNT(*)+1 with atomic daily counter
-- Two concurrent orders can NEVER receive the same number
-- =============================================

-- Daily order sequence counter table
CREATE TABLE IF NOT EXISTS order_sequences (
  sequence_date DATE PRIMARY KEY,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant permissions
GRANT ALL ON order_sequences TO service_role;
GRANT SELECT ON order_sequences TO authenticated;

-- RLS: only service role can write, admins can read
ALTER TABLE order_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_sequences_admin_read" ON order_sequences
  FOR SELECT USING (
    get_user_role() IN ('admin', 'super_admin')
  );

-- Atomic order number generation function
-- Uses INSERT ON CONFLICT to atomically increment the daily counter
-- Format: ORD-YYYYMMDD-NNNN (e.g., ORD-20260820-0001)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  next_counter INTEGER;
  order_number TEXT;
BEGIN
  -- Atomically insert or increment the daily counter
  INSERT INTO order_sequences (sequence_date, counter)
  VALUES (today_date, 1)
  ON CONFLICT (sequence_date)
  DO UPDATE SET counter = order_sequences.counter + 1
  RETURNING counter INTO next_counter;

  -- Format: ORD-YYYYMMDD-NNNN
  order_number := 'ORD-' || TO_CHAR(today_date, 'YYYYMMDD') || '-' || LPAD(next_counter::TEXT, 4, '0');

  RETURN order_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated, service_role;

-- Also make order_number column have a unique constraint (already exists, but verify)
-- The existing UNIQUE constraint on orders.order_number provides a final safety net
