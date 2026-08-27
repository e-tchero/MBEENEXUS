import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get pending riders count
  const { count: pendingCount } = await supabase
    .from('rider_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'pending');

  // Get under review count
  const { count: reviewCount } = await supabase
    .from('rider_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'under_review');

  // Get approved count
  const { count: approvedCount } = await supabase
    .from('rider_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'approved');

  // Get rejected count
  const { count: rejectedCount } = await supabase
    .from('rider_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'rejected');

  return (
    <div>
      <h1 className="text-2xl font-bold text-embee-charcoal mb-6">
        Admin Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link
          href="/admin/riders?status=pending"
          className="bg-white rounded-xl p-6 border border-embee-slate/20 hover:border-embee-blue transition-colors"
        >
          <p className="text-sm font-medium text-embee-slate mb-1">Pending</p>
          <p className="text-3xl font-bold text-embee-charcoal">
            {pendingCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-2">Awaiting review</p>
        </Link>

        <Link
          href="/admin/riders?status=under_review"
          className="bg-white rounded-xl p-6 border border-embee-slate/20 hover:border-embee-blue transition-colors"
        >
          <p className="text-sm font-medium text-embee-slate mb-1">Under Review</p>
          <p className="text-3xl font-bold text-embee-charcoal">
            {reviewCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-2">In progress</p>
        </Link>

        <Link
          href="/admin/riders?status=approved"
          className="bg-white rounded-xl p-6 border border-embee-slate/20 hover:border-embee-blue transition-colors"
        >
          <p className="text-sm font-medium text-embee-slate mb-1">Approved</p>
          <p className="text-3xl font-bold text-embee-charcoal">
            {approvedCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-2">Active riders</p>
        </Link>

        <Link
          href="/admin/riders?status=rejected"
          className="bg-white rounded-xl p-6 border border-embee-slate/20 hover:border-embee-blue transition-colors"
        >
          <p className="text-sm font-medium text-embee-slate mb-1">Rejected</p>
          <p className="text-3xl font-bold text-embee-charcoal">
            {rejectedCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-2">Declined</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-embee-slate/20">
        <h2 className="text-lg font-semibold text-embee-charcoal mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/riders?status=pending"
            className="inline-flex items-center px-4 py-2 bg-embee-blue text-white rounded-lg font-medium hover:bg-embee-blue/90 transition-colors"
          >
            Review Pending Riders
          </Link>
          <Link
            href="/admin/riders"
            className="inline-flex items-center px-4 py-2 bg-white text-embee-charcoal border border-embee-slate/30 rounded-lg font-medium hover:bg-embee-white transition-colors"
          >
            View All Riders
          </Link>
        </div>
      </div>
    </div>
  );
}
