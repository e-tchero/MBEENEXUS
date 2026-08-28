import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/shared/app-nav';
import { ErrorBoundary } from '@/components/shared/error-boundary';

const CUSTOMER_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Addresses', href: '/addresses' },
  { label: 'Orders', href: '/orders' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-embee-white">
      <AppNav
        brand="customer"
        links={CUSTOMER_LINKS}
        user={{ name: user.email || 'Customer' }}
      />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <ErrorBoundary context="customer-dashboard">
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
