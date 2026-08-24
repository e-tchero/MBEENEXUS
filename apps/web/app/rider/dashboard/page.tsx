import { redirect } from 'next/navigation';
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
      <div className="text-center py-12">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-medium text-yellow-800 mb-2">Account Pending Verification</h2>
          <p className="text-sm text-yellow-700">
            Your account is currently under review. You will be able to access the dashboard once your verification is approved.
          </p>
          <a
            href="/rider/onboarding"
            className="mt-4 inline-block text-sm text-yellow-800 underline hover:text-yellow-900"
          >
            View verification status
          </a>
        </div>
      </div>
    );
  }

  return <RiderDashboard riderProfile={riderProfile} />;
}
