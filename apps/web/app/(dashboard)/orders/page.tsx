import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StatusBadge } from '@/components/shared/status-badge';

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-bold text-embee-charcoal mb-6">My Orders</h1>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-embee-slate">No orders yet.</p>
          <a
            href="/dashboard"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-embee-blue hover:bg-embee-blue/90"
          >
            Create Your First Delivery
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <a
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-embee-charcoal">{order.order_number}</p>
                  <p className="text-sm text-embee-slate mt-1">
                    {new Date(order.created_at).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-embee-charcoal">
                    ₦{order.total_amount.toLocaleString()}
                  </p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div className="mt-2 text-sm text-embee-slate">
                <p>
                  {order.distance_km} km • {order.estimated_duration_minutes} min estimated
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
