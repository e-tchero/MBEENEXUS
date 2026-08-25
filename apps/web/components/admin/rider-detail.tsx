'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentCard } from './document-card';
import { VerifyActions } from './verify-actions';
import { VerificationHistory } from './verification-history';

interface RiderDetailProps {
  rider: {
    id: string;
    full_name: string | null;
    phone: string | null;
    verification_status: string;
    verification_notes: string | null;
    created_at: string;
    profile: {
      role: string;
      full_name: string | null;
      avatar_url: string | null;
    };
    documents: Array<{
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
    }>;
    vehicle: {
      vehicle_type: string;
      make: string | null;
      model: string | null;
      year: number | null;
      registration_number: string | null;
    } | null;
    verification_history: Array<{
      id: string;
      old_status: string | null;
      new_status: string;
      changed_by: string;
      changed_by_name: string;
      reason: string | null;
      created_at: string;
    }>;
  };
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    pending: 'Pending',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export function RiderDetail({ rider }: RiderDetailProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleActionComplete = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/riders"
          className="text-sm text-embee-slate hover:text-embee-blue mb-2 inline-block"
        >
          ← Back to Riders
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-embee-charcoal">
              {rider.full_name || 'Unknown Rider'}
            </h1>
            <p className="text-embee-slate mt-1">{rider.phone || 'No phone'}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(rider.verification_status)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rider Info */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-embee-charcoal mb-4">
              Rider Information
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium text-embee-slate uppercase">Full Name</dt>
                <dd className="mt-1 text-sm text-embee-charcoal">
                  {rider.full_name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-embee-slate uppercase">Phone</dt>
                <dd className="mt-1 text-sm text-embee-charcoal">
                  {rider.phone || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-embee-slate uppercase">Registered</dt>
                <dd className="mt-1 text-sm text-embee-charcoal">
                  {new Date(rider.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-embee-slate uppercase">Verification Notes</dt>
                <dd className="mt-1 text-sm text-embee-charcoal">
                  {rider.verification_notes || '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Vehicle Info */}
          {rider.vehicle && (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-embee-charcoal mb-4">
                Vehicle Information
              </h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-embee-slate uppercase">Type</dt>
                  <dd className="mt-1 text-sm text-embee-charcoal capitalize">
                    {rider.vehicle.vehicle_type}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-embee-slate uppercase">Make</dt>
                  <dd className="mt-1 text-sm text-embee-charcoal">
                    {rider.vehicle.make || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-embee-slate uppercase">Model</dt>
                  <dd className="mt-1 text-sm text-embee-charcoal">
                    {rider.vehicle.model || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-embee-slate uppercase">Year</dt>
                  <dd className="mt-1 text-sm text-embee-charcoal">
                    {rider.vehicle.year || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-embee-slate uppercase">Registration</dt>
                  <dd className="mt-1 text-sm text-embee-charcoal">
                    {rider.vehicle.registration_number || '—'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-embee-charcoal mb-4">
              Verification Documents
            </h2>
            {rider.documents.length === 0 ? (
              <p className="text-sm text-embee-slate">
                No documents submitted yet
              </p>
            ) : (
              <div className="space-y-4">
                {rider.documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onActionComplete={handleActionComplete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Verification Actions */}
          <VerifyActions
            riderId={rider.id}
            currentStatus={rider.verification_status}
            onActionComplete={handleActionComplete}
          />

          {/* Verification History */}
          <VerificationHistory history={rider.verification_history} />
        </div>
      </div>
    </div>
  );
}
