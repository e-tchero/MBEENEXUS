import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderService } from '@/lib/services/rider.service';
import { z } from 'zod';

const SubmitDocumentSchema = z.object({
  document_type: z.enum([
    'government_id', 'vehicle_registration', 'insurance',
    'drivers_license', 'proof_of_address', 'other',
  ]),
  file_url: z.string().url(),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1),
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

    const documents = await riderService.listDocuments(user.id);
    return NextResponse.json({ data: documents });
  } catch (error) {
    logger.error('Error listing documents', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to list documents' },
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
    const validatedData = SubmitDocumentSchema.parse(body);

    const result = await riderService.submitDocument(user.id, validatedData);
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
    logger.error('Error submitting document', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Failed to submit document' },
      { status: 500 }
    );
  }
}
