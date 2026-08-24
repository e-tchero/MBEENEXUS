import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 1. Verify webhook signature
    if (!verifyPaystackWebhook(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const serviceRole = await createServiceRoleClient();

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
        return NextResponse.json({ message: 'Already processed' });
      }
    }

    // 3. Process payment event
    if (payload.event === 'charge.success') {
      const reference = payload.data.reference;
      const amountInKobo = payload.data.amount;
      const paystackTxnId = String(payload.data.id); // Paystack transaction ID

      // 4. Verify payment and confirm order
      const result = await serviceRole.rpc('verify_payment_and_confirm_order', {
        p_reference: reference,
        p_amount: amountInKobo / 100, // Convert kobo to NGN
        p_event_id: eventId,
      });

      if (result.data && result.data.length > 0 && result.data[0].success) {
        const orderId = result.data[0].order_id;

        // 5. Store Paystack transaction ID on the payment record
        // This is needed for refund processing later
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
      }
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

function verifyPaystackWebhook(payload: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) {
    console.error('PAYSTACK_WEBHOOK_SECRET not configured');
    return false;
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}
