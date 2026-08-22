-- =============================================
-- MBEENEXUS ABUJA MVP PRICING CONFIGURATION
-- =============================================

-- Platform commission rate (stored in platform_settings)
INSERT INTO platform_settings (key, value, description, category, is_public)
VALUES (
  'platform_commission_rate',
  '{"rate": 0.15, "description": "15% platform commission on delivery fare"}'::jsonb,
  'Platform commission rate as decimal (0.15 = 15%)',
  'pricing',
  FALSE
);

-- Quote lifetime (stored in platform_settings)
INSERT INTO platform_settings (key, value, description, category, is_public)
VALUES (
  'quote_lifetime_seconds',
  '{"seconds": 300, "description": "5 minutes"}'::jsonb,
  'Quote validity duration in seconds',
  'pricing',
  FALSE
);

-- Insert Abuja service zone
-- NOTE: The actual polygon coordinates must be provided by the product owner
-- This is a placeholder for the Abuja FCT boundary
INSERT INTO service_zones (name, slug, description, boundary, is_active, operating_hours, min_delivery_time_minutes, max_delivery_time_minutes)
VALUES (
  'Abuja FCT',
  'abuja-fct',
  'Federal Capital Territory, Abuja',
  ST_GeographyFromText('SRID=4326;POLYGON((6.8 8.8, 7.8 8.8, 7.8 9.5, 6.8 9.5, 6.8 8.8))'),
  TRUE,
  '{"monday": {"open": "08:00", "close": "20:00"}, "tuesday": {"open": "08:00", "close": "20:00"}, "wednesday": {"open": "08:00", "close": "20:00"}, "thursday": {"open": "08:00", "close": "20:00"}, "friday": {"open": "08:00", "close": "20:00"}, "saturday": {"open": "08:00", "close": "20:00"}, "sunday": {"open": "10:00", "close": "18:00"}}'::jsonb,
  30,
  120
);

-- Insert delivery categories
INSERT INTO delivery_categories (name, slug, description, is_active, display_order)
VALUES
  ('Documents', 'documents', 'Letters, contracts, legal documents', TRUE, 1),
  ('Clothing', 'clothing', 'Apparel, shoes, accessories', TRUE, 2),
  ('Electronics', 'electronics', 'Phones, laptops, gadgets', TRUE, 3),
  ('Personal Items', 'personal-items', 'Personal belongings, gifts', TRUE, 4),
  ('Retail Purchases', 'retail-purchases', 'Store purchases, merchandise', TRUE, 5),
  ('Small Parcels', 'small-parcels', 'Small packages, boxes', TRUE, 6),
  ('Business Packages', 'business-packages', 'Business documents, supplies', TRUE, 7),
  ('E-commerce Orders', 'ecommerce-orders', 'Online purchase deliveries', TRUE, 8),
  ('Other', 'other', 'Other permitted goods', TRUE, 9);

-- Insert Abuja Standard pricing rule
INSERT INTO pricing_rules (
  zone_id,
  name,
  description,
  base_fee,
  per_kilometer,
  per_kg,
  minimum_fare,
  maximum_distance_km,
  weight_bands,
  urgency_multipliers,
  tax_rate,
  tax_name,
  is_active,
  valid_from,
  version
)
SELECT
  sz.id,
  'Abuja Standard',
  'Standard delivery pricing for Abuja FCT - MVP',
  500.00,           -- base_fee: ₦500
  100.00,           -- per_kilometer: ₦100/km
  0.00,             -- per_kg: 0 (weight handled via bands)
  700.00,           -- minimum_fare: ₦700
  50.00,            -- maximum_distance_km: 50km
  '[{"min_kg": 0, "max_kg": 2, "multiplier": 1.0}, {"min_kg": 2, "max_kg": 5, "multiplier": 1.2}, {"min_kg": 5, "max_kg": 10, "multiplier": 1.5}]'::jsonb,
  '{"standard": 1.0, "express": 1.3, "urgent": 1.8}'::jsonb,
  0.075,            -- tax_rate: 7.5% VAT
  'VAT',
  TRUE,
  NOW(),
  1
FROM service_zones sz
WHERE sz.slug = 'abuja-fct';
