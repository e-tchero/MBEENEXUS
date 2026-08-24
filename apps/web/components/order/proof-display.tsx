'use client';

import { useState, useEffect } from 'react';

interface ProofDisplayProps {
  orderId: string;
  visible: boolean;
}

interface ProofData {
  proof_id: string;
  proof_type: string;
  recipient_name: string | null;
  notes: string | null;
  recorded_at: string | null;
  created_at: string;
}

export function ProofDisplay({ orderId, visible }: ProofDisplayProps) {
  const [proof, setProof] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
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

  if (!visible || loading) return null;
  if (error) return null;
  if (!proof) return null;

  return (
    <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-500">
      <h3 className="text-sm font-medium text-gray-900 mb-2">Delivery Proof</h3>

      <div className="space-y-2">
        {proof.recipient_name && (
          <div className="flex items-center text-sm">
            <span className="text-gray-500 w-24">Received by</span>
            <span className="text-gray-900 font-medium">{proof.recipient_name}</span>
          </div>
        )}

        {proof.notes && (
          <div className="flex items-start text-sm">
            <span className="text-gray-500 w-24">Notes</span>
            <span className="text-gray-700">{proof.notes}</span>
          </div>
        )}

        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-24">Delivered at</span>
          <span className="text-gray-700">
            {proof.recorded_at
              ? new Date(proof.recorded_at).toLocaleString('en-NG')
              : new Date(proof.created_at).toLocaleString('en-NG')}
          </span>
        </div>

        <div className="flex items-center text-sm">
          <span className="text-gray-500 w-24">Proof type</span>
          <span className="text-gray-700 capitalize">{proof.proof_type.replace(/_/g, ' ')}</span>
        </div>
      </div>
    </div>
  );
}
