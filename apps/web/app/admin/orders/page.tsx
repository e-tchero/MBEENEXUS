'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/shared/loading-state';
import { EmptyState } from '@/components/shared/empty-state';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  currency: string;
  distance_km: number;
  tracking_code: string;
  created_at: string;
  customer_id: string;
  assigned_rider_id: string | null;
}

interface OrdersResponse {
  data: {
    data: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'searching_rider', label: 'Searching Rider' },
  { value: 'rider_assigned', label: 'Rider Assigned' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '20');

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load orders');
      }

      const result: OrdersResponse = await response.json();
      setOrders(result.data.data);
      setPagination(result.data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage and monitor all delivery orders"
      />

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by order number or tracking code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full px-4 py-2 border border-embee-slate/20 rounded-lg bg-white text-embee-charcoal placeholder:text-embee-slate focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-transparent"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-embee-slate/20 rounded-lg bg-white text-embee-charcoal focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-transparent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        {loading && <LoadingState />}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <EmptyState
            title="No orders found"
            description="No orders match your current filters."
          />
        )}

        {!loading && !error && orders.length > 0 && (
          <>
            <div className="bg-white rounded-lg border border-embee-slate/20 overflow-hidden">
              <table className="min-w-full divide-y divide-embee-slate/20">
                <thead className="bg-embee-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                      Rider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-embee-slate uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-embee-slate/20">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-embee-white/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-embee-charcoal">
                          {order.order_number}
                        </div>
                        <div className="text-xs text-embee-slate">
                          {order.tracking_code}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-embee-charcoal">
                        {order.currency} {order.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-embee-slate">
                        {order.distance_km ? `${order.distance_km.toFixed(1)} km` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-embee-slate">
                        {order.assigned_rider_id ? 'Assigned' : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-embee-slate">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-embee-blue hover:text-embee-blue/80 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-embee-slate">
                  Showing {((pagination.page - 1) * 20) + 1}–{Math.min(pagination.page * 20, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1 text-sm border border-embee-slate/20 rounded-md disabled:opacity-50 text-embee-charcoal hover:bg-embee-white"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                    disabled={page >= pagination.total_pages}
                    className="px-3 py-1 text-sm border border-embee-slate/20 rounded-md disabled:opacity-50 text-embee-charcoal hover:bg-embee-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
