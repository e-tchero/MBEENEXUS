-- =============================================
-- DELIVERY PLATFORM - INITIAL SCHEMA
-- Version: 001
-- Date: 2024-01-01
-- =============================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================
-- PROFILES
-- =============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'rider', 'business', 'support', 'operations', 'admin', 'super_admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================
-- ROLE RESOLUTION FUNCTIONS
-- =============================================

-- Get current user's role (security-definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = required_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user has any of the specified roles
CREATE OR REPLACE FUNCTION has_any_role(VARIADIC roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = ANY(roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- CUSTOMER PROFILES
-- =============================================

CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  default_address_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RIDER PROFILES
-- =============================================

CREATE TABLE rider_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  verification_status TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'under_review', 'approved', 'rejected')),
  verification_notes TEXT,
  is_available BOOLEAN DEFAULT FALSE,
  current_location GEOGRAPHY(POINT, 4326),
  last_location_update TIMESTAMPTZ,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_deliveries INTEGER DEFAULT 0,
  cached_total_earnings DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BUSINESS PROFILES
-- =============================================

CREATE TABLE business_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  registration_number TEXT,
  tax_id TEXT,
  billing_address_id UUID,
  credit_limit DECIMAL(12,2) DEFAULT 0.00,
  current_balance DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- BUSINESS MEMBERS
-- =============================================

CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(business_id, user_id)
);

CREATE INDEX idx_business_members_user ON business_members(user_id);

-- =============================================
-- ADDRESSES
-- =============================================

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'Nigeria',
  postal_code TEXT,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user ON addresses(user_id);
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);

-- =============================================
-- VEHICLES
-- =============================================

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('bicycle', 'motorcycle', 'tricycle', 'car', 'van')),
  make TEXT,
  model TEXT,
  year INTEGER,
  registration_number TEXT,
  insurance_expiry DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_rider ON vehicles(rider_id);

-- =============================================
-- SERVICE ZONES
-- =============================================

CREATE TABLE service_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  operating_hours JSONB DEFAULT '{}',
  min_delivery_time_minutes INTEGER DEFAULT 30,
  max_delivery_time_minutes INTEGER DEFAULT 120,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_zones_boundary ON service_zones USING GIST(boundary);

-- =============================================
-- DELIVERY CATEGORIES
-- =============================================

