import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RiderDetail } from '@/components/admin/rider-detail';

export default async function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;

  // Fetch rider profile
  const { data: rider, error: riderError } = await supabase
    .from('rider_profiles')
    .select(`
      id,
      verification_status,
      verification_notes,
      created_at,
      profiles!inner(role, full_name, avatar_url, phone)
    `)
    .eq('id', id)
    .single();

  if (riderError || !rider) {
    redirect('/admin/riders');
  }

  // Fetch documents
  const { data: documents } = await supabase
    .from('rider_documents')
    .select('*')
    .eq('rider_id', id)
    .order('created_at', { ascending: false });

  // Fetch vehicle
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('vehicle_type, make, model, year, registration_number')
    .eq('rider_id', id)
    .eq('is_active', true)
    .limit(1)
    .single();

  // Fetch verification history
  const { data: history } = await supabase
    .from('rider_verification_history')
    .select(`
      id,
      old_status,
      new_status,
      changed_by,
      reason,
      created_at
    `)
    .eq('rider_id', id)
    .order('created_at', { ascending: false });

  // Get actor names for history
  const actorIds = [...new Set((history || []).map((h: any) => h.changed_by))];
  let actorNames: Record<string, string> = {};

  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', actorIds);

    if (actors) {
      actorNames = Object.fromEntries(
        actors.map((a: any) => [a.id, a.full_name || 'Unknown'])
      );
    }
  }

  const riderDetail = {
    id: rider.id,
    full_name: (rider.profiles as any)?.full_name || null,
    phone: (rider.profiles as any)?.phone || null,
    verification_status: rider.verification_status,
    verification_notes: rider.verification_notes,
    created_at: rider.created_at,
    profile: {
      role: (rider.profiles as any)?.role || 'rider',
      full_name: (rider.profiles as any)?.full_name || null,
      avatar_url: (rider.profiles as any)?.avatar_url || null,
    },
    documents: documents || [],
    vehicle: vehicle || null,
    verification_history: (history || []).map((h: any) => ({
      ...h,
      changed_by_name: actorNames[h.changed_by] || 'Unknown',
    })),
  };

  return (
    <div>
      <RiderDetail rider={riderDetail} />
    </div>
  );
}
