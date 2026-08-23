import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { riderService } from '@/lib/services/rider.service';

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

    const status = await riderService.getVerificationStatus(user.id);
    return NextResponse.json({ data: status });
  } catch (error) {
    console.error('Error getting verification status:', error);
    return NextResponse.json(
      { error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