CREATE TABLE delivery_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE prohibited_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES delivery_categories(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRICING RULES
-- =============================================

CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES service_zones(id),
  name TEXT NOT NULL,
  description TEXT,
  base_fee DECIMAL(10,2) NOT NULL,
  per_kilometer DECIMAL(10,2) NOT NULL,
  per_kg DECIMAL(10,2) DEFAULT 0.00,
  minimum_fare DECIMAL(10,2) NOT NULL,
  maximum_distance_km DECIMAL(8,2),
  vehicle_type_multiplier JSONB DEFAULT '{}',
  weight_bands JSONB DEFAULT '[]',
  urgency_multipliers JSONB DEFAULT '{}',
  tax_rate DECIMAL(5,4) DEFAULT 0.075,
  tax_name TEXT DEFAULT 'VAT',
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_to TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_pricing_rules_zone ON pricing_rules(zone_id);
CREATE INDEX idx_pricing_rules_validity ON pricing_rules(valid_from, valid_to);

-- =============================================
-- ORDERS
-- =============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_payment', 'paid', 'searching_rider', 'rider_assigned',
    'rider_en_route_to_pickup', 'arrived_at_pickup', 'picked_up',
    'in_transit', 'arrived_at_destination', 'delivered', 'completed',
    'cancelled', 'failed', 'expired', 'disputed', 'refunded'
  )),

  -- Pickup
  pickup_address_id UUID NOT NULL REFERENCES addresses(id),
  pickup_contact_name TEXT NOT NULL,
  pickup_contact_phone TEXT NOT NULL,
  pickup_instructions TEXT,
  pickup_latitude DECIMAL(10,8) NOT NULL,
  pickup_longitude DECIMAL(11,8) NOT NULL,

  -- Destination
  destination_address_id UUID NOT NULL REFERENCES addresses(id),
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  delivery_instructions TEXT,
  destination_latitude DECIMAL(10,8) NOT NULL,
  destination_longitude DECIMAL(11,8) NOT NULL,

  -- Package
  category_id UUID NOT NULL REFERENCES delivery_categories(id),
  package_description TEXT NOT NULL,
  package_weight_kg DECIMAL(8,2),
  package_dimensions JSONB,
  quantity INTEGER DEFAULT 1,
  special_handling_requirements TEXT,

  -- Pricing (locked at creation)
  pricing_rule_id UUID NOT NULL REFERENCES pricing_rules(id),
  base_fee DECIMAL(10,2) NOT NULL,
  distance_fee DECIMAL(10,2) NOT NULL,
  weight_fee DECIMAL(10,2) DEFAULT 0.00,
  zone_fee DECIMAL(10,2) DEFAULT 0.00,
  urgency_fee DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_rate_applied DECIMAL(5,4),
  tax_name_applied TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',

  -- Delivery
  distance_km DECIMAL(8,2) NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL,
  actual_duration_minutes INTEGER,
  urgency_level TEXT DEFAULT 'standard' CHECK (urgency_level IN ('standard', 'express', 'urgent')),

  -- Rider assignment
  assigned_rider_id UUID REFERENCES rider_profiles(id),
  rider_assigned_at TIMESTAMPTZ,
  rider_arrived_at_pickup TIMESTAMPTZ,
  rider_picked_up_at TIMESTAMPTZ,
  rider_arrived_at_destination TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Business
  business_id UUID REFERENCES business_profiles(id),
  business_reference TEXT,

  -- Tracking
  tracking_code TEXT UNIQUE NOT NULL,

  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_rider ON orders(assigned_rider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_tracking ON orders(tracking_code);
CREATE INDEX idx_orders_business ON orders(business_id);

-- =============================================
-- ORDER EVENTS & STATUS HISTORY
-- =============================================

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT CHECK (actor_type IN ('customer', 'rider', 'admin', 'system')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_events_order ON order_events(order_id);

CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);

-- =============================================
-- DELIVERY QUOTES
-- =============================================

CREATE TABLE delivery_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  pickup_latitude DECIMAL(10,8) NOT NULL,
  pickup_longitude DECIMAL(11,8) NOT NULL,
  pickup_address_text TEXT,
  destination_latitude DECIMAL(10,8) NOT NULL,
  destination_longitude DECIMAL(11,8) NOT NULL,
  destination_address_text TEXT,
  category_id UUID NOT NULL REFERENCES delivery_categories(id),
  weight_kg DECIMAL(8,2),
  dimensions JSONB,
  quantity INTEGER DEFAULT 1,
  pricing_rule_id UUID NOT NULL REFERENCES pricing_rules(id),
  base_fee DECIMAL(10,2) NOT NULL,
  distance_fee DECIMAL(10,2) NOT NULL,
  weight_fee DECIMAL(10,2) DEFAULT 0.00,
  zone_fee DECIMAL(10,2) DEFAULT 0.00,
  urgency_fee DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  distance_km DECIMAL(8,2) NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_consumed BOOLEAN DEFAULT FALSE,
  consumed_at TIMESTAMPTZ,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_quotes_customer ON delivery_quotes(customer_id);
CREATE INDEX idx_delivery_quotes_validity ON delivery_quotes(valid_until);

-- =============================================
-- RIDER ASSIGNMENTS
-- =============================================

CREATE TABLE rider_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id),
  status TEXT NOT NULL DEFAULT 'offered'
    CHECK (status IN ('offered', 'accepted', 'rejected', 'expired', 'cancelled', 'completed')),
  offered_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only ONE active offer/acceptance per order
CREATE UNIQUE INDEX idx_rider_assignments_one_active
  ON rider_assignments(order_id)
  WHERE status IN ('offered', 'accepted');

-- Only ONE active offer/acceptance per rider
CREATE UNIQUE INDEX idx_rider_assignments_rider_one_active
  ON rider_assignments(rider_id)
  WHERE status IN ('offered', 'accepted');

