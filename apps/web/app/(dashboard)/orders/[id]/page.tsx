import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { OrderTracking } from '@/components/tracking/order-tracking';

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

  // Fetch rider info if assigned
  let riderInfo = null;
  if (order.assigned_rider_id) {
    const { data: riderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', order.assigned_rider_id)
      .single();

    const { data: riderData } = await supabase
      .from('rider_profiles')
      .select('rating')
      .eq('id', order.assigned_rider_id)
      .single();

    // Get vehicle info
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('vehicle_type, registration_number')
      .eq('rider_id', order.assigned_rider_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (riderProfile && riderData) {
      riderInfo = {
        full_name: riderProfile.full_name,
        rating: riderData.rating,
        vehicle_type: vehicle?.vehicle_type || 'unknown',
        vehicle_plate: vehicle?.registration_number || null,
      };
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <OrderTracking
        order={{
          ...order,
          rider: riderInfo,
        }}
        events={events || []}
      />
    </div>
  );
}
