/**
 * Notification Event Hooks — Embee Nexus
 *
 * Connects domain events to the notification service.
 * Each hook function creates appropriate notifications when a business event occurs.
 *
 * Architecture: Business mutation → notification record → commit → delivery
 *
 * One authoritative event path per event type.
 * No scattered notification creation across routes.
 */

import { getNotificationService, type NotificationService } from './notification-service';
import { NOTIFICATION_TYPES } from '@repo/shared/constants';
import { logger } from '@/lib/logger';

// =============================================
// HOOK CONTEXT
// =============================================

export interface NotificationHookContext {
  /** Service role client for database access */
  serviceRole: Awaited<ReturnType<typeof import('@/lib/supabase/server').createServiceRoleClient>>;
  /** Optional notification service (for testing) */
  notificationService?: NotificationService;
}

function getService(ctx?: NotificationHookContext): NotificationService {
  return ctx?.notificationService || getNotificationService();
}

// =============================================
// ORDER EVENT HOOKS
// =============================================

/**
 * Hook: Order created → notify customer
 */
export async function onOrderCreated(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    amount: number;
    pickupAddress?: string;
    destinationAddress?: string;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.ORDER_CREATED,
      title: 'Order Confirmed',
      body: `Your order ${data.orderNumber} has been confirmed. Amount: ₦${data.amount.toLocaleString()}.`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber, amount: data.amount },
      templateData: {
        order_number: data.orderNumber,
        amount: data.amount.toLocaleString(),
        pickup_address: data.pickupAddress || '',
        destination_address: data.destinationAddress || '',
      },
    });
  } catch (error) {
    logger.error('notification.hook_order_created_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: Payment successful → notify customer
 */
export async function onPaymentSuccess(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    amount: number;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      title: 'Payment Received',
      body: `Payment of ₦${data.amount.toLocaleString()} received for order ${data.orderNumber}. Searching for a rider...`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber, amount: data.amount },
    });
  } catch (error) {
    logger.error('notification.hook_payment_success_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: Payment failed → notify customer
 */
export async function onPaymentFailed(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    amount: number;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.PAYMENT_FAILED,
      title: 'Payment Failed',
      body: `Payment for order ${data.orderNumber} could not be processed. Please try again.`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber, amount: data.amount },
    });
  } catch (error) {
    logger.error('notification.hook_payment_failed_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: Rider assigned → notify customer
 */
export async function onRiderAssigned(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    riderName: string;
    eta?: string;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.RIDER_ASSIGNED,
      title: 'Rider Assigned',
      body: `${data.riderName} has been assigned to your order ${data.orderNumber}.`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber, rider_name: data.riderName },
    });
  } catch (error) {
    logger.error('notification.hook_rider_assigned_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: Rider heading to pickup → notify customer
 */
export async function onRiderHeadingToPickup(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    riderName: string;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.RIDER_HEADING_TO_PICKUP,
      title: 'Rider En Route',
      body: `${data.riderName} is on the way to pick up your package for order ${data.orderNumber}.`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber, rider_name: data.riderName },
    });
  } catch (error) {
    logger.error('notification.hook_rider_heading_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: Delivery completed → notify customer
 */
export async function onDeliveryCompleted(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.DELIVERY_COMPLETE,
      title: 'Delivery Complete',
      body: `Your order ${data.orderNumber} has been delivered successfully!`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber },
    });
  } catch (error) {
    logger.error('notification.hook_delivery_complete_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: Order cancelled → notify customer
 */
export async function onOrderCancelled(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    reason?: string;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.ORDER_CANCELLED,
      title: 'Order Cancelled',
      body: `Your order ${data.orderNumber} has been cancelled.${data.reason ? ` Reason: ${data.reason}` : ''}`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber, reason: data.reason },
    });
  } catch (error) {
    logger.error('notification.hook_order_cancelled_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: Refund initiated → notify customer
 */
export async function onRefundInitiated(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    customerId: string;
    amount: number;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.customerId,
      type: NOTIFICATION_TYPES.REFUND_INITIATED,
      title: 'Refund Initiated',
      body: `A refund of ₦${data.amount.toLocaleString()} has been initiated for order ${data.orderNumber}.`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: { order_number: data.orderNumber, amount: data.amount },
    });
  } catch (error) {
    logger.error('notification.hook_refund_initiated_failed', {
      order_id: data.orderId,
    }, error instanceof Error ? error : undefined);
  }
}

/**
 * Hook: New rider offer → notify rider
 */
export async function onNewRiderOffer(
  ctx: NotificationHookContext,
  data: {
    orderId: string;
    orderNumber: string;
    riderId: string;
    pickupAddress: string;
    destinationAddress: string;
    amount: number;
  }
): Promise<void> {
  try {
    const service = getService(ctx);
    await service.notify({
      userId: data.riderId,
      type: NOTIFICATION_TYPES.NO_RIDERS_AVAILABLE, // Reusing for new offer
      title: 'New Delivery Offer',
      body: `New delivery: ${data.pickupAddress} → ${data.destinationAddress}. Earning: ₦${data.amount.toLocaleString()}.`,
      channels: ['in_app'],
      referenceType: 'order',
      referenceId: data.orderId,
      metadata: {
        order_number: data.orderNumber,
        pickup: data.pickupAddress,
        destination: data.destinationAddress,
        amount: data.amount,
      },
    });
  } catch (error) {
    logger.error('notification.hook_new_offer_failed', {
      order_id: data.orderId,
      rider_id: data.riderId,
    }, error instanceof Error ? error : undefined);
  }
}
