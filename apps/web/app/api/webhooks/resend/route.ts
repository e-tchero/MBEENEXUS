/**
 * Resend Webhook Endpoint — Embee Nexus
 *
 * Handles Resend webhook events for email delivery status tracking.
 * Follows the same pattern as the Paystack webhook endpoint.
 *
 * Events handled:
 * - email.sent: Delivery accepted by provider
 * - email.delivered: Successfully delivered to recipient
 * - email.bounced: Email bounced (permanent failure)
 * - email.complained: Recipient marked as spam
 * - email.opened: Email opened (optional tracking)
 * - email.clicked: Link clicked (optional tracking)
 *
 * Security:
 * - Signature verification using svix
 * - Raw body verification
 * - Idempotent processing
 *
 * Provider-neutral: Uses generic notification_deliveries fields.
 * No Resend-specific domain abstractions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { withRequestContext } from '@/lib/request-context';
import crypto from 'crypto';

// Resend webhook event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.bounced'
  | 'email.complained'
  | 'email.opened'
  | 'email.clicked'
  | 'email.failed'
  | 'email.suppressed';

interface ResendWebhookEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Additional fields depending on event type
    bounce?: {
      type: string;
      message: string;
    };
    click?: {
      url: string;
      ipAddress: string;
      userAgent: string;
    };
  };
}

/**
 * Map Resend event types to our delivery status values.
 * Uses provider-neutral status values.
 */
function mapEventToStatus(eventType: ResendEventType): string | null {
  switch (eventType) {
    case 'email.sent':
      return 'sent';
    case 'email.delivered':
      return 'delivered';
    case 'email.delivery_delayed':
      return 'pending'; // Keep as pending, will be updated when delivered
    case 'email.bounced':
    case 'email.failed':
    case 'email.suppressed':
      return 'permanent_failure';
    case 'email.complained':
      return 'failed';
    case 'email.opened':
    case 'email.clicked':
      return null; // Informational events, no status change
    default:
      return null;
  }
}

/**
 * Verify Resend webhook signature.
 *
 * Resend uses svix for webhook signing.
 * The signature is in the svix-signature header.
 *
 * For now, we verify using HMAC-SHA256 with the webhook secret.
 * When svix SDK is available, switch to svix verification.
 */
function verifyResendWebhook(
  body: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp) {
    logger.warn('resend.webhook.missing_signature');
    return false;
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('resend.webhook.no_secret_configured');
    // If no secret is configured, skip verification (development only)
    return process.env.NODE_ENV !== 'production';
  }

  try {
    // Resend uses svix signature format: "v1,<base64>"
    // We need to verify: HMAC-SHA256(secret, timestamp.body)
    const toSign = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(toSign)
      .digest('base64');

    // Compare signatures (timing-safe)
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(`v1,${expectedSignature}`);

    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch (error) {
    logger.error('resend.webhook.signature_verification_failed', {}, error instanceof Error ? error : undefined);
    return false;
  }
}

/**
 * POST /api/webhooks/resend
 *
 * Handles Resend webhook events for delivery status tracking.
 */
export async function POST(request: NextRequest) {
  return withRequestContext(request, async (reqLogger) => {
    try {
      const body = await request.text();
      const signature = request.headers.get('svix-signature');
      const timestamp = request.headers.get('svix-timestamp');

      // 1. Verify webhook signature
      if (!verifyResendWebhook(body, signature, timestamp)) {
        reqLogger.warn('resend.webhook.invalid_signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      // 2. Parse event
      let event: ResendWebhookEvent;
      try {
        event = JSON.parse(body);
      } catch {
        reqLogger.warn('resend.webhook.invalid_payload');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
      }

      reqLogger.info('resend.webhook.received', {
        event_type: event.type,
        email_id: event.data?.email_id,
      });

      // 3. Skip informational events (opened, clicked)
      const newStatus = mapEventToStatus(event.type);
      if (newStatus === null) {
        reqLogger.info('resend.webhook.informational_event', { event_type: event.type });
        return NextResponse.json({ received: true });
      }

      // 4. Update delivery status in database
      const serviceRole = await createServiceRoleClient();

      // Find the notification delivery record by provider_message_id
      const { data: delivery, error: findError } = await serviceRole
        .from('notification_deliveries')
        .select('id, notification_id, delivery_status')
        .eq('provider', 'resend')
        .eq('provider_message_id', event.data.email_id)
        .limit(1);

      if (findError) {
        reqLogger.error('resend.webhook.delivery_lookup_failed', {
          email_id: event.data.email_id,
        }, findError instanceof Error ? findError : undefined);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      if (!delivery || delivery.length === 0) {
        reqLogger.warn('resend.webhook.delivery_not_found', {
          email_id: event.data.email_id,
        });
        // Not an error — event may arrive before delivery record is created
        return NextResponse.json({ received: true });
      }

      const deliveryRecord = delivery[0];

      // 5. Update delivery status (idempotent — same status is fine)
      const { error: updateError } = await serviceRole
        .from('notification_deliveries')
        .update({
          delivery_status: newStatus,
          last_error: event.type === 'email.bounced'
            ? event.data.bounce?.message || 'Bounced'
            : event.type === 'email.complained'
              ? 'Marked as spam'
              : null,
          metadata: {
            resend_event: event.type,
            resend_created_at: event.created_at,
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', deliveryRecord.id);

      if (updateError) {
        reqLogger.error('resend.webhook.delivery_update_failed', {
          delivery_id: deliveryRecord.id,
        }, updateError instanceof Error ? updateError : undefined);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      }

      // 6. Update parent notification status if delivery is terminal
      if (newStatus === 'delivered' || newStatus === 'permanent_failure') {
        await serviceRole
          .from('notifications')
          .update({
            delivery_status: newStatus,
            sent_at: newStatus === 'delivered' ? new Date().toISOString() : undefined,
          })
          .eq('id', deliveryRecord.notification_id);
      }

      reqLogger.info('resend.webhook.processed', {
        delivery_id: deliveryRecord.id,
        event_type: event.type,
        new_status: newStatus,
      });

      return NextResponse.json({ received: true });
    } catch (error) {
      reqLogger.error('resend.webhook.error', {}, error instanceof Error ? error : undefined);
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  });
}
