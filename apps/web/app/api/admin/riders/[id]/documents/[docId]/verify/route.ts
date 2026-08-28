import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminService } from '@/lib/services/admin.service';
import { z } from 'zod';

const VerifyDocumentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejection_reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
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

    const { docId } = await params;

    if (!docId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = VerifyDocumentSchema.parse(body);

    // Validate rejection requires reason
    if (validatedData.action === 'reject' && !validatedData.rejection_reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    const result = await adminService.verifyDocument(
      user.id,
      docId,
      validatedData.action,
      validatedData.rejection_reason
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    logger.error('Error verifying document', {}, error instanceof Error ? error : undefined);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    );
  }
}
