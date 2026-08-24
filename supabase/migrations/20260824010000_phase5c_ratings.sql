-- =============================================
-- PHASE 5C: RATING AGGREGATION
-- =============================================

-- 1. FUNCTION: update_rider_rating()
-- Recalculates rider average rating after each new rating insertion.
-- SECURITY DEFINER: prevents clients from directly manipulating rider_profiles.rating.
-- Safe search_path: explicitly set to public.
CREATE OR REPLACE FUNCTION update_rider_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
BEGIN
  -- Calculate average from all ratings for this rider
  SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 5.00)
  INTO v_avg_rating
  FROM ratings
  WHERE rider_id = NEW.rider_id;

  -- Update the cached rating on rider_profiles
  UPDATE rider_profiles
  SET rating = v_avg_rating,
      updated_at = NOW()
  WHERE id = NEW.rider_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- 2. TRIGGER: Auto-update rider rating on new rating insertion
CREATE TRIGGER trigger_update_rider_rating
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_rider_rating();
