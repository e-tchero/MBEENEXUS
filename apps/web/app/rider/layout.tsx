import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/shared/app-nav';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { RiderBottomNav } from '@/components/navigation/rider-bottom-nav';

const RIDER_LINKS = [
  { label: 'Dashboard', href: '/rider/dashboard' },
];

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/rider/register');
  }

  // Verify this is a rider
  const { data: riderProfile } = await supabase
    .from('rider_profiles')
    .select('id, verification_status, full_name')
    .eq('id', user.id)
    .single();

  if (!riderProfile) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-embee-white">
      <AppNav
        brand="rider"
        links={RIDER_LINKS}
        user={{ name: riderProfile.full_name || 'Rider' }}
      />
      <main id="main-content" className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-6">
        <ErrorBoundary context="rider-dashboard">
          {children}
        </ErrorBoundary>
      </main>
      <RiderBottomNav />
    </div>
  );
}
