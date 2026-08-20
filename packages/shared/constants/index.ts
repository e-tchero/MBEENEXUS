// =============================================
// Application Constants
// =============================================

export const APP_NAME = 'Delivery Platform';
export const APP_DESCRIPTION = 'On-demand delivery platform';

// =============================================
// Order Constants
// =============================================

export const MAX_ORDER_ITEMS = 10;
export const MIN_ORDER_AMOUNT = 500; // NGN
export const MAX_ORDER_AMOUNT = 1_000_000; // NGN
export const ORDER_NUMBER_PREFIX = 'ORD';
export const TRACKING_CODE_PREFIX = 'TRK';

// =============================================
// Delivery Constants
// =============================================

export const MAX_DELIVERY_DISTANCE_KM = 100;
export const MIN_DELIVERY_DISTANCE_KM = 0.5;
export const DEFAULT_DELIVERY_RADIUS_KM = 10;
export const MAX_PACKAGE_WEIGHT_KG = 100;
export const MAX_PACKAGE_DIMENSION_CM = 200;
export const MAX_PACKAGE_QUANTITY = 100;

// =============================================
// Rider Constants
// =============================================

export const MIN_RIDER_RATING = 4.0;
export const MAX_RIDER_DISTANCE_KM = 10;
export const RIDER_OFFER_TIMEOUT_SECONDS = 30;
export const MAX_CONCURRENT_DELIVERIES = 3;
export const RIDER_LOCATION_UPDATE_THROTTLE_SECONDS = 5;
export const RIDER_LOCATION_FRESHNESS_SECONDS = 300; // 5 minutes

// =============================================
// Payment Constants
// =============================================

export const PAYMENT_CURRENCY = 'NGN';
export const PAYMENT_TIMEOUT_MINUTES = 30;
export const MIN_PAYMENT_AMOUNT = 100; // NGN
export const MAX_PAYMENT_AMOUNT = 10_000_000; // NGN

// =============================================
// Refund Constants
// =============================================

export const DISPUTE_WINDOW_HOURS = 24;
export const MAX_REFUND_PERCENTAGE_AFTER_PICKUP = 50;
export const MAX_REFUND_PERCENTAGE_IN_TRANSIT = 50;

// =============================================
// Quote Constants
// =============================================

export const QUOTE_VALIDITY_MINUTES = 15;

// =============================================
// Tax Constants
// =============================================

export const DEFAULT_TAX_RATE = 0.075; // 7.5% VAT
export const DEFAULT_TAX_NAME = 'VAT';

// =============================================
// Rate Limiting Constants
// =============================================

export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// =============================================
// Notification Constants
// =============================================

export const NOTIFICATION_TYPES = {
  ORDER_CREATED: 'order_created',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  RIDER_ASSIGNED: 'rider_assigned',
  RIDER_HEADING_TO_PICKUP: 'rider_heading_to_pickup',
  RIDER_ARRIVED_AT_PICKUP: 'rider_arrived_at_pickup',
  PACKAGE_PICKED_UP: 'package_picked_up',
  PACKAGE_IN_TRANSIT: 'package_in_transit',
  RIDER_AT_DESTINATION: 'rider_at_destination',
  DELIVERY_COMPLETE: 'delivery_complete',
  ORDER_CANCELLED: 'order_cancelled',
  REFUND_INITIATED: 'refund_initiated',
  NO_RIDERS_AVAILABLE: 'no_riders_available',
  SECURITY_ALERT: 'security_alert',
} as const;

// =============================================
// Audit Log Constants
// =============================================

export const AUDIT_ACTIONS = {
  // Order actions
  ORDER_CREATED: 'order_created',
  ORDER_CANCELLED: 'order_cancelled',
  ORDER_STATUS_CHANGED: 'order_status_changed',
  ORDER_REASSIGNED: 'order_reassigned',

  // Payment actions
  PAYMENT_INITIALIZED: 'payment_initialized',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_AMOUNT_MISMATCH: 'payment_amount_mismatch',

  // Refund actions
  REFUND_INITIATED: 'refund_initiated',
  REFUND_APPROVED: 'refund_approved',
  REFUND_COMPLETED: 'refund_completed',
  REFUND_FAILED: 'refund_failed',

  // Rider actions
  RIDER_REGISTERED: 'rider_registered',
  RIDER_VERIFIED: 'rider_verified',
  RIDER_REJECTED: 'rider_rejected',
  RIDER_AVAILABILITY_CHANGED: 'rider_availability_changed',

  // Admin actions
  PRICING_UPDATED: 'pricing_updated',
  ZONE_UPDATED: 'zone_updated',
  ACCOUNT_SUSPENDED: 'account_suspended',
  ACCOUNT_ACTIVATED: 'account_activated',
} as const;

// =============================================
// Vehicle Types
// =============================================

export const VEHICLE_TYPES = {
  BICYCLE: 'bicycle',
  MOTORCYCLE: 'motorcycle',
  TRICYCLE: 'tricycle',
  CAR: 'car',
  VAN: 'van',
} as const;

export const VEHICLE_TYPE_MULTIPLIERS: Record<string, number> = {
  bicycle: 1.0,
  motorcycle: 1.0,
  tricycle: 1.2,
  car: 1.5,
  van: 2.0,
};

// =============================================
// Urgency Levels
// =============================================

export const URGENCY_LEVELS = {
  STANDARD: 'standard',
  EXPRESS: 'express',
  URGENT: 'urgent',
} as const;

export const URGENCY_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  express: 1.5,
  urgent: 2.0,
};

// =============================================
// Weight Bands (Default)
// =============================================

export const DEFAULT_WEIGHT_BANDS = [
  { min_kg: 0, max_kg: 5, multiplier: 1.0 },
  { min_kg: 5, max_kg: 10, multiplier: 1.2 },
  { min_kg: 10, max_kg: 20, multiplier: 1.5 },
  { min_kg: 20, max_kg: 50, multiplier: 2.0 },
  { min_kg: 50, max_kg: 100, multiplier: 3.0 },
];

// =============================================
// Time Constants
// =============================================

export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