CREATE INDEX idx_rider_assignments_order ON rider_assignments(order_id);
CREATE INDEX idx_rider_assignments_rider ON rider_assignments(rider_id);
CREATE INDEX idx_rider_assignments_status ON rider_assignments(status);
CREATE INDEX idx_rider_assignments_expires ON rider_assignments(expires_at);

-- =============================================
-- RIDER LOCATIONS
-- =============================================

CREATE TABLE rider_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  accuracy DECIMAL(8,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rider_locations_rider ON rider_locations(rider_id);
CREATE INDEX idx_rider_locations_recorded ON rider_locations(recorded_at DESC);

-- Current rider locations (regular table, not materialized view)
CREATE TABLE rider_current_locations (
  rider_id UUID PRIMARY KEY REFERENCES rider_profiles(id),
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  heading DECIMAL(5,2),
  speed DECIMAL(5,2),
  accuracy DECIMAL(8,2),
  is_available BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rider_current_locations_geo
  ON rider_current_locations USING GIST(location);

CREATE INDEX idx_rider_current_locations_available
  ON rider_current_locations(is_available)
  WHERE is_available = TRUE;

-- Trigger to update current location
CREATE OR REPLACE FUNCTION update_rider_current_location()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rider_current_locations (rider_id, latitude, longitude, location, heading, speed, accuracy, updated_at)
  VALUES (NEW.rider_id, NEW.latitude, NEW.longitude, NEW.location, NEW.heading, NEW.speed, NEW.accuracy, NOW())
  ON CONFLICT (rider_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    location = EXCLUDED.location,
    heading = EXCLUDED.heading,
    speed = EXCLUDED.speed,
    accuracy = EXCLUDED.accuracy,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rider_location_insert
  AFTER INSERT ON rider_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_rider_current_location();

-- =============================================
-- PAYMENTS
-- =============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  paystack_reference TEXT UNIQUE NOT NULL,
  paystack_access_code TEXT,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'bank_transfer', 'ussd', 'bank')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'success', 'failed', 'abandoned', 'refunded', 'partially_refunded'
  )),
  verified_at TIMESTAMPTZ,
  paystack_response JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(paystack_reference);
CREATE INDEX idx_payments_status ON payments(status);

-- =============================================
-- PROCESSED WEBHOOK EVENTS
-- =============================================

CREATE TABLE processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paystack',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  reference TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(provider, event_id)
);

CREATE INDEX idx_processed_webhook_events_reference ON processed_webhook_events(reference);

-- =============================================
-- REFUNDS
-- =============================================

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  refund_type TEXT NOT NULL CHECK (refund_type IN ('full', 'partial', 'administrative')),
  paystack_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refunds_payment ON refunds(payment_id);
CREATE INDEX idx_refunds_order ON refunds(order_id);

-- =============================================
-- PAYOUT RECIPIENTS
-- =============================================

CREATE TABLE payout_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id),
  paystack_recipient_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number_last4 TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_recipients_rider ON payout_recipients(rider_id);

-- =============================================
-- PAYOUTS
-- =============================================

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id),
  recipient_id UUID NOT NULL REFERENCES payout_recipients(id),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  paystack_transfer_id TEXT,
  processed_at TIMESTAMPTZ,
  failed_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payouts_rider ON payouts(rider_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- =============================================
-- EARNINGS LEDGER
-- =============================================

CREATE TABLE earnings_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  debit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  balance_after DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_earnings_ledger_rider ON earnings_ledger(rider_id);
CREATE INDEX idx_earnings_ledger_order ON earnings_ledger(order_id);
CREATE INDEX idx_earnings_ledger_created ON earnings_ledger(created_at DESC);

-- =============================================
-- DELIVERY PROOFS
-- =============================================

CREATE TABLE delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id),
  proof_type TEXT NOT NULL CHECK (proof_type IN ('photo', 'signature', 'pin', 'recipient_confirmation')),
  file_url TEXT,
  signature_data TEXT,
  pin_code TEXT,
  recipient_name TEXT,
  notes TEXT,
  proof_latitude DECIMAL(10,8),
  proof_longitude DECIMAL(11,8),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_proofs_order ON delivery_proofs(order_id);

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT FALSE,
  sms BOOLEAN DEFAULT FALSE,
  push BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =============================================
