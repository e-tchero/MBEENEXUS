'use client';

import { useState, useEffect, useCallback } from 'react';
import { AvailabilityToggle } from './availability-toggle';
import { OfferCard } from './offer-card';
import { ActiveDeliveryCard } from './active-delivery-card';
import { EarningsPanel } from './earnings-panel';

interface RiderProfile {
  id: string;
  full_name: string;
  phone?: string;
  vehicle_type?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_registration_number?: string;
  verification_status: string;
  total_deliveries: number;
  cached_total_earnings: number;
}

interface ActiveAssignment {
  id: string;
  order_id: string;
  status: string;
  order: {
    id: string;
    status: string;
    pickup_address: string;
    delivery_address: string;
    pickup_latitude?: number;
    pickup_longitude?: number;
    delivery_latitude?: number;
    delivery_longitude?: number;
    customer_name?: string;
    customer_phone?: string;
    total_amount: number;
    item_description?: string;
  };
}

interface Offer {
  id: string;
  order_id: string;
  expires_at: string;
  pickup_address?: string;
  delivery_address?: string;
  base_fee?: number;
  estimated_distance_km?: number;
  estimated_duration_minutes?: number;
  item_description?: string;
}

interface RiderDashboardProps {
  riderProfile: RiderProfile;
}

export function RiderDashboard({ riderProfile }: RiderDashboardProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<ActiveAssignment | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [availabilityRes, assignmentRes, offersRes] = await Promise.all([
        fetch('/api/riders/availability'),
        fetch('/api/riders/assignments/active'),
        fetch('/api/riders/offers'),
      ]);

      if (availabilityRes.ok) {
        const availData = await availabilityRes.json();
        setIsAvailable(availData.data?.is_available ?? false);
      }

      if (assignmentRes.ok) {
        const assignData = await assignmentRes.json();
        setActiveAssignment(assignData.data || null);
      }

      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setOffers(offersData.data || []);
      }
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling for offers and active assignment
  useEffect(() => {
    const pollOffers = async () => {
      try {
        const [assignmentRes, offersRes] = await Promise.all([
          fetch('/api/riders/assignments/active'),
          isAvailable ? fetch('/api/riders/offers') : Promise.resolve(null),
        ]);

        if (assignmentRes.ok) {
          const assignData = await assignmentRes.json();
          setActiveAssignment(assignData.data || null);
        }

        if (offersRes?.ok) {
          const offersData = await offersRes.json();
          setOffers(offersData.data || []);
        }
      } catch {
        // Silently continue on poll failure
      }
    };

    // Don't poll if there's an active assignment (offers don't matter)
    if (activeAssignment) return;

    const interval = setInterval(pollOffers, isAvailable ? 5000 : 10000);
    return () => clearInterval(interval);
  }, [isAvailable, activeAssignment]);

  const handleAcceptOffer = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(`/api/riders/offers/${orderId}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept offer');
      }

      setActionMessage({ type: 'success', text: 'Offer accepted! Starting delivery...' });
      // Refresh data to show active assignment
      await fetchData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to accept offer' });
    }
  }, [fetchData]);

  const handleRejectOffer = useCallback(async (orderId: string) => {
    try {
      const response = await fetch(`/api/riders/offers/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Not available' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject offer');
      }

      setOffers(prev => prev.filter(o => o.order_id !== orderId));
    } catch (err) {
      setActionMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to reject offer' });
    }
  }, []);

  const handleDeliveryActionComplete = useCallback(async () => {
    setActionMessage({ type: 'success', text: 'Action completed successfully' });
    await fetchData();
  }, [fetchData]);

  const handleAvailabilityChange = useCallback((available: boolean) => {
    setIsAvailable(available);
  }, []);

  // Auto-dismiss messages
  useEffect(() => {
    if (actionMessage) {
      const timer = setTimeout(() => setActionMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-embee-slate">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-embee-charcoal">Dashboard</h1>
          <p className="text-sm text-embee-slate">Welcome back, {riderProfile.full_name}</p>
        </div>
        <AvailabilityToggle
          initialAvailable={isAvailable}
          onStatusChange={handleAvailabilityChange}
        />
      </div>

      {/* Action message */}
      {actionMessage && (
        <div className={`p-3 rounded-md text-sm ${
          actionMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {actionMessage.text}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Delivery */}
          {activeAssignment && (
            <ActiveDeliveryCard
              assignment={activeAssignment}
              onActionComplete={handleDeliveryActionComplete}
            />
          )}

          {/* Incoming Offers */}
          {!activeAssignment && isAvailable && offers.length > 0 && (
            <div>
              <h2 className="text-lg font-medium text-embee-charcoal mb-3">
                Incoming Offers ({offers.length})
              </h2>
              <div className="space-y-3">
                {offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={handleAcceptOffer}
                    onReject={handleRejectOffer}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!activeAssignment && offers.length === 0 && (
            <div className="text-center py-12 bg-white shadow rounded-lg">
              {isAvailable ? (
                <>
                  <div className="text-embee-slate/50 text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-embee-charcoal mb-1">Waiting for deliveries</h3>
                  <p className="text-sm text-embee-slate">
                    New delivery offers will appear here when available.
                  </p>
                </>
              ) : (
                <>
                  <div className="text-embee-slate/50 text-4xl mb-4">⏸️</div>
                  <h3 className="text-lg font-medium text-embee-charcoal mb-1">You&apos;re offline</h3>
                  <p className="text-sm text-embee-slate">
                    Go online to start receiving delivery offers.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Earnings */}
        <div className="lg:col-span-1">
          <EarningsPanel />
        </div>
      </div>
    </div>
  );
}
