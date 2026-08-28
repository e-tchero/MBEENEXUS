-- =============================================
-- PHASE 6H: QUOTE ROUTE SNAPSHOT
-- Store route geometry on delivery_quotes to eliminate duplicate routing
-- =============================================

-- Add route_geometry column to delivery_quotes
-- Stores decoded [lng, lat] coordinate arrays from quote-time routing.
-- OrderService reads this instead of making a second routing call.
ALTER TABLE delivery_quotes ADD COLUMN IF NOT EXISTS route_geometry jsonb;

-- Documentation comment
COMMENT ON COLUMN delivery_quotes.route_geometry IS 'Decoded route coordinates [lng, lat][] from quote-time routing. Used by OrderService to avoid duplicate routing calls. Read by TrackingMap for road-following route visualization.';