-- RATINGS
-- =============================================

CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  rider_id UUID NOT NULL REFERENCES rider_profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(order_id, customer_id)
);

CREATE INDEX idx_ratings_order ON ratings(order_id);
CREATE INDEX idx_ratings_rider ON ratings(rider_id);

-- =============================================
-- SUPPORT TICKETS
-- =============================================

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID REFERENCES orders(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('order', 'payment', 'rider', 'account', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);

-- =============================================
-- PROMOTIONS
-- =============================================

CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10,2) NOT NULL,
  minimum_order_amount DECIMAL(10,2),
  maximum_discount_amount DECIMAL(10,2),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER,
  applicable_zones UUID[],
  applicable_categories UUID[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_promotions_code ON promotions(code);

-- =============================================
-- AUDIT LOGS
-- =============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'rider', 'admin', 'system')),
  actor_ip INET,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =============================================
-- PLATFORM SETTINGS
-- =============================================

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- =============================================
-- BACKGROUND JOBS
-- =============================================

CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_background_jobs_status ON background_jobs(status, scheduled_at);
CREATE INDEX idx_background_jobs_type ON background_jobs(job_type);

-- =============================================
-- IDEMPOTENCY KEYS
-- =============================================

CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, user_id, endpoint)
);

CREATE INDEX idx_idempotency_keys_key ON idempotency_keys(key, user_id, endpoint);
CREATE INDEX idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_current_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (get_user_role() IN ('admin', 'super_admin'));

-- Customer Profiles
CREATE POLICY "customer_profiles_select_own" ON customer_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "customer_profiles_insert_own" ON customer_profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "customer_profiles_update_own" ON customer_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "customer_profiles_select_admin" ON customer_profiles FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Rider Profiles
CREATE POLICY "rider_profiles_select_own" ON rider_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "rider_profiles_insert_own" ON rider_profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "rider_profiles_update_own" ON rider_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "rider_profiles_select_admin" ON rider_profiles FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'operations'));
CREATE POLICY "rider_profiles_update_admin" ON rider_profiles FOR UPDATE USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Business Profiles
CREATE POLICY "business_profiles_select_member" ON business_profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = business_profiles.id AND business_members.user_id = auth.uid() AND business_members.accepted_at IS NOT NULL)
);
CREATE POLICY "business_profiles_update_owner" ON business_profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM business_members WHERE business_members.business_id = business_profiles.id AND business_members.user_id = auth.uid() AND business_members.role = 'owner')
);
CREATE POLICY "business_profiles_select_admin" ON business_profiles FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Business Members
CREATE POLICY "business_members_select_own_business" ON business_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = business_members.business_id AND bm.user_id = auth.uid() AND bm.accepted_at IS NOT NULL)
);
CREATE POLICY "business_members_manage" ON business_members FOR ALL USING (
  EXISTS (SELECT 1 FROM business_members bm WHERE bm.business_id = business_members.business_id AND bm.user_id = auth.uid() AND bm.role IN ('owner', 'admin'))
);

-- Orders
CREATE POLICY "orders_select_customer" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "orders_insert_customer" ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "orders_update_customer" ON orders FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "orders_select_rider" ON orders FOR SELECT USING (assigned_rider_id = auth.uid());
CREATE POLICY "orders_update_rider" ON orders FOR UPDATE USING (assigned_rider_id = auth.uid());
CREATE POLICY "orders_select_admin" ON orders FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'support', 'operations'));
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Payments
CREATE POLICY "payments_select_customer" ON payments FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "payments_select_admin" ON payments FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Rider Assignments
CREATE POLICY "rider_assignments_select_own" ON rider_assignments FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "rider_assignments_update_own" ON rider_assignments FOR UPDATE USING (rider_id = auth.uid());
CREATE POLICY "rider_assignments_select_admin" ON rider_assignments FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Rider Locations
CREATE POLICY "rider_locations_insert_own" ON rider_locations FOR INSERT WITH CHECK (rider_id = auth.uid());
CREATE POLICY "rider_locations_select_own" ON rider_locations FOR SELECT USING (rider_id = auth.uid());

