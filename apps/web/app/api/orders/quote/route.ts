import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { quoteService } from '@/lib/services/quote.service';
import { z } from 'zod';

const QuoteRequestSchema = z.object({
  pickup_latitude: z.number().min(-90).max(90),
  pickup_longitude: z.number().min(-180).max(180),
  pickup_address_text: z.string().max(500).optional(),
  destination_latitude: z.number().min(-90).max(90),
  destination_longitude: z.number().min(-180).max(180),
  destination_address_text: z.string().max(500).optional(),
  category_id: z.string().uuid(),
  weight_kg: z.number().positive().max(100).optional(),
  quantity: z.number().int().positive().max(100).optional(),
  urgency_level: z.enum(['standard', 'express', 'urgent']).optional(),
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

    const body = await request.json();
    const validatedData = QuoteRequestSchema.parse(body);

    const quote = await quoteService.generateQuote(user.id, validatedData);
    return NextResponse.json({ data: quote }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('No pricing rule')) {
        return NextResponse.json(
          { error: 'Service not available in this area' },
          { status: 400 }
        );
      }
    }
    console.error('Error generating quote:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}
