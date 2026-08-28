import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderService } from '@/lib/services/rider.service';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  is_available: z.boolean().optional(),
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

    const profile = await riderService.getProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: 'Rider profile not found' }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    logger.error('Error getting rider profile', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to get rider profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const validatedData = UpdateProfileSchema.parse(body);

    const profile = await riderService.updateProfile(user.id, validatedData);
    return NextResponse.json({ data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message.includes('must be approved')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    logger.error('Error updating rider profile', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to update rider profile' },
      { status: 500 }
    );
  }
}
