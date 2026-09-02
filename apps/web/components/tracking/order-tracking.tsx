'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TrackingMap } from './tracking-map';
import { RiderCard } from './rider-card';
import { OrderTimeline } from './order-timeline';
import { StatusBadge } from '@/components/shared/status-badge';
import { CancelOrderButton } from '@/components/order/cancel-order-button';
import { RefundStatus } from '@/components/order/refund-status';
import { ProofDisplay } from '@/components/order/proof-display';
import { RatingForm } from '@/components/order/rating-form';
import { useToast } from '@/components/ui/toast';

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  tracking_code: string;
  pickup_latitude: number;
  pickup_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  pickup_contact_name: string;
  recipient_name: string;
  distance_km: number;
  estimated_duration_minutes: number;
  total_amount: number;
  currency: string;
  created_at: string;
  rider_assigned_at: string | null;
  rider_arrived_at_pickup: string | null;
  rider_picked_up_at: string | null;
  rider_arrived_at_destination: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  assigned_rider_id: string | null;
  route_geometry?: [number, number][] | null;
  rider?: {
    full_name: string;
    rating: number;
    vehicle_type: string;
    vehicle_plate: string | null;
  } | null;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

interface OrderTrackingProps {
  order: OrderData;
  events: TimelineEvent[];
}

const TRACKING_STATUSES = new Set([
  'rider_assigned', 'rider_en_route_to_pickup', 'arrived_at_pickup',
  'picked_up', 'in_transit', 'arrived_at_destination',
]);

const TERMINAL_STATUSES = new Set(['delivered', 'completed', 'cancelled', 'failed']);
const CANCELLABLE_STATUSES = new Set([
  'paid', 'searching_rider', 'rider_assigned',
  'rider_en_route_to_pickup', 'arrived_at_pickup'
]);

