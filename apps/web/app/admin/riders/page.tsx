import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RiderQueue } from '@/components/admin/rider-queue';

export default async function AdminRidersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
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

  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status || undefined;

  // Fetch riders
  let query = supabase
    .from('rider_profiles')
    .select(`
      id,
      verification_status,
      verification_notes,
      created_at,
      profiles!inner(full_name, phone),
      rider_documents(document_type, status)
    `, { count: 'exact' });

  if (statusFilter) {
    query = query.eq('verification_status', statusFilter);
  }

  query = query.order('created_at', { ascending: false });

  const { data: riders, count } = await query;

  // Transform data
  const transformedRiders = (riders || []).map((rider: any) => ({
    id: rider.id,
    full_name: rider.profiles?.full_name || 'Unknown',
    phone: rider.profiles?.phone || null,
    verification_status: rider.verification_status,
    verification_notes: rider.verification_notes,
    created_at: rider.created_at,
    documents: rider.rider_documents || [],
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-embee-charcoal">
          Rider Verification
        </h1>
        <p className="text-embee-slate mt-1">
          Review and manage rider verification requests
        </p>
      </div>

      <RiderQueue
        riders={transformedRiders}
        currentFilter={statusFilter}
        totalCount={count || 0}
      />
    </div>
  );
}