-- Delivery Proofs
CREATE POLICY "delivery_proofs_insert_rider" ON delivery_proofs FOR INSERT WITH CHECK (rider_id = auth.uid());
CREATE POLICY "delivery_proofs_select_customer" ON delivery_proofs FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = delivery_proofs.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "delivery_proofs_select_admin" ON delivery_proofs FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Notifications
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- Refunds
CREATE POLICY "refunds_select_customer" ON refunds FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = refunds.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "refunds_select_admin" ON refunds FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Payouts
CREATE POLICY "payouts_select_rider" ON payouts FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "payouts_select_admin" ON payouts FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Audit Logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Delivery Quotes
CREATE POLICY "delivery_quotes_select_own" ON delivery_quotes FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "delivery_quotes_insert_own" ON delivery_quotes FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "delivery_quotes_select_admin" ON delivery_quotes FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Order Events (customer sees own, rider sees own, admin sees all)
CREATE POLICY "order_events_select_customer" ON order_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_events.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "order_events_select_rider" ON order_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_events.order_id AND orders.assigned_rider_id = auth.uid())
);
CREATE POLICY "order_events_select_admin" ON order_events FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Order Status History
CREATE POLICY "order_status_history_select_customer" ON order_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "order_status_history_select_rider" ON order_status_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND orders.assigned_rider_id = auth.uid())
);
CREATE POLICY "order_status_history_select_admin" ON order_status_history FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Vehicles (rider manages own)
CREATE POLICY "vehicles_select_own" ON vehicles FOR SELECT USING (
  EXISTS (SELECT 1 FROM rider_profiles WHERE rider_profiles.id = vehicles.rider_id AND rider_profiles.id = auth.uid())
);
CREATE POLICY "vehicles_insert_own" ON vehicles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM rider_profiles WHERE rider_profiles.id = vehicles.rider_id AND rider_profiles.id = auth.uid())
);
CREATE POLICY "vehicles_update_own" ON vehicles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM rider_profiles WHERE rider_profiles.id = vehicles.rider_id AND rider_profiles.id = auth.uid())
);
CREATE POLICY "vehicles_select_admin" ON vehicles FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Service Zones (public read, admin write)
CREATE POLICY "service_zones_select_public" ON service_zones FOR SELECT USING (is_active = TRUE);
CREATE POLICY "service_zones_manage_admin" ON service_zones FOR ALL USING (get_user_role() IN ('admin', 'super_admin'));

-- Delivery Categories (public read, admin write)
CREATE POLICY "delivery_categories_select_public" ON delivery_categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "delivery_categories_manage_admin" ON delivery_categories FOR ALL USING (get_user_role() IN ('admin', 'super_admin'));

-- Pricing Rules (public read for active, admin write)
CREATE POLICY "pricing_rules_select_public" ON pricing_rules FOR SELECT USING (is_active = TRUE);
CREATE POLICY "pricing_rules_manage_admin" ON pricing_rules FOR ALL USING (get_user_role() IN ('admin', 'super_admin'));

-- Promotions (public read for active, admin write)
CREATE POLICY "promotions_select_public" ON promotions FOR SELECT USING (is_active = TRUE);
CREATE POLICY "promotions_manage_admin" ON promotions FOR ALL USING (get_user_role() IN ('admin', 'super_admin'));

-- Platform Settings (admin only)
CREATE POLICY "platform_settings_select_admin" ON platform_settings FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));
CREATE POLICY "platform_settings_manage_admin" ON platform_settings FOR ALL USING (get_user_role() IN ('admin', 'super_admin'));

