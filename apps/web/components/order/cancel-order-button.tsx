'use client';

import { useState, useCallback } from 'react';

interface CancelOrderButtonProps {
  orderId: string;
  onCancelled?: (refundInitiated: boolean) => void;
}

export function CancelOrderButton({ orderId, onCancelled }: CancelOrderButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel order');
      }

      const data = await response.json();
      setShowConfirm(false);
      onCancelled?.(data.data?.refund_initiated ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  }, [orderId, reason, onCancelled]);

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full py-2 px-4 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        Cancel Order
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-embee-charcoal mb-2">Cancel Order?</h3>
            <p className="text-sm text-embee-slate mb-4">
              Are you sure you want to cancel this order? If payment was made, a refund will be initiated.
            </p>

            <div className="mb-4">
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-embee-charcoal mb-1">
                Reason (optional)
              </label>
              <textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Why are you cancelling?"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-embee-blue"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-3">{error}</p>
            )}

            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setError(null); }}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-200 text-sm font-medium rounded-md text-embee-charcoal bg-white hover:bg-embee-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-embee-blue disabled:opacity-50"
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
