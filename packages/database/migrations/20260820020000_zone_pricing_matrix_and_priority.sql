-- =============================================
-- ZONE PRICING MATRIX
-- Cross-zone fixed prices (pickup_zone → destination_zone)
-- A→B and B→A are symmetrical by default
-- =============================================

CREATE TABLE zone_pricing_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_zone_id UUID NOT NULL REFERENCES service_zones(id) ON DELETE CASCADE,
  destination_zone_id UUID NOT NULL REFERENCES service_zones(id) ON DELETE CASCADE,
  fixed_price DECIMAL(10,2) NOT NULL,
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT zone_pricing_different_zones CHECK (origin_zone_id != destination_zone_id),
  CONSTRAINT zone_pricing_unique_active UNIQUE (origin_zone_id, destination_zone_id, version)
);

-- Index for fast lookup: find price between two zones
CREATE INDEX idx_zone_pricing_lookup ON zone_pricing_matrix(origin_zone_id, destination_zone_id)
  WHERE is_active = true;

-- Prevent duplicate active entries for same zone pair
CREATE UNIQUE INDEX idx_zone_pricing_no_duplicates ON zone_pricing_matrix(origin_zone_id, destination_zone_id)
  WHERE is_active = true AND valid_to IS NULL;

-- Grants
GRANT ALL ON zone_pricing_matrix TO service_role;
GRANT SELECT ON zone_pricing_matrix TO authenticated;

-- RLS
ALTER TABLE zone_pricing_matrix ENABLE ROW LEVEL SECURITY;

-- Public read for active zone pricing (needed for quote calculation)
CREATE POLICY "zone_pricing_public_read" ON zone_pricing_matrix
  FOR SELECT USING (is_active = true AND (valid_from <= now()) AND (valid_to IS NULL OR valid_to > now()));

-- Admin full access
CREATE POLICY "zone_pricing_admin_all" ON zone_pricing_matrix
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- =============================================
-- PRIORITY DELIVERY FEE (configurable add-on)
-- =============================================

INSERT INTO platform_settings (key, value, description, category, is_public)
VALUES (
  'priority_delivery_fee',
  '{"amount": 1500, "currency": "NGN", "description": "Fixed add-on for priority delivery"}'::jsonb,
  'Priority delivery fixed add-on fee in NGN',
  'pricing',
  FALSE
) ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      description = EXCLUDED.description;

-- =============================================
-- REMOVE PLATFORM COMMISSION RATE (not customer-facing)
-- Archive it as a comment for future reference
-- =============================================

-- Keep platform_commission_rate but mark as non-customer-facing
-- It is used internally for rider payout calculation, not for customer pricing
UPDATE platform_settings
SET value = '{"rate": 0.15, "description": "Internal rider payout calculation - NOT customer-facing"}'::jsonb,
    description = 'Internal: platform margin calculation for rider settlements. NOT used in customer pricing.'
WHERE key = 'platform_commission_rate';

-- =============================================
-- UPDATE QUOTE LIFETIME to 5 minutes (300 seconds)
-- =============================================

UPDATE platform_settings
SET value = '{"seconds": 300, "description": "5 minutes"}'::jsonb
WHERE key = 'quote_lifetime_seconds';
