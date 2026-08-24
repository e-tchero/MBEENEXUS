'use client';

import { useState, useEffect } from 'react';

interface RefundStatusProps {
  orderId: string;
  visible: boolean;
}

interface RefundData {
  refund_id: string;
  amount: number;
  status: string;
  reason: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  pending: { label: 'Refund Pending', className: 'bg-yellow-50 text-yellow-800 border-yellow-200', icon: '⏳' },
  processing: { label: 'Processing Refund', className: 'bg-blue-50 text-blue-800 border-blue-200', icon: '⚙️' },
  completed: { label: 'Refund Completed', className: 'bg-green-50 text-green-800 border-green-200', icon: '✅' },
  failed: { label: 'Refund Failed', className: 'bg-red-50 text-red-800 border-red-200', icon: '❌' },
};

export function RefundStatus({ orderId, visible }: RefundStatusProps) {
  const [refund, setRefund] = useState<RefundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      return;
    }

    const fetchRefund = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/refund`);
        if (response.ok) {
          const data = await response.json();
          setRefund(data.data || null);
        } else if (response.status === 404) {
          // No refund exists — this is normal
          setRefund(null);
        }
      } catch {
        setError('Failed to load refund status');
      } finally {
        setLoading(false);
      }
    };

    fetchRefund();
  }, [orderId, visible]);

  if (!visible || loading) return null;
  if (error) return null;
  if (!refund) return null;

  const config = STATUS_CONFIG[refund.status] || STATUS_CONFIG.pending;

  return (
    <div className={`border rounded-lg p-4 ${config.className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{config.icon}</span>
        <div>
          <p className="text-sm font-medium">{config.label}</p>
          <p className="text-xs opacity-75">
            Amount: ₦{refund.amount.toLocaleString()}
          </p>
          {refund.reason && (
            <p className="text-xs opacity-75 mt-1">Reason: {refund.reason}</p>
          )}
          <p className="text-xs opacity-75 mt-1">
            {new Date(refund.created_at).toLocaleString('en-NG')}
          </p>
        </div>
      </div>
    </div>
  );
}
