// =============================================
// User & Profile Types
// =============================================

export type UserRole =
  | 'customer'
  | 'rider'
  | 'business'
  | 'support'
  | 'operations'
  | 'admin'
  | 'super_admin';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerProfile {
  id: string;
  default_address_id: string | null;
  created_at: string;
}

export type RiderVerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export interface RiderProfile {
  id: string;
  verification_status: RiderVerificationStatus;
  verification_notes: string | null;
  is_available: boolean;
  current_location: string | null;
  last_location_update: string | null;
  rating: number;
  total_deliveries: number;
  cached_total_earnings: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  business_name: string;
  registration_number: string | null;
  tax_id: string | null;
  billing_address_id: string | null;
  credit_limit: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export type BusinessMemberRole = 'owner' | 'admin' | 'member';

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessMemberRole;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
}

// =============================================
// Address Types
// =============================================

export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  street_address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string | null;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// Vehicle Types
// =============================================

export type VehicleType = 'bicycle' | 'motorcycle' | 'tricycle' | 'car' | 'van';

export interface Vehicle {
  id: string;
  rider_id: string;
  vehicle_type: VehicleType;
  make: string | null;
  model: string | null;
  year: number | null;
  registration_number: string | null;
  insurance_expiry: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// Service Zone Types
// =============================================

export interface ServiceZone {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  boundary: string;
  is_active: boolean;
  operating_hours: Record<string, { open: string; close: string }> | null;
  min_delivery_time_minutes: number;
  max_delivery_time_minutes: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// Delivery Category Types
// =============================================

export interface DeliveryCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// =============================================
// Order Types
// =============================================

export type OrderStatus =
  | 'draft'
  | 'pending_payment'
  | 'paid'
  | 'searching_rider'
  | 'rider_assigned'
  | 'rider_en_route_to_pickup'
  | 'arrived_at_pickup'
  | 'picked_up'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'expired'
  | 'disputed'
  | 'refunded';

export type UrgencyLevel = 'standard' | 'express' | 'urgent';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;

  // Pickup
  pickup_address_id: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions: string | null;
  pickup_latitude: number;
  pickup_longitude: number;

  // Destination
  destination_address_id: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_instructions: string | null;
  destination_latitude: number;
  destination_longitude: number;

  // Package
  category_id: string;
  package_description: string;
  package_weight_kg: number | null;
  package_dimensions: Record<string, number> | null;
  quantity: number;
  special_handling_requirements: string | null;

  // Pricing
  pricing_rule_id: string;
  base_fee: number;
  distance_fee: number;
  weight_fee: number;
  zone_fee: number;
  urgency_fee: number;
  discount_amount: number;
  tax_amount: number;
  tax_rate_applied: number | null;
  tax_name_applied: string | null;
  total_amount: number;
  currency: string;

  // Delivery
  distance_km: number;
  estimated_duration_minutes: number;
  actual_duration_minutes: number | null;
  urgency_level: UrgencyLevel;

  // Rider assignment
  assigned_rider_id: string | null;
  rider_assigned_at: string | null;
  rider_arrived_at_pickup: string | null;
  rider_picked_up_at: string | null;
  rider_arrived_at_destination: string | null;
  delivered_at: string | null;
  completed_at: string | null;

  // Business
  business_id: string | null;
  business_reference: string | null;

  // Tracking
  tracking_code: string;

