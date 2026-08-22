-- Fix: seed Abuja pricing with name field included
-- Service zone already inserted from previous (partial) migration

-- Insert pricing rule for Abuja (with name field)
INSERT INTO pricing_rules (name, zone_id, base_fee, per_kilometer, per_kg, minimum_fare, weight_bands, urgency_multipliers, tax_rate, tax_name, version, valid_from)
SELECT
  'Abuja MVP v1',
  sz.id,
  500.00,
  100.00,
  0.00,
  700.00,
  '[{"min_kg": 0, "max_kg": 2, "multiplier": 1.0}, {"min_kg": 2, "max_kg": 5, "multiplier": 1.2}, {"min_kg": 5, "max_kg": 10, "multiplier": 1.5}]'::jsonb,
  '{"standard": 1.0, "express": 1.3, "urgent": 1.5}'::jsonb,
  0.075,
  'VAT',
  1,
  NOW()
FROM service_zones sz
WHERE sz.slug = 'abuja-fct'
ON CONFLICT DO NOTHING;

-- Insert platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('currency', '{"code": "NGN", "symbol": "₦", "name": "Nigerian Naira"}', 'Platform currency'),
  ('platform_commission_rate', '{"rate": 0.15}', 'Platform commission rate (15%)'),
  ('quote_lifetime_seconds', '{"seconds": 300}', 'Quote validity (5 minutes)'),
  ('max_delivery_distance_km', '{"km": 50}', 'Maximum delivery distance'),
  ('min_rider_verification_level', '{"level": "verified"}', 'Minimum rider verification for accepting deliveries')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- Insert delivery categories
INSERT INTO delivery_categories (name, slug, is_active, display_order) VALUES
  ('Documents', 'documents', true, 1),
  ('Clothing', 'clothing', true, 2),
  ('Electronics', 'electronics', true, 3),
  ('Personal Items', 'personal-items', true, 4),
  ('Retail Purchases', 'retail-purchases', true, 5),
  ('Small Parcels', 'small-parcels', true, 6),
  ('Business Packages', 'business-packages', true, 7),
  ('E-commerce Orders', 'ecommerce-orders', true, 8),
  ('Other', 'other', true, 9)
ON CONFLICT (slug) DO NOTHING;
