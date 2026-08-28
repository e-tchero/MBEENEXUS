-- =============================================
-- PHASE 6J: PRODUCTION HARDENING INDEXES
-- Targeted indexes for critical query patterns
-- identified during Phase 6I discovery audit.
-- All additive, non-destructive.
-- =============================================

-- 1. Orders: customer listing with status filter and sort
-- Supports: listOrders() which filters by customer_id, optionally status, orders by created_at DESC
-- Existing idx_orders_customer_status covers (customer_id, status) but not the sort column
CREATE INDEX IF NOT EXISTS idx_orders_customer_status_created
  ON orders(customer_id, status, created_at DESC);

-- 2. Rider assignments: rider offer listing
-- Supports: getPendingOffers() which filters by rider_id AND status = 'offered'
-- Existing idx_rider_assignments_rider covers rider_id but not the status composite
CREATE INDEX IF NOT EXISTS idx_rider_assignments_rider_status
  ON rider_assignments(rider_id, status);

-- 3. Background jobs: job claim query
-- Supports: claim_next_pending_job() which filters by status + scheduled_at, orders by priority
-- Partial index keeps it small since most jobs complete quickly
CREATE INDEX IF NOT EXISTS idx_background_jobs_pending_jobs
  ON background_jobs(status, scheduled_at, priority DESC)
  WHERE status = 'pending';

-- 4. Earnings ledger: rider earnings history
-- Supports: getEarningsHistory() which filters by rider_id, orders by created_at DESC
-- Existing idx_earnings_ledger_rider covers rider_id but not the sort column
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_rider_created
  ON earnings_ledger(rider_id, created_at DESC);

-- 5. Delivery quotes: atomic consumption validation
-- Supports: OrderService.createOrder() which validates customer_id + is_consumed + valid_until
-- Partial index keeps it small since consumed quotes are never queried again
CREATE INDEX IF NOT EXISTS idx_delivery_quotes_consumption
  ON delivery_quotes(customer_id, is_consumed, valid_until)
  WHERE is_consumed = FALSE;
