import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderService } from '@/lib/services/rider.service';
import { z } from 'zod';

const RegisterRiderSchema = z.object({
  full_name: z.string().min(1).max(100),
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number').optional(),
  vehicle_type: z.enum(['bicycle', 'motorcycle', 'tricycle', 'car', 'van']),
  vehicle_make: z.string().max(50).optional(),
  vehicle_model: z.string().max(50).optional(),
  vehicle_year: z.number().int().min(1990).max(2030).optional(),
  vehicle_registration_number: z.string().max(20).optional(),
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
    const validatedData = RegisterRiderSchema.parse(body);

    const result = await riderService.register(user.id, validatedData);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }
    logger.error('Error registering rider', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to register rider' },
      { status: 500 }
    );
  }
}
