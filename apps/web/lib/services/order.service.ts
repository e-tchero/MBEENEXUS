import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import type { Order, Payment } from '@repo/shared/types';

export interface CreateOrderInput {
  quote_id: string;
  pickup_address_id: string;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_instructions?: string;
  destination_address_id: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_instructions?: string;
  payment_method: 'card' | 'bank_transfer' | 'ussd';
  promo_code?: string;
}

export interface OrderCreationResult {
  order: Order;
  payment: Payment;
}

export class OrderService {
  async createOrder(
    customerId: string,
    input: CreateOrderInput
  ): Promise<OrderCreationResult> {
    const serviceRole = await createServiceRoleClient();

    // 1. Get and validate quote
    const { data: quote, error: quoteError } = await serviceRole
      .from('delivery_quotes')
      .select('*')
      .eq('id', input.quote_id)
      .eq('customer_id', customerId)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    if (quote.is_consumed) {
      throw new Error('Quote already consumed');
    }

    if (new Date(quote.valid_until) < new Date()) {
      throw new Error('Quote expired');
    }

    // 2. Get addresses to validate ownership
    const { data: pickupAddress } = await serviceRole
      .from('addresses')
      .select('*')
      .eq('id', input.pickup_address_id)
      .eq('user_id', customerId)
      .single();

    if (!pickupAddress) {
      throw new Error('Pickup address not found');
    }

    const { data: destinationAddress } = await serviceRole
      .from('addresses')
      .select('*')
      .eq('id', input.destination_address_id)
      .eq('user_id', customerId)
      .single();

    if (!destinationAddress) {
      throw new Error('Destination address not found');
    }

    // 3. Generate identifiers
    const orderNumber = await this.generateOrderNumber(serviceRole);
    const trackingCode = await this.generateTrackingCode(serviceRole);
    const paymentReference = `MBEENEXUS-${orderNumber}-${Date.now()}`;

    // 4. Get tax snapshot from pricing rule
    const { data: pricingRule } = await serviceRole
      .from('pricing_rules')
      .select('tax_rate, tax_name')
      .eq('id', quote.pricing_rule_id)
      .single();

    // 5. Create order
    const orderId = crypto.randomUUID();
    const { data: order, error: orderError } = await serviceRole
      .from('orders')
      .insert({
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        status: 'pending_payment',
        pickup_address_id: input.pickup_address_id,
        pickup_contact_name: input.pickup_contact_name,
        pickup_contact_phone: input.pickup_contact_phone,
        pickup_instructions: input.pickup_instructions,
        pickup_latitude: quote.pickup_latitude,
        pickup_longitude: quote.pickup_longitude,
        destination_address_id: input.destination_address_id,
        recipient_name: input.recipient_name,
        recipient_phone: input.recipient_phone,
        delivery_instructions: input.delivery_instructions,
        destination_latitude: quote.destination_latitude,
        destination_longitude: quote.destination_longitude,
        category_id: quote.category_id,
        package_description: 'Package',
        package_weight_kg: quote.weight_kg,
        package_dimensions: quote.dimensions,
        quantity: quote.quantity,
        pricing_rule_id: quote.pricing_rule_id,
        base_fee: quote.base_fee,
        distance_fee: quote.distance_fee,
        weight_fee: quote.weight_fee,
        urgency_fee: quote.urgency_fee,
        discount_amount: quote.discount_amount,
        tax_amount: quote.tax_amount,
        tax_rate_applied: pricingRule?.tax_rate,
        tax_name_applied: pricingRule?.tax_name,
        total_amount: quote.total_amount,
        currency: quote.currency,
        distance_km: quote.distance_km,
        estimated_duration_minutes: quote.estimated_duration_minutes,
        urgency_level: 'standard',
        tracking_code: trackingCode,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error('Failed to create order');
    }

    // 6. Mark quote as consumed
    const { error: consumeError } = await serviceRole
      .from('delivery_quotes')
      .update({
        is_consumed: true,
        consumed_at: new Date().toISOString(),
        order_id: orderId,
      })
      .eq('id', input.quote_id);

    if (consumeError) {
      console.error('Quote consumption error:', consumeError);
      // Order is created, continue with payment
    }

    // 7. Create order event
    await serviceRole.from('order_events').insert({
      order_id: orderId,
      event_type: 'order_created',
      from_status: null,
      to_status: 'pending_payment',
      actor_id: customerId,
      actor_type: 'customer',
      metadata: {
        quote_id: input.quote_id,
        payment_method: input.payment_method,
      },
    });

    // 8. Create order status history
    await serviceRole.from('order_status_history').insert({
      order_id: orderId,
      status: 'pending_payment',
      notes: 'Order created, awaiting payment',
      created_by: customerId,
    });

    // 9. Create payment record
    const { data: payment, error: paymentError } = await serviceRole
      .from('payments')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        paystack_reference: paymentReference,
        amount: quote.total_amount,
        currency: quote.currency,
        payment_method: input.payment_method,
        status: 'pending',
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      throw new Error('Failed to create payment record');
    }

    return { order, payment };
  }

  private async generateOrderNumber(
    serviceRole: Awaited<ReturnType<typeof createServiceRoleClient>>
  ): Promise<string> {
    // Use the atomic PostgreSQL function for concurrency-safe order numbers
    const { data, error } = await serviceRole.rpc('generate_order_number');

    if (error || !data) {
      console.error('Failed to generate order number:', error);
      throw new Error('Failed to generate order number');
    }

    return data;
  }

  private async generateTrackingCode(
    serviceRole: Awaited<ReturnType<typeof createServiceRoleClient>>
  ): Promise<string> {
    let code: string;
    let exists = true;

    while (exists) {
      code = `TRK-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

      const { data } = await serviceRole
        .from('orders')
        .select('id')
        .eq('tracking_code', code)
        .limit(1);

      exists = !!data?.length;
    }

    return code!;
  }

  async getOrderById(orderId: string, userId: string): Promise<Order | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('customer_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async listOrders(
    userId: string,
    options: { status?: string[]; page?: number; limit?: number } = {}
  ): Promise<{ orders: Order[]; total: number }> {
    const supabase = await createClient();
    const { status, page = 1, limit = 20 } = options;

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('customer_id', userId);

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { orders: data || [], total: count || 0 };
  }
}

export const orderService = new OrderService();
