import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Payment } from '@repo/shared/types';

export interface PaymentInitializationResult {
  reference: string;
  access_code: string;
  authorization_url: string;
}

export class PaymentService {
  async initializePayment(
    orderId: string,
    customerId: string,
    paymentMethod: 'card' | 'bank_transfer' | 'ussd'
  ): Promise<PaymentInitializationResult> {
    const serviceRole = await createServiceRoleClient();

    // 1. Get order and validate ownership
    const { data: order, error: orderError } = await serviceRole
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    if (order.status !== 'pending_payment') {
      throw new Error('Order is not awaiting payment');
    }

    // 2. Get payment record
    const { data: payment, error: paymentError } = await serviceRole
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('customer_id', customerId)
      .eq('status', 'pending')
      .single();

    if (paymentError || !payment) {
      throw new Error('Payment record not found');
    }

    // 3. Get customer email
    const { data: authUser } = await serviceRole.auth.admin.getUserById(customerId);

    if (!authUser?.user?.email) {
      throw new Error('Customer email not found');
    }

    // 4. Initialize Paystack transaction
    const paystackResult = await this.initializePaystackTransaction({
      amount: order.total_amount,
      email: authUser.user.email,
      reference: payment.paystack_reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?status=success`,
      metadata: {
        order_id: orderId,
        payment_id: payment.id,
        customer_id: customerId,
      },
    });

    // 5. Update payment record with access code
    await serviceRole
      .from('payments')
      .update({
        paystack_access_code: paystackResult.access_code,
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    // 6. Record event
    await serviceRole.from('order_events').insert({
      order_id: orderId,
      event_type: 'payment_initialized',
      from_status: 'pending_payment',
      to_status: 'pending_payment',
      actor_id: customerId,
      actor_type: 'customer',
      metadata: {
        payment_id: payment.id,
        payment_method: paymentMethod,
        reference: payment.paystack_reference,
      },
    });

    return {
      reference: payment.paystack_reference,
      access_code: paystackResult.access_code,
      authorization_url: paystackResult.authorization_url,
    };
  }

  private async initializePaystackTransaction(params: {
    amount: number;
    email: string;
    reference: string;
    callback_url: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentInitializationResult> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // Convert NGN to kobo
        email: params.email,
        reference: params.reference,
        callback_url: params.callback_url,
        metadata: params.metadata,
      }),
    });

    const data = await response.json();

    if (!data.status) {
      throw new Error(data.message || 'Payment initialization failed');
    }

    return {
      reference: data.data.reference,
      access_code: data.data.access_code,
      authorization_url: data.data.authorization_url,
    };
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}

export const paymentService = new PaymentService();