export function OrderTracking({ order: initialOrder, events: initialEvents }: OrderTrackingProps) {
  const [order, setOrder] = useState(initialOrder);
  const [events, setEvents] = useState(initialEvents);
  const [riderLocation, setRiderLocation] = useState<{
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
  } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [refundInitiated, setRefundInitiated] = useState(false);
  const { toast } = useToast();

  const isTracking = TRACKING_STATUSES.has(order.status);
  const isTerminal = TERMINAL_STATUSES.has(order.status);

  const handleRiderLocation = useCallback((payload: Record<string, unknown>) => {
    setRiderLocation({
      latitude: payload.latitude as number,
      longitude: payload.longitude as number,
      heading: payload.heading as number | null,
      speed: payload.speed as number | null,
    });
  }, []);

  useEffect(() => {
    if (!isTracking || !order.id) return;

    const supabase = createClient();
    let reconnectTimer: NodeJS.Timeout;

    const channel = supabase.channel(`delivery:${order.id}`);

    channel
      .on('broadcast', { event: 'rider-location' }, ({ payload }) => {
        handleRiderLocation(payload as Record<string, unknown>);
        setConnectionStatus('connected');
      })
      .on('system', { event: 'pong' }, () => {
        setConnectionStatus('connected');
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
          reconnectTimer = setTimeout(() => {
            channel.subscribe();
          }, 5000);
        }
      });

    return () => {
      clearTimeout(reconnectTimer);
      supabase.removeChannel(channel);
    };
  }, [order.id, isTracking, handleRiderLocation]);

  // Poll for order status changes
  useEffect(() => {
    if (isTerminal) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.order && data.order.status !== order.status) {
            setOrder((prev) => ({ ...prev, ...data.order }));
            toast({ variant: 'info', title: `Order status updated: ${data.order.status.replace(/_/g, ' ')}` });
          }
        }
      } catch {
        // Silently retry
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [order.id, order.status, isTerminal, toast]);

  // Calculate ETA
  const etaMinutes = riderLocation && order.status === 'in_transit'
    ? Math.max(1, Math.round(order.estimated_duration_minutes * 0.5))
    : order.status === 'rider_en_route_to_pickup'
    ? Math.max(1, Math.round(order.estimated_duration_minutes * 0.3))
    : null;

  const handleCancelled = useCallback((initiated: boolean) => {
    setRefundInitiated(initiated);
    setOrder(prev => ({ ...prev, status: 'cancelled' }));
  }, []);

  const showCancelButton = CANCELLABLE_STATUSES.has(order.status);
  const showRefundStatus = order.status === 'cancelled' || order.status === 'failed';
  const showProof = order.status === 'delivered' || order.status === 'completed';
  const showRating = order.status === 'delivered' || order.status === 'completed';

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="bg-white shadow-embee-sm rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-embee-charcoal">{order.order_number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-xs text-embee-slate">Tracking: {order.tracking_code}</p>

        {connectionStatus === 'reconnecting' && (
          <div className="mt-2 px-3 py-1.5 bg-status-warning text-status-warning-foreground rounded text-xs">
            Reconnecting to live updates...
          </div>
        )}
      </div>

      {/* Map — primary visual element */}
      {isTracking && (
        <TrackingMap
          pickupLat={order.pickup_latitude}
          pickupLng={order.pickup_longitude}
          destinationLat={order.destination_latitude}
          destinationLng={order.destination_longitude}
          riderLat={riderLocation?.latitude}
          riderLng={riderLocation?.longitude}
          riderHeading={riderLocation?.heading}
          status={order.status}
          routeGeometry={order.route_geometry}
        />
      )}

      {/* ETA Banner */}
      {etaMinutes && (
        <div className="bg-embee-blue/10 rounded-lg p-3 flex items-center gap-3">
          <svg className="h-5 w-5 text-embee-blue" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-embee-charcoal">Estimated arrival</p>
            <p className="text-xs text-embee-slate">~{etaMinutes} minutes</p>
          </div>
        </div>
      )}

      {/* Rider Card */}
      {isTracking && order.rider && (
        <RiderCard
          riderName={order.rider.full_name}
          riderRating={order.rider.rating}
          vehicleType={order.rider.vehicle_type}
          vehiclePlate={order.rider.vehicle_plate}
          etaMinutes={etaMinutes}
        />
      )}

      {/* Searching animation */}
      {order.status === 'searching_rider' && (
        <div className="bg-white shadow-embee-sm rounded-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-embee-blue/10 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-embee-blue animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-embee-charcoal">Finding a rider for you...</p>
          <p className="text-xs text-embee-slate mt-1">This usually takes less than a minute</p>
        </div>
      )}

      {/* Terminal states */}
      {order.status === 'cancelled' && (
        <div className="bg-status-error/20 border border-status-error/30 rounded-lg p-4">
          <p className="text-sm font-medium text-status-error-foreground">This order has been cancelled</p>
        </div>
      )}
      {order.status === 'failed' && (
        <div className="bg-status-error/20 border border-status-error/30 rounded-lg p-4">
          <p className="text-sm font-medium text-status-error-foreground">Delivery failed</p>
          <p className="text-xs text-status-error-foreground/70 mt-1">Please contact support for assistance</p>
        </div>
      )}
      {order.status === 'delivered' && (
        <div className="bg-status-success/20 border border-status-success/30 rounded-lg p-4">
          <p className="text-sm font-medium text-status-success-foreground">Package delivered!</p>
          <p className="text-xs text-status-success-foreground/70 mt-1">
            Delivered at {new Date(order.delivered_at!).toLocaleString('en-NG')}
          </p>
        </div>
      )}
      {order.status === 'completed' && (
        <div className="bg-status-success/20 border border-status-success/30 rounded-lg p-4">
          <p className="text-sm font-medium text-status-success-foreground">Order completed</p>
        </div>
      )}

      {/* Cancel button */}
      {showCancelButton && (
        <div className="bg-white shadow-embee-sm rounded-lg p-4">
          <CancelOrderButton
            orderId={order.id}
            onCancelled={handleCancelled}
          />
        </div>
      )}

      {/* Refund status */}
      {showRefundStatus && (
        <RefundStatus
          orderId={order.id}
          visible={showRefundStatus}
        />
      )}

      {/* Proof display */}
      {showProof && (
        <ProofDisplay
          orderId={order.id}
          visible={showProof}
        />
      )}

      {/* Rating form */}
      {showRating && (
        <RatingForm
          orderId={order.id}
          visible={showRating}
        />
      )}

      {/* Delivery Details */}
      <div className="bg-white shadow-embee-sm rounded-lg p-4">
        <h3 className="text-sm font-semibold text-embee-charcoal mb-3">Delivery Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-embee-slate">From</span>
            <span className="text-embee-charcoal">{order.pickup_contact_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-embee-slate">To</span>
            <span className="text-embee-charcoal">{order.recipient_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-embee-slate">Distance</span>
            <span className="text-embee-charcoal">{order.distance_km} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-embee-slate">Total</span>
            <span className="font-medium text-embee-charcoal">
              {order.currency === 'NGN' ? '₦' : order.currency}
              {order.total_amount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <OrderTimeline events={events} currentStatus={order.status} />
    </div>
  );
}
