-- Phase 3: Dispatch Configuration
-- Adds configurable dispatch settings to platform_settings

INSERT INTO platform_settings (key, value, description, category) VALUES
  ('dispatch_radius_km', '{"km": 10}', 'Maximum dispatch radius in kilometers', 'dispatch'),
  ('dispatch_offer_timeout_seconds', '{"seconds": 30}', 'How long a rider has to accept an offer', 'dispatch'),
  ('dispatch_max_riders_per_attempt', '{"count": 1}', 'Maximum riders to offer per dispatch attempt', 'dispatch'),
  ('dispatch_max_retry_attempts', '{"count": 3}', 'Maximum dispatch retry attempts', 'dispatch'),
  ('dispatch_retry_base_delay_seconds', '{"seconds": 5}', 'Base delay for exponential backoff', 'dispatch')
ON CONFLICT (key) DO NOTHING;
