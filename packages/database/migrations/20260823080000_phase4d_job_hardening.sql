-- =============================================
-- PHASE 4D: BACKGROUND JOB HARDENING
-- =============================================
-- 1. recover_stuck_jobs() — recover jobs stuck in 'processing'
--    after worker crash. Stale threshold: 5 minutes.
-- =============================================

CREATE OR REPLACE FUNCTION recover_stuck_jobs(
  p_stale_threshold_seconds INTEGER DEFAULT 300
) RETURNS INTEGER AS $$
DECLARE
  v_recovered INTEGER := 0;
BEGIN
  -- Reset jobs stuck in 'processing' longer than the threshold.
  -- Only recover if the job hasn't exhausted retries.
  UPDATE background_jobs
  SET
    status = CASE
      WHEN attempts + 1 < max_attempts THEN 'pending'
      ELSE 'failed'
    END,
    error_message = CASE
      WHEN attempts + 1 < max_attempts THEN 'Recovered from stuck processing'
      ELSE 'Job exceeded max retries after being stuck'
    END,
    failed_at = CASE
      WHEN attempts + 1 >= max_attempts THEN NOW()
      ELSE NULL
    END,
    -- For retryable jobs, schedule immediate re-processing (backoff was already applied on original failure)
    scheduled_at = CASE
      WHEN attempts + 1 < max_attempts THEN NOW()
      ELSE scheduled_at
    END,
    updated_at = NOW()
  WHERE status = 'processing'
    AND started_at IS NOT NULL
    AND started_at < NOW() - (p_stale_threshold_seconds || ' seconds')::INTERVAL
    AND attempts < max_attempts;

  GET DIAGNOSTICS v_recovered = ROW_COUNT;
  RETURN v_recovered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;
