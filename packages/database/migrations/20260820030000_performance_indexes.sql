-- =============================================
-- PERFORMANCE INDEXES
-- Targeted indexes for critical Milestone 2 query patterns
-- =============================================

-- 1. Orders by pickup/destination address (used by address deletion check)
-- Without this, the address service's DELETE check does a sequential scan on orders
CREATE INDEX IF NOT EXISTS idx_orders_pickup_address ON orders(pickup_address_id)
  WHERE pickup_address_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_destination_address ON orders(destination_address_id)
  WHERE destination_address_id IS NOT NULL;

-- 2. Pricing rules composite index (used by quote service)
-- The quote service queries: zone_id + is_active + valid_from + valid_to
-- Current separate indexes force PostgreSQL to combine them
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active_lookup
  ON pricing_rules(zone_id, is_active, valid_from, valid_to)
  WHERE is_active = TRUE;

-- 3. Delivery quotes composite (used during order creation quote validation)
-- Quote lookup: id + customer_id + is_consumed
CREATE INDEX IF NOT EXISTS idx_delivery_quotes_lookup
  ON delivery_quotes(customer_id, id)
  WHERE is_consumed = FALSE;

-- 4. Payments composite for order payment lookup
-- Payment service queries: order_id + customer_id + status
CREATE INDEX IF NOT EXISTS idx_payments_order_customer_status
  ON payments(order_id, customer_id, status);

-- 5. Orders customer + status composite (used by order listing with status filter)
CREATE INDEX IF NOT EXISTS idx_orders_customer_status
  ON orders(customer_id, status);

-- 6. Zone pricing matrix with validity check
-- Cross-zone pricing queries: origin + destination + is_active + valid_from + valid_to
CREATE INDEX IF NOT EXISTS idx_zone_pricing_active_lookup
  ON zone_pricing_matrix(origin_zone_id, destination_zone_id, is_active, valid_from, valid_to)
  WHERE is_active = TRUE;

-- 7. Rider current locations: composite for dispatch query
-- Dispatch needs: is_available + location (GIST) + rider_id
-- The existing GIST index covers spatial, but add a covering composite
CREATE INDEX IF NOT EXISTS idx_rider_dispatch_lookup
  ON rider_current_locations(is_available, updated_at)
  WHERE is_available = TRUE;
