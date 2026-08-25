'use client';

import { useState } from 'react';

interface VerifyActionsProps {
  riderId: string;
  currentStatus: string;
  onActionComplete: () => void;
}

export function VerifyActions({
  riderId,
  currentStatus,
  onActionComplete,
}: VerifyActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleVerify = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/riders/${riderId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason: action === 'reject' ? rejectionReason : undefined,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify rider');
      }

      setShowRejectDialog(false);
      setRejectionReason('');
      setNotes('');
      onActionComplete();
    } catch (error) {
      console.error('Error verifying rider:', error);
      alert(error instanceof Error ? error.message : 'Failed to verify rider');
    } finally {
      setIsProcessing(false);
    }
  };

  const isTerminal = currentStatus === 'approved' || currentStatus === 'rejected';

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-embee-charcoal mb-4">
        Verification Actions
      </h2>

      {isTerminal ? (
        <div className="text-center py-4">
          <p className="text-sm text-embee-slate">
            {currentStatus === 'approved'
              ? 'This rider has been approved'
              : 'This rider has been rejected'}
          </p>
        </div>
      ) : (
        <>
          {/* Notes */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-embee-charcoal mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue"
              rows={2}
              placeholder="Add verification notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleVerify('approve')}
              disabled={isProcessing}
              className="w-full px-4 py-2.5 bg-embee-blue text-white font-medium rounded-lg hover:bg-embee-blue/90 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Approve Rider'}
            </button>

            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
              className="w-full px-4 py-2.5 bg-white text-red-600 font-medium rounded-lg border border-red-300 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              Reject Rider
            </button>
          </div>

          {/* Rejection Dialog */}
          {showRejectDialog && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <label className="block text-sm font-medium text-red-800 mb-2">
                Rejection Reason (required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Enter reason for rejection..."
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleVerify('reject')}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason('');
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-white text-embee-charcoal text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
