-- =============================================
-- PHASE 6G: ROUTE GEOMETRY
-- Store decoded route coordinates for tracking map rendering
-- =============================================

-- Add route_geometry column to store decoded [lng, lat] coordinate arrays
-- as JSONB. Written once at order creation from quote-time route calculation.
-- Read by TrackingMap for actual road route rendering.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_geometry jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN orders.route_geometry IS 'Decoded route coordinates [lng, lat][] from quote-time routing. Used by TrackingMap for road-following route visualization.';
