-- Phase 2: Rider Availability & Location
-- Adds: staleness function, location configuration, enhanced dispatch eligibility

-- 1. mark_stale_riders function
-- Marks riders as unavailable if they haven't sent a location update recently
CREATE OR REPLACE FUNCTION mark_stale_riders(p_threshold_seconds integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE rider_current_locations
  SET is_available = FALSE
  WHERE is_available = TRUE
    AND updated_at < NOW() - (p_threshold_seconds || ' seconds')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- 2. Location configuration settings
INSERT INTO platform_settings (key, value, description, category) VALUES
  ('location_update_min_interval_seconds', '{"seconds": 5}', 'Minimum time between accepted GPS updates per rider', 'location'),
  ('location_update_min_distance_meters', '{"meters": 10}', 'Minimum movement distance to trigger a write', 'location'),
  ('location_stale_threshold_seconds', '{"seconds": 60}', 'Rider considered stale/dispatchable-ineligible after this', 'location'),
  ('location_max_speed_kmh', '{"kmh": 200}', 'Maximum allowed speed - reject updates exceeding this', 'location'),
  ('location_max_age_seconds', '{"seconds": 300}', 'Reject GPS updates older than this (5 minutes)', 'location'),
  ('location_retention_days', '{"days": 90}', 'Historical rider_locations retention period', 'location')
ON CONFLICT (key) DO NOTHING;

-- 3. Enhanced find_nearest_riders with staleness check
CREATE OR REPLACE FUNCTION find_nearest_riders(
  p_lat NUMERIC,
  p_lon NUMERIC,
  p_max_distance_km NUMERIC,
  p_limit INTEGER
)
RETURNS TABLE(rider_id UUID, distance_km NUMERIC, rating NUMERIC)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rcl.rider_id,
    (ST_Distance(
      rcl.location,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
    ) / 1000)::DECIMAL AS distance_km,
    rp.rating
  FROM rider_current_locations rcl
  JOIN rider_profiles rp ON rp.id = rcl.rider_id
  WHERE rcl.is_available = TRUE
    AND rp.verification_status = 'approved'
    AND rcl.updated_at > NOW() - INTERVAL '60 seconds'
    AND ST_Distance(
      rcl.location,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
    ) / 1000 <= p_max_distance_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$function$;