-- Background Jobs (admin/system only via service role)
CREATE POLICY "background_jobs_select_admin" ON background_jobs FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Idempotency Keys (user sees own, admin sees all)
CREATE POLICY "idempotency_keys_select_own" ON idempotency_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "idempotency_keys_insert_own" ON idempotency_keys FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "idempotency_keys_select_admin" ON idempotency_keys FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Ratings (customer sees own, rider sees own, public can see for completed orders)
CREATE POLICY "ratings_select_customer" ON ratings FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "ratings_select_rider" ON ratings FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "ratings_insert_customer" ON ratings FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "ratings_select_admin" ON ratings FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Support Tickets (user manages own, admin manages all)
CREATE POLICY "support_tickets_select_own" ON support_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "support_tickets_insert_own" ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "support_tickets_update_own" ON support_tickets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "support_tickets_select_admin" ON support_tickets FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'support'));
CREATE POLICY "support_tickets_update_admin" ON support_tickets FOR UPDATE USING (get_user_role() IN ('admin', 'super_admin', 'support'));

-- Processed Webhook Events (admin only via service role)
CREATE POLICY "processed_webhook_events_select_admin" ON processed_webhook_events FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Payout Recipients (rider manages own)
CREATE POLICY "payout_recipients_select_own" ON payout_recipients FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "payout_recipients_insert_own" ON payout_recipients FOR INSERT WITH CHECK (rider_id = auth.uid());
CREATE POLICY "payout_recipients_select_admin" ON payout_recipients FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Earnings Ledger (rider sees own, admin sees all)
CREATE POLICY "earnings_ledger_select_own" ON earnings_ledger FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "earnings_ledger_select_admin" ON earnings_ledger FOR SELECT USING (get_user_role() IN ('admin', 'super_admin'));

-- Rider Current Locations (rider manages own, customer sees assigned rider)
CREATE POLICY "rider_current_locations_insert_own" ON rider_current_locations FOR INSERT WITH CHECK (rider_id = auth.uid());
CREATE POLICY "rider_current_locations_update_own" ON rider_current_locations FOR UPDATE USING (rider_id = auth.uid());
CREATE POLICY "rider_current_locations_select_own" ON rider_current_locations FOR SELECT USING (rider_id = auth.uid());
CREATE POLICY "rider_current_locations_select_customer" ON rider_current_locations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.assigned_rider_id = rider_current_locations.rider_id
      AND orders.customer_id = auth.uid()
      AND orders.status IN ('rider_assigned', 'rider_en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_destination')
  )
);
CREATE POLICY "rider_current_locations_select_admin" ON rider_current_locations FOR SELECT USING (get_user_role() IN ('admin', 'super_admin', 'operations'));

-- Rider Assignments: customer can see assignments for their orders
CREATE POLICY "rider_assignments_select_customer" ON rider_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = rider_assignments.order_id AND orders.customer_id = auth.uid())
);

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM orders WHERE DATE(created_at) = CURRENT_DATE;
  new_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Generate tracking code
CREATE OR REPLACE FUNCTION generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := 'TRK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM orders WHERE tracking_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  ) / 1000;
END;
$$ LANGUAGE plpgsql;

