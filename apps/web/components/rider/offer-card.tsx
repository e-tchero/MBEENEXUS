'use client';

import { useState, useEffect, useCallback } from 'react';

interface Offer {
  id: string;
  order_id: string;
  expires_at: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_address?: string;
  base_fee?: number;
  estimated_distance_km?: number;
  estimated_duration_minutes?: number;
  item_description?: string;
}

interface OfferCardProps {
  offer: Offer;
  onAccept: (offerId: string) => Promise<void>;
  onReject: (offerId: string) => Promise<void>;
}

export function OfferCard({ offer, onAccept, onReject }: OfferCardProps) {
  const [countdown, setCountdown] = useState(0);
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateCountdown = () => {
      const now = Date.now();
      const expires = new Date(offer.expires_at).getTime();
      return Math.max(0, Math.floor((expires - now) / 1000));
    };

    setCountdown(calculateCountdown());

    const interval = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, [offer.expires_at]);

  const handleAccept = useCallback(async () => {
    setActionLoading('accept');
    setError(null);
    try {
      await onAccept(offer.order_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept offer');
    } finally {
      setActionLoading(null);
    }
  }, [offer.order_id, onAccept]);

  const handleReject = useCallback(async () => {
    setActionLoading('reject');
    setError(null);
    try {
      await onReject(offer.order_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject offer');
    } finally {
      setActionLoading(null);
    }
  }, [offer.order_id, onReject]);

  if (countdown <= 0) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const progress = Math.min(100, (countdown / 300) * 100); // Assume 5 min default

  return (
    <div className="bg-white shadow rounded-lg p-4 border-l-4 border-embee-blue">
      {/* Countdown */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-embee-slate">New Offer</span>
        <span className={`text-sm font-mono ${countdown < 60 ? 'text-red-600' : 'text-embee-charcoal'}`}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-embee-slate/20 rounded-full h-1.5 mb-3">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ${
            countdown < 60 ? 'bg-red-500' : countdown < 120 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Pickup/Delivery info */}
      <div className="space-y-2 mb-3">
        {offer.pickup_address && (
          <div className="flex items-start text-sm">
            <span className="text-green-500 mr-2">●</span>
            <span className="text-embee-charcoal">{offer.pickup_address}</span>
          </div>
        )}
        {offer.delivery_address && (
          <div className="flex items-start text-sm">
            <span className="text-red-500 mr-2">●</span>
            <span className="text-embee-charcoal">{offer.delivery_address}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex items-center justify-between text-sm text-embee-slate mb-3">
        {offer.estimated_distance_km && (
          <span>{offer.estimated_distance_km.toFixed(1)} km</span>
        )}
        {offer.estimated_duration_minutes && (
          <span>~{offer.estimated_duration_minutes} min</span>
        )}
        {offer.base_fee && (
          <span className="font-medium text-embee-charcoal">₦{offer.base_fee.toLocaleString()}</span>
        )}
      </div>

      {offer.item_description && (
        <p className="text-xs text-embee-slate mb-3 truncate">{offer.item_description}</p>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={handleAccept}
          disabled={actionLoading !== null}
          className="flex-1 py-2 px-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {actionLoading === 'accept' ? 'Accepting...' : 'Accept'}
        </button>
        <button
          onClick={handleReject}
          disabled={actionLoading !== null}
          className="flex-1 py-2 px-3 border border-embee-slate/30 text-sm font-medium rounded-md text-embee-charcoal bg-white hover:bg-embee-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-embee-blue disabled:opacity-50"
        >
          {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
