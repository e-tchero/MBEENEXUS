import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminService } from '@/lib/services/admin.service';
import { z } from 'zod';

const VerifyRiderSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Rider ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = VerifyRiderSchema.parse(body);

    // Validate rejection requires reason
    if (validatedData.action === 'reject' && !validatedData.reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const result = await adminService.verifyRider(
      user.id,
      id,
      validatedData.action,
      validatedData.reason,
      validatedData.notes
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    logger.error('Error verifying rider', {}, error instanceof Error ? error : undefined);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error.message?.includes('own rider profile')) {
      return NextResponse.json(
        { error: 'Cannot verify your own rider profile' },
        { status: 400 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to verify rider' },
      { status: 500 }
    );
  }
}
