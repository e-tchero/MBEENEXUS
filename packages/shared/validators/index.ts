import { z } from 'zod';

// =============================================
// Common Schemas
// =============================================

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const AddressSchema = z.object({
  address: z.string().min(1).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  contact_name: z.string().min(1).max(100),
  contact_phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
  instructions: z.string().max(500).optional(),
});

export const NigerianPhoneSchema = z
  .string()
  .regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number');

// =============================================
// Auth Schemas
// =============================================

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1).max(100),
  phone: NigerianPhoneSchema.optional(),
  role: z.enum(['customer', 'rider']),
});

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// =============================================
// Quote Schemas
// =============================================

export const QuoteRequestSchema = z.object({
  pickup: AddressSchema,
  destination: AddressSchema,
  package: z.object({
    category_id: z.string().uuid(),
    description: z.string().min(1).max(500),
    weight_kg: z.number().positive().max(100).optional(),
    dimensions: z
      .object({
        length: z.number().positive().max(200),
        width: z.number().positive().max(200),
        height: z.number().positive().max(200),
      })
      .optional(),
    quantity: z.number().int().positive().max(100),
    special_handling_requirements: z.string().max(500).optional(),
  }),
  urgency_level: z.enum(['standard', 'express', 'urgent']),
});

// =============================================
// Order Schemas
// =============================================

export const CreateOrderRequestSchema = z.object({
  quote_id: z.string().uuid(),
  payment_method: z.enum(['card', 'bank_transfer', 'ussd']),
  promo_code: z.string().max(50).optional(),
});

export const CancelOrderRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const ListOrdersRequestSchema = z.object({
  status: z
    .array(
      z.enum([
        'draft',
        'pending_payment',
        'paid',
        'searching_rider',
        'rider_assigned',
        'rider_en_route_to_pickup',
        'arrived_at_pickup',
        'picked_up',
        'in_transit',
        'arrived_at_destination',
        'delivered',
        'completed',
        'cancelled',
        'failed',
        'expired',
        'disputed',
        'refunded',
      ])
    )
    .optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort: z.enum(['created_at', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// =============================================
// Rider Schemas
// =============================================

export const UpdateLocationRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).max(200).optional(),
  accuracy: z.number().min(0).optional(),
});

export const UpdateDeliveryStatusRequestSchema = z.object({
  status: z.enum([
    'arrived_at_pickup',
    'picked_up',
    'arrived_at_destination',
    'delivered',
  ]),
  proof: z
    .object({
      type: z.enum(['photo', 'signature', 'pin', 'recipient_confirmation']),
      file_url: z.string().url().optional(),
      signature_data: z.string().optional(),
      pin_code: z.string().length(6).optional(),
      recipient_name: z.string().min(1).max(100).optional(),
      notes: z.string().max(500).optional(),
    })
    .optional(),
});

export const RejectJobRequestSchema = z.object({
  reason: z.string().max(500).optional(),
});

// =============================================
// Payment Schemas
// =============================================

export const InitializePaymentRequestSchema = z.object({
  order_id: z.string().uuid(),
  payment_method: z.enum(['card', 'bank_transfer', 'ussd']),
});

// =============================================
// Admin Schemas
// =============================================

export const AdminListOrdersRequestSchema = z.object({
  status: z
    .array(
      z.enum([
        'draft',
        'pending_payment',
        'paid',
        'searching_rider',
        'rider_assigned',
        'rider_en_route_to_pickup',
        'arrived_at_pickup',
        'picked_up',
        'in_transit',
        'arrived_at_destination',
        'delivered',
        'completed',
        'cancelled',
        'failed',
        'expired',
        'disputed',
        'refunded',
      ])
    )
    .optional(),
  customer_id: z.string().uuid().optional(),
  rider_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const AssignRiderRequestSchema = z.object({
  rider_id: z.string().uuid(),
});

export const UpdatePricingRequestSchema = z.object({
  base_fee: z.number().positive().optional(),
  per_kilometer: z.number().positive().optional(),
  per_kg: z.number().min(0).optional(),
  minimum_fare: z.number().positive().optional(),
  maximum_distance_km: z.number().positive().optional(),
  vehicle_type_multiplier: z.record(z.number().positive()).optional(),
  weight_bands: z
    .array(
      z.object({
        min_kg: z.number().min(0),
        max_kg: z.number().positive(),
        multiplier: z.number().positive(),
      })
    )
    .optional(),
  urgency_multipliers: z.record(z.number().positive()).optional(),
  is_active: z.boolean().optional(),
  valid_from: z.string().datetime().optional(),
  valid_to: z.string().datetime().optional(),
});

export const VerifyRiderRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(500).optional(),
});

export const ProcessRefundRequestSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(1).max(500),
  refund_type: z.enum(['full', 'partial', 'administrative']),
});

// =============================================
// Support Schemas
// =============================================

export const CreateSupportTicketSchema = z.object({
  order_id: z.string().uuid().optional(),
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum(['order', 'payment', 'rider', 'account', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

// =============================================
// Rating Schemas
// =============================================

export const CreateRatingSchema = z.object({
  order_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// =============================================
// Type Exports
// =============================================

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type CancelOrderRequest = z.infer<typeof CancelOrderRequestSchema>;
export type ListOrdersRequest = z.infer<typeof ListOrdersRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof UpdateLocationRequestSchema>;
export type UpdateDeliveryStatusRequest = z.infer<typeof UpdateDeliveryStatusRequestSchema>;
export type InitializePaymentRequest = z.infer<typeof InitializePaymentRequestSchema>;
export type AdminListOrdersRequest = z.infer<typeof AdminListOrdersRequestSchema>;
export type ProcessRefundRequest = z.infer<typeof ProcessRefundRequestSchema>;
