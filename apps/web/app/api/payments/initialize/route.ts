import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { paymentService } from '@/lib/services/payment.service';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const InitializePaymentSchema = z.object({
  order_id: z.string().uuid(),
  payment_method: z.enum(['card', 'bank_transfer', 'ussd']),
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

    // Rate limit: payment tier (authenticated)
    const rateLimit = checkRateLimit(`user:${user.id}`, 'payment');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json();
    const validatedData = InitializePaymentSchema.parse(body);

    const result = await paymentService.initializePayment(
      validatedData.order_id,
      user.id,
      validatedData.payment_method
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('not awaiting payment')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error.message.includes('Payment initialization failed')) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
    }
    logger.error('Error initializing payment', undefined, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
