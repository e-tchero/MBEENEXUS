import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID();

  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 1. Verify webhook signature
    if (!verifyPaystackWebhook(body, signature)) {
      logger.warn('Invalid webhook signature', { correlation_id: correlationId });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const serviceRole = await createServiceRoleClient();

    logger.info('Webhook received', {
      correlation_id: correlationId,
      event_type: payload.event,
      event_id: payload.data?.id,
    });

    // 2. Check idempotency
    const eventId = payload.data?.id;
    if (eventId) {
      const { data: existing } = await serviceRole
        .from('processed_webhook_events')
        .select('id')
        .eq('provider', 'paystack')
        .eq('event_id', eventId)
        .limit(1);

      if (existing && existing.length > 0) {
        logger.info('Duplicate webhook event ignored', {
          correlation_id: correlationId,
          event_id: eventId,
        });
        return NextResponse.json({ message: 'Already processed' });
      }
    }

    // 3. Process payment event
    if (payload.event === 'charge.success') {
      const reference = payload.data.reference;
      const amountInKobo = payload.data.amount;
      const paystackTxnId = String(payload.data.id);

      // 4. Verify payment and confirm order
      const result = await serviceRole.rpc('verify_payment_and_confirm_order', {
        p_reference: reference,
        p_amount: amountInKobo / 100,
        p_event_id: eventId,
      });

      if (result.data && result.data.length > 0 && result.data[0].success) {
        const orderId = result.data[0].order_id;

        // 5. Store Paystack transaction ID on the payment record
        await serviceRole
          .from('payments')
          .update({
            paystack_transaction_id: paystackTxnId,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', orderId)
          .eq('status', 'success');

        // 6. Create dispatch background job
        await serviceRole.from('background_jobs').insert({
          job_type: 'DISPATCH_ORDER',
          payload: { order_id: orderId },
          priority: 10,
        });

        // 7. Record idempotency
        await serviceRole.from('processed_webhook_events').insert({
          provider: 'paystack',
          event_id: eventId,
          event_type: payload.event,
          reference: reference,
        });

        logger.info('Payment confirmed, dispatch initiated', {
          correlation_id: correlationId,
          order_id: orderId,
          reference,
        });
      }
    }

    // 4. Handle charge.failed
    if (payload.event === 'charge.failed') {
      const reference = payload.data.reference;

      // Find the payment record
      const { data: payment } = await serviceRole
        .from('payments')
        .select('id, order_id, status')
        .eq('paystack_reference', reference)
        .single();

      if (payment && payment.status === 'pending') {
        // Update payment status to failed
        await serviceRole
          .from('payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', payment.id);

        // Record order event
        await serviceRole.from('order_events').insert({
          order_id: payment.order_id,
          event_type: 'payment_failed',
          from_status: 'pending_payment',
          to_status: 'pending_payment',
          actor_type: 'system',
          metadata: {
            reference,
            paystack_event_id: eventId,
          },
        });

        // Record idempotency
        await serviceRole.from('processed_webhook_events').insert({
          provider: 'paystack',
          event_id: eventId,
          event_type: payload.event,
          reference,
        });

        logger.warn('Payment failed', {
          correlation_id: correlationId,
          order_id: payment.order_id,
          reference,
        });
      }
    }

    // 5. Handle refund events
    if (payload.event === 'refund.success' || payload.event === 'refund.failed') {
      const refundId = payload.data?.id;
      const refundReference = payload.data?.reference;

      if (refundId) {
        // Find refund by Paystack refund ID
        const { data: refund } = await serviceRole
          .from('refunds')
          .select('id, status')
          .eq('paystack_refund_id', String(refundId))
          .single();

        if (refund) {
          const newStatus = payload.event === 'refund.success' ? 'success' : 'failed';

          // Only update if not already in final state
          if (refund.status !== 'success' && refund.status !== 'failed') {
            await serviceRole
              .from('refunds')
              .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', refund.id);

            logger.info(`Refund ${newStatus}`, {
              correlation_id: correlationId,
              refund_id: refund.id,
              paystack_refund_id: String(refundId),
            });
          }

          // Record idempotency
          await serviceRole.from('processed_webhook_events').insert({
            provider: 'paystack',
            event_id: eventId,
            event_type: payload.event,
            reference: refundReference || String(refundId),
          });
        }
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    logger.error('Webhook processing error', { correlation_id: correlationId }, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function verifyPaystackWebhook(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('PAYSTACK_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}
