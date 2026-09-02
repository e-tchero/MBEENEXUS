import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { ErrorBoundary } from '@/components/shared/error-boundary';

export default async function AdminLayout({
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

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-embee-white">
      <AdminSidebar
        userName={profile.full_name || 'Admin'}
        userRole={profile.role}
      />
      <div className="lg:pl-64">
        <main id="main-content" className="p-6 lg:p-8">
          <ErrorBoundary context="admin-dashboard">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
