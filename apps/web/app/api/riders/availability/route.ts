import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const UpdateAvailabilitySchema = z.object({
  is_available: z.boolean(),
});

/**
 * PATCH /api/riders/availability
 * Toggle rider online/offline availability.
 * Rider must be verified/approved to go online.
 */
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
    const { is_available } = UpdateAvailabilitySchema.parse(body);

    const serviceRole = await createServiceRoleClient();

    // Verify rider profile exists and is approved
    const { data: profile, error: profileError } = await serviceRole
      .from('rider_profiles')
      .select('id, verification_status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Rider profile not found' }, { status: 404 });
    }

    // Cannot go online unless approved
    if (is_available && profile.verification_status !== 'approved') {
      return NextResponse.json(
        { error: 'Rider must be verified before going online' },
        { status: 400 }
      );
    }

    // Check if rider has an active assignment (cannot go offline while delivering)
    if (!is_available) {
      const { data: activeAssignment } = await serviceRole
        .from('rider_assignments')
        .select('id')
        .eq('rider_id', user.id)
        .in('status', ['accepted'])
        .limit(1)
        .single();

      if (activeAssignment) {
        return NextResponse.json(
          { error: 'Cannot go offline during an active delivery' },
          { status: 400 }
        );
      }
    }

    // Upsert into rider_current_locations
    const { error: upsertError } = await serviceRole
      .from('rider_current_locations')
      .upsert(
        {
          rider_id: user.id,
          is_available,
          latitude: 0, // Will be updated by next location ping
          longitude: 0,
          location: 'POINT(0 0)',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'rider_id' }
      );

    if (upsertError) {
      console.error('Failed to update availability:', upsertError);
      return NextResponse.json(
        { error: 'Failed to update availability' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { is_available },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating availability:', error);
    return NextResponse.json(
      { error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/riders/availability
 * Get current availability status.
 */
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

    const { data, error } = await supabase
      .from('rider_current_locations')
      .select('is_available, updated_at')
      .eq('rider_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ data: { is_available: false, updated_at: null } });
      }
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error getting availability:', error);
    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    );
  }
}