  // Cancellation
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

// =============================================
// Rider Assignment Types
// =============================================

export type AssignmentStatus = 'offered' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'completed';

export interface RiderAssignment {
  id: string;
  order_id: string;
  rider_id: string;
  status: AssignmentStatus;
  offered_at: string;
  responded_at: string | null;
  expires_at: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Payment Types
// =============================================

export type PaymentMethod = 'card' | 'bank_transfer' | 'ussd' | 'bank';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'abandoned'
  | 'refunded'
  | 'partially_refunded';

export interface Payment {
  id: string;
  order_id: string;
  customer_id: string;
  paystack_reference: string;
  paystack_access_code: string | null;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  verified_at: string | null;
  paystack_response: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Refund Types
// =============================================

export type RefundType = 'full' | 'partial' | 'administrative';
export type RefundStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface Refund {
  id: string;
  payment_id: string;
  order_id: string;
  amount: number;
  reason: string;
  refund_type: RefundType;
  paystack_refund_id: string | null;
  status: RefundStatus;
  approved_by: string | null;
  approved_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Payout Types
// =============================================

export type PayoutStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface PayoutRecipient {
  id: string;
  rider_id: string;
  paystack_recipient_code: string;
  bank_name: string;
  account_number_last4: string;
  account_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payout {
  id: string;
  rider_id: string;
  recipient_id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  paystack_transfer_id: string | null;
  processed_at: string | null;
  failed_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Earnings Ledger Types
// =============================================

export type LedgerReferenceType = 'delivery_earning' | 'payout' | 'adjustment' | 'refund';

export interface EarningsLedgerEntry {
  id: string;
  rider_id: string;
  order_id: string;
  credit: number;
  debit: number;
  balance_after: number;
  description: string;
  reference_type: LedgerReferenceType;
  reference_id: string | null;
  created_at: string;
}

// =============================================
// Pricing Types
// =============================================

export interface PricingRule {
  id: string;
  zone_id: string | null;
  name: string;
  description: string | null;
  base_fee: number;
  per_kilometer: number;
  per_kg: number;
  minimum_fare: number;
  maximum_distance_km: number | null;
  vehicle_type_multiplier: Record<VehicleType, number>;
  weight_bands: WeightBand[];
  urgency_multipliers: Record<UrgencyLevel, number>;
  tax_rate: number;
  tax_name: string;
  is_active: boolean;
  valid_from: string;
  valid_to: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface WeightBand {
  min_kg: number;
  max_kg: number;
  multiplier: number;
}

// =============================================
// Delivery Quote Types
// =============================================

export interface DeliveryQuote {
  id: string;
  customer_id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address_text: string | null;
  destination_latitude: number;
  destination_longitude: number;
  destination_address_text: string | null;
  category_id: string;
  weight_kg: number | null;
  dimensions: Record<string, number> | null;
  quantity: number;
  pricing_rule_id: string;
  base_fee: number;
  distance_fee: number;
  weight_fee: number;
  zone_fee: number;
  urgency_fee: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  distance_km: number;
  estimated_duration_minutes: number;
  valid_until: string;
  is_consumed: boolean;
  consumed_at: string | null;
  order_id: string | null;
  created_at: string;
}

// =============================================
// Notification Types
// =============================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  in_app: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
  sent_at: string | null;
  read_at: string | null;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// =============================================
// Rating Types
// =============================================

export interface Rating {
  id: string;
  order_id: string;
  customer_id: string;
  rider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

// =============================================
// Support Ticket Types
// =============================================

export type TicketCategory = 'order' | 'payment' | 'rider' | 'account' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  order_id: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

// =============================================
// Background Job Types
// =============================================

export type JobType =
  | 'DISPATCH_ORDER'
  | 'DISPATCH_RETRY'
  | 'OFFER_TIMEOUT'
  | 'QUOTE_EXPIRATION'
  | 'COMPLETE_ORDER'
  | 'NOTIFICATION_EMAIL'
  | 'NOTIFICATION_SMS'
  | 'NOTIFICATION_PUSH'
  | 'REFUND_PROCESS'
  | 'LOCATION_CLEANUP'
  | 'RIDER_LOCATION_REFRESH'
  | 'EARNINGS_AGGREGATION';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface BackgroundJob {
  id: string;
  job_type: JobType;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Audit Log Types
// =============================================

export type AuditActorType = 'customer' | 'rider' | 'admin' | 'system';

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_type: AuditActorType;
  actor_ip: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// =============================================
// Platform Settings Types
// =============================================

export interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  category: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

// =============================================
// API Response Types
// =============================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// =============================================
// Tracking Types
// =============================================

export interface TrackingData {
  order_number: string;
  status: OrderStatus;
  status_label: string;
  pickup: {
    address: string;
    instructions: string | null;
  };
  destination: {
    address: string;
    instructions: string | null;
  };
  rider: {
    name: string;
    phone: string;
    location: {
      latitude: number;
      longitude: number;
    } | null;
  } | null;
  estimated_arrival: string | null;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  status: OrderStatus;
  label: string;
  timestamp: string;
  description: string;
}
