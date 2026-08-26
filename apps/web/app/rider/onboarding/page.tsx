'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { StatusBadge } from '@/components/ui/status-badge';

interface VerificationStatus {
  verification_status: string;
  verification_notes: string | null;
  documents: Array<{
    document_type: string;
    status: string;
    rejection_reason: string | null;
  }>;
}

const DOCUMENT_TYPES = [
  { value: 'government_id', label: 'Government ID', description: 'National ID, voter card, or international passport' },
  { value: 'vehicle_registration', label: 'Vehicle Registration', description: 'Proof of vehicle ownership' },
  { value: 'drivers_license', label: "Driver's License", description: 'Valid driver\'s license for your vehicle type' },
] as const;

export default function RiderOnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/riders/verification-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      } else if (response.status === 404) {
        // Rider profile not registered yet, redirect to register
        router.push('/rider/register');
      }
    } catch {
      setError('Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDocumentUpload = async (documentType: string) => {
    // In production, this would use Supabase Storage to upload
    // For MVP, we'll create a placeholder document entry
    setUploading(documentType);
    setError(null);

    try {
      const response = await fetch('/api/riders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          file_url: `placeholder://rider-documents/${documentType}`,
          file_name: `${documentType}.pdf`,
          mime_type: 'application/pdf',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit document');
      }

      // Refresh status
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-embee-white">
        <div className="text-embee-slate">Loading...</div>
      </div>
    );
  }

  const getDocumentStatus = (type: string) => {
    return status?.documents.find(d => d.document_type === type);
  };

  const allDocumentsSubmitted = DOCUMENT_TYPES.every(d => {
    const doc = getDocumentStatus(d.value);
    return doc && (doc.status === 'pending' || doc.status === 'approved');
  });

  return (
    <div className="min-h-screen bg-embee-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="text-center block">
            <Logo variant="full" size="lg" theme="dark" />
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-embee-charcoal">
            Complete Your Registration
          </h2>
          <p className="mt-2 text-sm text-embee-slate">
            Upload your documents to get verified
          </p>
        </div>

        {/* Verification Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-embee-charcoal mb-4">Verification Status</h3>
          <div className="flex items-center">
            <StatusBadge status={status?.verification_status || 'pending'} />
          </div>
          {status?.verification_notes && (
            <p className="mt-2 text-sm text-embee-slate">{status.verification_notes}</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm mb-6">
            {error}
          </div>
        )}

        {/* Documents */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-embee-charcoal mb-4">Required Documents</h3>
          <div className="space-y-4">
            {DOCUMENT_TYPES.map((docType) => {
              const doc = getDocumentStatus(docType.value);
              const isUploading = uploading === docType.value;

              return (
                <div key={docType.value} className="border border-embee-slate/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-embee-charcoal">{docType.label}</h4>
                      <p className="text-sm text-embee-slate">{docType.description}</p>
                    </div>
                    <div>
                      {doc ? (
                        <StatusBadge status={doc.status} />
                      ) : (
                        <button
                          onClick={() => handleDocumentUpload(docType.value)}
                          disabled={isUploading}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-embee-blue hover:bg-embee-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-embee-blue disabled:opacity-50"
                        >
                          {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                    </div>
                  </div>
                  {doc?.rejection_reason && (
                    <p className="mt-2 text-sm text-red-600">
                      Rejected: {doc.rejection_reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Message */}
        {allDocumentsSubmitted && status?.verification_status === 'pending' && (
          <div className="bg-embee-blue/5 border border-embee-blue/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-embee-blue">
              Your documents have been submitted. Our team will review them shortly.
              You will be notified once your account is approved.
            </p>
          </div>
        )}

        {status?.verification_status === 'approved' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              Your account has been approved! You can now start accepting deliveries.
            </p>
            <Link
              href="/rider/dashboard"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        <div className="text-center">
          <Link href="/rider/dashboard" className="text-sm text-embee-blue hover:text-embee-blue/80">
            Skip to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
