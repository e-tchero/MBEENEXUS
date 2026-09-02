import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { RiderDashboard } from '@/components/rider/rider-dashboard';

export default async function RiderDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/rider/register');
  }

  // Fetch rider profile
  const { data: riderProfile } = await supabase
    .from('rider_profiles')
    .select('id, full_name, phone, vehicle_type, vehicle_make, vehicle_model, vehicle_registration_number, verification_status, total_deliveries, cached_total_earnings')
    .eq('id', user.id)
    .single();

  if (!riderProfile) {
    redirect('/');
  }

  // If not approved, show pending verification
  if (riderProfile.verification_status !== 'approved') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-status-warning/20 border border-status-warning/30 rounded-xl p-8 max-w-md w-full text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-status-warning">
            <svg className="h-6 w-6 text-status-warning-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-embee-charcoal mb-2">Account Pending Verification</h2>
          <p className="text-sm text-embee-slate mb-4">
            Your account is currently under review. You will be able to access the dashboard once your verification is approved.
          </p>
          <Link
            href="/rider/onboarding"
            className="inline-flex items-center gap-2 px-4 py-2 bg-embee-blue text-white text-sm font-medium rounded-lg hover:bg-embee-blue/90 transition-colors"
          >
            View verification status
          </Link>
        </div>
      </div>
    );
  }

  return <RiderDashboard riderProfile={riderProfile} />;
}
