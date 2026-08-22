-- Fix: ST_Contains needs both arguments as geometry
-- Boundary is stored as geography, point must also be geography or both geometry

CREATE OR REPLACE FUNCTION is_in_service_zone(
  p_lat DECIMAL,
  p_lon DECIMAL
) RETURNS TABLE (
  zone_id UUID,
  zone_name TEXT,
  zone_slug TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sz.id, sz.name, sz.slug
  FROM service_zones sz
  WHERE sz.is_active = TRUE
    AND ST_Contains(
      sz.boundary::geometry,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geometry
    )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_in_service_zone(DECIMAL, DECIMAL) TO anon, authenticated, service_role;
