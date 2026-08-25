'use client';

import { useState } from 'react';

interface DocumentCardProps {
  document: {
    id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    mime_type: string;
    status: string;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
  };
  onActionComplete: () => void;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  government_id: 'Government ID',
  vehicle_registration: 'Vehicle Registration',
  insurance: 'Insurance',
  drivers_license: "Driver's License",
  proof_of_address: 'Proof of Address',
  other: 'Other',
};

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function DocumentCard({ document, onActionComplete }: DocumentCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleVerify = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(
        `/api/admin/riders/placeholder/documents/${document.id}/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            rejection_reason: action === 'reject' ? rejectionReason : undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify document');
      }

      setShowRejectDialog(false);
      setRejectionReason('');
      onActionComplete();
    } catch (error) {
      console.error('Error verifying document:', error);
      alert(error instanceof Error ? error.message : 'Failed to verify document');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-embee-charcoal">
              {DOCUMENT_TYPE_LABELS[document.document_type] || document.document_type}
            </h3>
            {getStatusBadge(document.status)}
          </div>
          <p className="text-xs text-embee-slate mt-1">{document.file_name}</p>
          {document.rejection_reason && (
            <p className="text-xs text-red-600 mt-1">
              Rejection reason: {document.rejection_reason}
            </p>
          )}
        </div>
      </div>

      {document.status === 'pending' && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleVerify('approve')}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => setShowRejectDialog(true)}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-white text-red-600 text-xs font-medium rounded-lg border border-red-300 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

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
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Confirm Rejection'}
            </button>
            <button
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-white text-embee-charcoal text-xs font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
