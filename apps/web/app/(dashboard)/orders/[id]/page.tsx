import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (!order) {
    notFound();
  }

  const { data: events } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending_payment: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    searching_rider: 'bg-blue-100 text-blue-800',
    rider_assigned: 'bg-indigo-100 text-indigo-800',
    in_transit: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
        <p className="text-sm text-gray-500">
          Tracking Code: {order.tracking_code}
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Order Status</h2>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[order.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Created</p>
            <p className="font-medium">
              {new Date(order.created_at).toLocaleString('en-NG')}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Estimated Delivery</p>
            <p className="font-medium">{order.estimated_duration_minutes} minutes</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Delivery Details</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-sm">A</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pickup</p>
              <p className="text-sm font-medium">{order.pickup_contact_name}</p>
              <p className="text-sm text-gray-600">{order.pickup_contact_phone}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 text-sm">B</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Destination</p>
              <p className="text-sm font-medium">{order.recipient_name}</p>
              <p className="text-sm text-gray-600">{order.recipient_phone}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Pricing</h2>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base fare</span>
            <span>₦{order.base_fee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Distance ({order.distance_km} km)</span>
            <span>₦{order.distance_fee.toLocaleString()}</span>
          </div>
          {order.weight_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Weight surcharge</span>
              <span>₦{order.weight_fee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-gray-600">Delivery fare</span>
            <span className="font-medium">
              ₦{(order.base_fee + order.distance_fee + order.weight_fee + order.urgency_fee).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{order.tax_name_applied} ({(order.tax_rate_applied * 100).toFixed(1)}%)</span>
            <span>₦{order.tax_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold border-t pt-2">
            <span>Total</span>
            <span>₦{order.total_amount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {events && events.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Order Timeline</h2>

          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary-500" />
                <div>
                  <p className="text-sm font-medium">{event.event_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.created_at).toLocaleString('en-NG')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
