-- =============================================
-- GRANT PERMISSIONS FOR SUPABASE ROLES
-- =============================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Revoke default public access first
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Profiles
GRANT SELECT ON profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON profiles TO authenticated, service_role;

-- Customer Profiles
GRANT SELECT ON customer_profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON customer_profiles TO authenticated, service_role;

-- Rider Profiles
GRANT SELECT ON rider_profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON rider_profiles TO authenticated, service_role;

-- Business Profiles
GRANT SELECT ON business_profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON business_profiles TO authenticated, service_role;

-- Business Members
GRANT SELECT ON business_members TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON business_members TO authenticated, service_role;

-- Addresses
GRANT SELECT ON addresses TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON addresses TO authenticated, service_role;

-- Vehicles
GRANT SELECT ON vehicles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON vehicles TO authenticated, service_role;

-- Service Zones
GRANT SELECT ON service_zones TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON service_zones TO service_role;

-- Delivery Categories
GRANT SELECT ON delivery_categories TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON delivery_categories TO service_role;

-- Pricing Rules
GRANT SELECT ON pricing_rules TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON pricing_rules TO service_role;

-- Orders
GRANT SELECT ON orders TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON orders TO authenticated, service_role;

-- Order Events
GRANT SELECT ON order_events TO anon, authenticated, service_role;
GRANT INSERT ON order_events TO authenticated, service_role;

-- Order Status History
GRANT SELECT ON order_status_history TO anon, authenticated, service_role;
GRANT INSERT ON order_status_history TO authenticated, service_role;

-- Delivery Quotes
GRANT SELECT ON delivery_quotes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON delivery_quotes TO authenticated, service_role;

-- Rider Assignments
GRANT SELECT ON rider_assignments TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON rider_assignments TO authenticated, service_role;

-- Rider Locations
GRANT SELECT ON rider_locations TO anon, authenticated, service_role;
GRANT INSERT ON rider_locations TO authenticated, service_role;

-- Rider Current Locations
GRANT SELECT ON rider_current_locations TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON rider_current_locations TO authenticated, service_role;

-- Payments
GRANT SELECT ON payments TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON payments TO authenticated, service_role;

-- Processed Webhook Events
GRANT SELECT ON processed_webhook_events TO anon, authenticated, service_role;
GRANT INSERT ON processed_webhook_events TO service_role;

-- Refunds
GRANT SELECT ON refunds TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON refunds TO service_role;

-- Payout Recipients
GRANT SELECT ON payout_recipients TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON payout_recipients TO authenticated, service_role;

-- Payouts
GRANT SELECT ON payouts TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON payouts TO service_role;

-- Earnings Ledger
GRANT SELECT ON earnings_ledger TO anon, authenticated, service_role;
GRANT INSERT ON earnings_ledger TO service_role;

-- Delivery Proofs
GRANT SELECT ON delivery_proofs TO anon, authenticated, service_role;
GRANT INSERT ON delivery_proofs TO authenticated, service_role;

-- Notifications
GRANT SELECT ON notifications TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON notifications TO authenticated, service_role;

-- Ratings
GRANT SELECT ON ratings TO anon, authenticated, service_role;
GRANT INSERT ON ratings TO authenticated, service_role;

-- Support Tickets
GRANT SELECT ON support_tickets TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON support_tickets TO authenticated, service_role;

-- Promotions
GRANT SELECT ON promotions TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON promotions TO service_role;

-- Audit Logs
GRANT SELECT ON audit_logs TO anon, authenticated, service_role;
GRANT INSERT ON audit_logs TO service_role;

-- Platform Settings
GRANT SELECT ON platform_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON platform_settings TO service_role;

-- Background Jobs
GRANT SELECT ON background_jobs TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON background_jobs TO service_role;

-- Idempotency Keys
GRANT SELECT ON idempotency_keys TO anon, authenticated, service_role;
GRANT INSERT ON idempotency_keys TO authenticated, service_role;

-- Prohibited Items
GRANT SELECT ON prohibited_items TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON prohibited_items TO service_role;
