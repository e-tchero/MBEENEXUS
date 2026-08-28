'use client';

import { useState, useEffect } from 'react';

interface ProofDisplayProps {
  orderId: string;
  visible: boolean;
}

interface ProofData {
  proof_id: string;
  proof_type: string;
  file_url: string | null;
  recipient_name: string | null;
  notes: string | null;
  recorded_at: string | null;
  created_at: string;
}

export function ProofDisplay({ orderId, visible }: ProofDisplayProps) {
  const [proof, setProof] = useState<ProofData | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setLoading(false);
      return;
    }

    const fetchProof = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}/proof`);
        if (response.ok) {
          const data = await response.json();
          setProof(data.data || null);
        } else if (response.status === 404) {
          setProof(null);
        }
      } catch {
        setError('Failed to load delivery proof');
      } finally {
        setLoading(false);
      }
    };

    fetchProof();
  }, [orderId, visible]);

  // Fetch signed photo URL when proof has a file_url
  useEffect(() => {
    if (!proof?.file_url || !visible) return;

    const fetchPhotoUrl = async () => {
      setPhotoLoading(true);
      try {
        const response = await fetch(`/api/orders/${orderId}/proof/photo-url`);
        if (response.ok) {
          const data = await response.json();
          setPhotoUrl(data.data?.signed_url || null);
        }
      } catch {
        // Photo URL fetch failed — fall back to text-only
      } finally {
        setPhotoLoading(false);
      }
    };

    fetchPhotoUrl();
  }, [orderId, visible, proof?.file_url]);

  if (!visible || loading) return null;
  if (error) return null;
  if (!proof) return null;

  return (
    <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-500">
      <h3 className="text-sm font-medium text-embee-charcoal mb-2">Delivery Proof</h3>

      {/* Photo display */}
      {proof.proof_type === 'photo' && (
        <div className="mb-3">
          {photoLoading && (
            <div className="w-full h-48 bg-embee-slate/5 rounded-lg flex items-center justify-center">
              <p className="text-xs text-embee-slate">Loading photo...</p>
            </div>
          )}
          {!photoLoading && photoUrl && (
            <img
              src={photoUrl}
              alt="Delivery proof"
              className="w-full h-auto max-h-64 object-contain rounded-lg border border-embee-slate/10"
            />
          )}
          {!photoLoading && !photoUrl && (
            <div className="w-full h-48 bg-embee-slate/5 rounded-lg flex items-center justify-center">
              <p className="text-xs text-embee-slate">Photo unavailable</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {proof.recipient_name && (
          <div className="flex items-center text-sm">
            <span className="text-embee-slate w-24">Received by</span>
            <span className="text-embee-charcoal font-medium">{proof.recipient_name}</span>
          </div>
        )}

        {proof.notes && (
          <div className="flex items-start text-sm">
            <span className="text-embee-slate w-24">Notes</span>
            <span className="text-embee-charcoal">{proof.notes}</span>
          </div>
        )}

        <div className="flex items-center text-sm">
          <span className="text-embee-slate w-24">Delivered at</span>
          <span className="text-embee-charcoal">
            {proof.recorded_at
              ? new Date(proof.recorded_at).toLocaleString('en-NG')
              : new Date(proof.created_at).toLocaleString('en-NG')}
          </span>
        </div>

        <div className="flex items-center text-sm">
          <span className="text-embee-slate w-24">Proof type</span>
          <span className="text-embee-charcoal capitalize">{proof.proof_type.replace(/_/g, ' ')}</span>
        </div>
      </div>
    </div>
  );
}
