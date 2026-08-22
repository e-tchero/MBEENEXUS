-- Fix: Grant permissions on zone_pricing_matrix (missed in original migration)
GRANT ALL ON zone_pricing_matrix TO service_role;
GRANT SELECT ON zone_pricing_matrix TO authenticated;