-- Atomically consume a quote
CREATE OR REPLACE FUNCTION consume_quote(
  p_quote_id UUID,
  p_order_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_quote delivery_quotes%ROWTYPE;
BEGIN
  SELECT * INTO v_quote
  FROM delivery_quotes
  WHERE id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_quote.is_consumed = TRUE THEN
    RETURN FALSE;
  END IF;

  IF v_quote.valid_until < NOW() THEN
    RETURN FALSE;
  END IF;

  UPDATE delivery_quotes
  SET is_consumed = TRUE,
      consumed_at = NOW(),
      order_id = p_order_id
  WHERE id = p_quote_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Find nearest eligible riders
CREATE OR REPLACE FUNCTION find_nearest_riders(
  p_lat DECIMAL,
  p_lon DECIMAL,
  p_max_distance_km DECIMAL,
  p_limit INTEGER
)
RETURNS TABLE (
  rider_id UUID,
  distance_km DECIMAL,
  rating DECIMAL
) AS $$
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
    AND ST_Distance(
      rcl.location,
      ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography
    ) / 1000 <= p_max_distance_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Dispatch rider with atomic offer/accept lifecycle
CREATE OR REPLACE FUNCTION dispatch_rider_v2(p_order_id UUID)
RETURNS TABLE (success BOOLEAN, rider_id UUID, message TEXT) AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_rider RECORD;
  v_assignment_id UUID;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_order.status NOT IN ('paid', 'searching_rider') THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Order not in dispatchable state'::TEXT;
    RETURN;
  END IF;

  UPDATE orders SET status = 'searching_rider', updated_at = NOW() WHERE id = p_order_id;

  FOR v_rider IN
    SELECT * FROM find_nearest_riders(
      v_order.pickup_latitude, v_order.pickup_longitude, 10, 10
    )
  LOOP
    BEGIN
      INSERT INTO rider_assignments (order_id, rider_id, status, expires_at)
      VALUES (p_order_id, v_rider.rider_id, 'offered', NOW() + INTERVAL '30 seconds')
      RETURNING id INTO v_assignment_id;

      UPDATE rider_current_locations SET is_available = FALSE
      WHERE rider_id = v_rider.rider_id;

      -- Order stays searching_rider until rider accepts
      RETURN QUERY SELECT TRUE, v_rider.rider_id, 'Offer sent to rider'::TEXT;
      RETURN;

    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  UPDATE orders SET status = 'failed', updated_at = NOW() WHERE id = p_order_id;
  RETURN QUERY SELECT FALSE, NULL::UUID, 'No eligible riders available'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Accept rider offer (atomic, race-condition safe)
CREATE OR REPLACE FUNCTION accept_rider_offer(
  p_assignment_id UUID,
  p_rider_id UUID
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_assignment rider_assignments%ROWTYPE;
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_assignment
  FROM rider_assignments
  WHERE id = p_assignment_id AND rider_id = p_rider_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Assignment not found'::TEXT;
    RETURN;
  END IF;

  IF v_assignment.status != 'offered' THEN
    RETURN QUERY SELECT FALSE, 'Assignment not in offered state'::TEXT;
    RETURN;
  END IF;

  IF v_assignment.expires_at < NOW() THEN
    UPDATE rider_assignments SET status = 'expired', responded_at = NOW()
    WHERE id = p_assignment_id;
    RETURN QUERY SELECT FALSE, 'Offer expired'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = v_assignment.order_id FOR UPDATE;

  IF v_order.status != 'searching_rider' THEN
    RETURN QUERY SELECT FALSE, 'Order no longer searching'::TEXT;
    RETURN;
  END IF;

  UPDATE rider_assignments
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_assignment_id;

  UPDATE orders
  SET status = 'rider_assigned',
      assigned_rider_id = p_rider_id,
      rider_assigned_at = NOW(),
      updated_at = NOW()
  WHERE id = v_assignment.order_id;

  UPDATE rider_assignments
  SET status = 'cancelled'
  WHERE order_id = v_assignment.order_id
    AND id != p_assignment_id
    AND status = 'offered';

  UPDATE rider_current_locations rcl
  SET is_available = TRUE
  WHERE rcl.rider_id IN (
    SELECT ra.rider_id FROM rider_assignments ra
    WHERE ra.order_id = v_assignment.order_id
      AND ra.id != p_assignment_id
      AND ra.status = 'cancelled'
  );

  RETURN QUERY SELECT TRUE, 'Rider accepted'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Reject rider offer
CREATE OR REPLACE FUNCTION reject_rider_offer(
  p_assignment_id UUID,
  p_rider_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_assignment rider_assignments%ROWTYPE;
BEGIN
  SELECT * INTO v_assignment
  FROM rider_assignments
  WHERE id = p_assignment_id AND rider_id = p_rider_id
  FOR UPDATE;

  IF NOT FOUND OR v_assignment.status != 'offered' THEN
    RETURN QUERY SELECT FALSE, 'Invalid assignment'::TEXT;
    RETURN;
  END IF;

  UPDATE rider_assignments
  SET status = 'rejected', responded_at = NOW(), rejection_reason = p_reason
  WHERE id = p_assignment_id;

  UPDATE rider_current_locations SET is_available = TRUE
  WHERE rider_id = p_rider_id;

  INSERT INTO background_jobs (job_type, payload, priority)
  VALUES ('DISPATCH_RETRY', jsonb_build_object('order_id', v_assignment.order_id), 8);

  RETURN QUERY SELECT TRUE, 'Offer rejected'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Process expired offers (cron/background job)
CREATE OR REPLACE FUNCTION process_expired_offers()
RETURNS VOID AS $$
DECLARE
  v_assignment RECORD;
BEGIN
  FOR v_assignment IN
    SELECT id, order_id, rider_id
    FROM rider_assignments
    WHERE status = 'offered' AND expires_at < NOW()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE rider_assignments SET status = 'expired'
    WHERE id = v_assignment.id;

    UPDATE rider_current_locations SET is_available = TRUE
    WHERE rider_id = v_assignment.rider_id;

    INSERT INTO background_jobs (job_type, payload, priority)
    VALUES ('DISPATCH_RETRY', jsonb_build_object('order_id', v_assignment.order_id), 8);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Grant table permissions
GRANT SELECT ON profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON profiles TO authenticated, service_role;

GRANT SELECT ON customer_profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON customer_profiles TO authenticated, service_role;

GRANT SELECT ON rider_profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON rider_profiles TO authenticated, service_role;

GRANT SELECT ON business_profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON business_profiles TO authenticated, service_role;

GRANT SELECT ON business_members TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON business_members TO authenticated, service_role;

GRANT SELECT ON addresses TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON addresses TO authenticated, service_role;

GRANT SELECT ON vehicles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON vehicles TO authenticated, service_role;

GRANT SELECT ON service_zones TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON service_zones TO service_role;

GRANT SELECT ON delivery_categories TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON delivery_categories TO service_role;

GRANT SELECT ON pricing_rules TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON pricing_rules TO service_role;

GRANT SELECT ON orders TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON orders TO authenticated, service_role;

GRANT SELECT ON order_events TO anon, authenticated, service_role;
GRANT INSERT ON order_events TO authenticated, service_role;

GRANT SELECT ON order_status_history TO anon, authenticated, service_role;
GRANT INSERT ON order_status_history TO authenticated, service_role;

GRANT SELECT ON delivery_quotes TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON delivery_quotes TO authenticated, service_role;

GRANT SELECT ON rider_assignments TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON rider_assignments TO authenticated, service_role;

GRANT SELECT ON rider_locations TO anon, authenticated, service_role;
GRANT INSERT ON rider_locations TO authenticated, service_role;

GRANT SELECT ON rider_current_locations TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON rider_current_locations TO authenticated, service_role;

GRANT SELECT ON payments TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON payments TO authenticated, service_role;

GRANT SELECT ON processed_webhook_events TO anon, authenticated, service_role;
GRANT INSERT ON processed_webhook_events TO service_role;

GRANT SELECT ON refunds TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON refunds TO service_role;

GRANT SELECT ON payout_recipients TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON payout_recipients TO authenticated, service_role;

GRANT SELECT ON payouts TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON payouts TO service_role;

GRANT SELECT ON earnings_ledger TO anon, authenticated, service_role;
GRANT INSERT ON earnings_ledger TO service_role;

GRANT SELECT ON delivery_proofs TO anon, authenticated, service_role;
GRANT INSERT ON delivery_proofs TO authenticated, service_role;

GRANT SELECT ON notifications TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON notifications TO authenticated, service_role;

GRANT SELECT ON ratings TO anon, authenticated, service_role;
GRANT INSERT ON ratings TO authenticated, service_role;

GRANT SELECT ON support_tickets TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON support_tickets TO authenticated, service_role;

GRANT SELECT ON promotions TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON promotions TO service_role;

GRANT SELECT ON audit_logs TO anon, authenticated, service_role;
GRANT INSERT ON audit_logs TO service_role;

GRANT SELECT ON platform_settings TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON platform_settings TO service_role;

GRANT SELECT ON background_jobs TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON background_jobs TO service_role;

GRANT SELECT ON idempotency_keys TO anon, authenticated, service_role;
GRANT INSERT ON idempotency_keys TO authenticated, service_role;

-- Revoke default public access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Re-apply grants
GRANT SELECT ON profiles TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON profiles TO authenticated, service_role;

-- (Repeat for all tables - but Supabase RLS handles the actual access control)
