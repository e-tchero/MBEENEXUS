import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderService } from '@/lib/services/rider.service';
import { z } from 'zod';

const CreateVehicleSchema = z.object({
  vehicle_type: z.enum(['bicycle', 'motorcycle', 'tricycle', 'car', 'van']),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  year: z.number().int().min(1990).max(2030).optional(),
  registration_number: z.string().max(20).optional(),
  insurance_expiry: z.string().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicles = await riderService.listVehicles(user.id);
    return NextResponse.json({ data: vehicles });
  } catch (error) {
    logger.error('Error listing vehicles', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to list vehicles' },
      { status: 500 }
    );
  }
}

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
    const validatedData = CreateVehicleSchema.parse(body);

    const vehicle = await riderService.createVehicle(user.id, validatedData);
    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    logger.error('Error creating vehicle', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}
