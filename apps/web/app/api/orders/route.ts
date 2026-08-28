import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { orderService } from '@/lib/services/order.service';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const CreateOrderSchema = z.object({
  quote_id: z.string().uuid(),
  pickup_address_id: z.string().uuid(),
  pickup_contact_name: z.string().min(1).max(100),
  pickup_contact_phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
  pickup_instructions: z.string().max(500).optional(),
  destination_address_id: z.string().uuid(),
  recipient_name: z.string().min(1).max(100),
  recipient_phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number'),
  delivery_instructions: z.string().max(500).optional(),
  payment_method: z.enum(['card', 'bank_transfer', 'ussd']),
  promo_code: z.string().max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: order tier (authenticated)
    const rateLimit = checkRateLimit(`user:${user.id}`, 'order');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const validatedData = CreateOrderSchema.parse(body);

    const result = await orderService.createOrder(user.id, validatedData);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('Quote not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('Quote already consumed') || error.message.includes('Quote expired')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    logger.error('Error creating order', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.split(',');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const result = await orderService.listOrders(user.id, { status, page, limit });

    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error('Error listing orders', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to list orders' },
      { status: 500 }
    );
  }
}
