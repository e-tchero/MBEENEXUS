'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/shared/loading-state';

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  distance_km: number;
  estimated_duration_minutes: number;
  tracking_code: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  recipient_name: string;
  recipient_phone: string;
  package_description: string;
  package_weight_kg: number;
  urgency_level: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  rider_assigned_at: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  customer_id: string;
  assigned_rider_id: string | null;
  events: Array<{
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    actor_type: string;
    created_at: string;
  }>;
  payment: {
    status: string;
    amount: number;
    currency: string;
    payment_method: string;
    paystack_reference: string;
  } | null;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (!response.ok) {
        throw new Error('Failed to load order');
      }

      const result = await response.json();
      setOrder(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin cancellation' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to cancel order');
      }

      // Refresh order data
      await fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div>
        <PageHeader title="Order Detail" />
        <div className="mt-6 bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        <button
          onClick={() => router.back()}
          className="mt-4 text-embee-blue hover:text-embee-blue/80 text-sm font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <PageHeader title="Order Not Found" />
        <p className="mt-6 text-embee-slate">Order could not be found.</p>
      </div>
    );
  }

  const canCancel = ['pending_payment', 'paid', 'searching_rider', 'rider_assigned'].includes(order.status);

  return (
    <div>
      <PageHeader
        title={`Order ${order.order_number}`}
        description={`Tracking: ${order.tracking_code}`}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-embee-slate/20 p-6">
            <h3 className="text-lg font-semibold text-embee-charcoal mb-4">Order Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-embee-slate">Status</p>
                <StatusBadge status={order.status} />
              </div>
              <div>
                <p className="text-sm text-embee-slate">Amount</p>
                <p className="text-lg font-semibold text-embee-charcoal">
                  {order.currency} {order.total_amount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-embee-slate">Distance</p>
                <p className="text-embee-charcoal">{order.distance_km?.toFixed(1) || '—'} km</p>
              </div>
              <div>
                <p className="text-sm text-embee-slate">Est. Duration</p>
                <p className="text-embee-charcoal">{order.estimated_duration_minutes || '—'} min</p>
              </div>
              <div>
                <p className="text-sm text-embee-slate">Package</p>
                <p className="text-embee-charcoal">{order.package_description || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-embee-slate">Weight</p>
                <p className="text-embee-charcoal">{order.package_weight_kg ? `${order.package_weight_kg} kg` : '—'}</p>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white rounded-lg border border-embee-slate/20 p-6">
            <h3 className="text-lg font-semibold text-embee-charcoal mb-4">Addresses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-embee-white rounded-lg">
                <p className="text-xs font-medium text-embee-slate uppercase mb-1">Pickup</p>
                <p className="text-sm text-embee-charcoal">{order.pickup_contact_name}</p>
                <p className="text-sm text-embee-slate">{order.pickup_contact_phone}</p>
                <p className="text-xs text-embee-slate mt-1">
                  {order.pickup_latitude?.toFixed(6)}, {order.pickup_longitude?.toFixed(6)}
                </p>
              </div>
              <div className="p-4 bg-embee-white rounded-lg">
                <p className="text-xs font-medium text-embee-slate uppercase mb-1">Destination</p>
                <p className="text-sm text-embee-charcoal">{order.recipient_name}</p>
                <p className="text-sm text-embee-slate">{order.recipient_phone}</p>
                <p className="text-xs text-embee-slate mt-1">
                  {order.destination_latitude?.toFixed(6)}, {order.destination_longitude?.toFixed(6)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="bg-white rounded-lg border border-embee-slate/20 p-6">
              <h3 className="text-lg font-semibold text-embee-charcoal mb-4">Payment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-embee-slate">Status</p>
                  <StatusBadge status={order.payment.status} />
                </div>
                <div>
                  <p className="text-sm text-embee-slate">Method</p>
                  <p className="text-embee-charcoal capitalize">{order.payment.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-embee-slate">Reference</p>
                  <p className="text-sm text-embee-slate font-mono">{order.payment.paystack_reference}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {canCancel && (
            <div className="bg-white rounded-lg border border-embee-slate/20 p-6">
              <h3 className="text-lg font-semibold text-embee-charcoal mb-4">Actions</h3>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-embee-slate/20 p-6">
            <h3 className="text-lg font-semibold text-embee-charcoal mb-4">Timeline</h3>
            <div className="space-y-3">
              {order.events.map((event, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-embee-blue mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-embee-charcoal">{event.event_type}</p>
                    <p className="text-xs text-embee-slate">
                      {event.actor_type} • {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {order.events.length === 0 && (
                <p className="text-sm text-embee-slate">No events recorded</p>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-lg border border-embee-slate/20 p-6">
            <h3 className="text-lg font-semibold text-embee-charcoal mb-4">Timestamps</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-embee-slate">Created</span>
                <span className="text-embee-charcoal">{new Date(order.created_at).toLocaleString()}</span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between">
                  <span className="text-embee-slate">Paid</span>
                  <span className="text-embee-charcoal">{new Date(order.paid_at).toLocaleString()}</span>
                </div>
              )}
              {order.rider_assigned_at && (
                <div className="flex justify-between">
                  <span className="text-embee-slate">Rider Assigned</span>
                  <span className="text-embee-charcoal">{new Date(order.rider_assigned_at).toLocaleString()}</span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-embee-slate">Delivered</span>
                  <span className="text-embee-charcoal">{new Date(order.delivered_at).toLocaleString()}</span>
                </div>
              )}
              {order.completed_at && (
                <div className="flex justify-between">
                  <span className="text-embee-slate">Completed</span>
                  <span className="text-embee-charcoal">{new Date(order.completed_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          href="/admin/orders"
          className="text-embee-blue hover:text-embee-blue/80 text-sm font-medium"
        >
          ← Back to orders
        </Link>
      </div>
    </div>
  );
}
