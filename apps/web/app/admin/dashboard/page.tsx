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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          href="/admin/riders?status=pending"
          className="bg-white rounded-xl p-5 shadow-embee-sm hover:shadow-embee-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-embee-slate">Pending</span>
            <div className="w-10 h-10 rounded-lg bg-status-warning/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-status-warning-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-embee-charcoal tabular-nums">
            {pendingCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-1">Awaiting review</p>
        </Link>

        <Link
          href="/admin/riders?status=under_review"
          className="bg-white rounded-xl p-5 shadow-embee-sm hover:shadow-embee-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-embee-slate">Under Review</span>
            <div className="w-10 h-10 rounded-lg bg-status-info/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-status-info-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-embee-charcoal tabular-nums">
            {reviewCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-1">In progress</p>
        </Link>

        <Link
          href="/admin/riders?status=approved"
          className="bg-white rounded-xl p-5 shadow-embee-sm hover:shadow-embee-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-embee-slate">Approved</span>
            <div className="w-10 h-10 rounded-lg bg-status-success/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-status-success-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-embee-charcoal tabular-nums">
            {approvedCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-1">Active riders</p>
        </Link>

        <Link
          href="/admin/riders?status=rejected"
          className="bg-white rounded-xl p-5 shadow-embee-sm hover:shadow-embee-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-embee-slate">Rejected</span>
            <div className="w-10 h-10 rounded-lg bg-status-error/20 flex items-center justify-center">
              <svg className="h-5 w-5 text-status-error-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-embee-charcoal tabular-nums">
            {rejectedCount || 0}
          </p>
          <p className="text-xs text-embee-slate mt-1">Declined</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-embee-sm">
        <h2 className="text-lg font-semibold text-embee-charcoal mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/riders?status=pending"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-embee-blue text-white rounded-lg text-sm font-medium hover:bg-embee-blue/90 transition-colors touch-target"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Review Pending Riders
          </Link>
          <Link
            href="/admin/riders"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-embee-charcoal border border-embee-slate/20 rounded-lg text-sm font-medium hover:bg-embee-white transition-colors touch-target"
          >
            View All Riders
          </Link>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-embee-charcoal border border-embee-slate/20 rounded-lg text-sm font-medium hover:bg-embee-white transition-colors touch-target"
          >
            View Orders
          </Link>
          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-embee-charcoal border border-embee-slate/20 rounded-lg text-sm font-medium hover:bg-embee-white transition-colors touch-target"
          >
            View Customers
          </Link>
        </div>
      </div>
    </div>
  );
}
