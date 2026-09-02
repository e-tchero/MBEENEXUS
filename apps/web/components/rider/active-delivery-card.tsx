'use client';

import { useState, useCallback } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { DeliveryProgressSteps } from './delivery-progress-steps';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';

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

interface ActiveDeliveryCardProps {
  assignment: ActiveAssignment;
  onActionComplete?: () => void;
}

type DeliveryAction = 'start' | 'arrive-pickup' | 'confirm-pickup' | 'arrive-destination' | 'complete' | 'cancel' | 'fail';

const ACTION_CONFIG: Record<string, { action: DeliveryAction; label: string; className: string }> = {
  rider_assigned: { action: 'start', label: 'Start Delivery', className: 'bg-embee-blue hover:bg-embee-blue/90 text-white' },
  rider_en_route_to_pickup: { action: 'arrive-pickup', label: 'Arrived at Pickup', className: 'bg-embee-blue/80 hover:bg-embee-blue/70 text-white' },
  arrived_at_pickup: { action: 'confirm-pickup', label: 'Confirm Pickup', className: 'bg-embee-blue hover:bg-embee-blue/90 text-white' },
  picked_up: { action: 'start', label: 'Start Transit', className: 'bg-embee-blue/80 hover:bg-embee-blue/70 text-white' },
  in_transit: { action: 'arrive-destination', label: 'Arrived at Destination', className: 'bg-green-600 hover:bg-green-700 text-white' },
  arrived_at_destination: { action: 'complete', label: 'Complete Delivery', className: 'bg-green-600 hover:bg-green-700 text-white' },
};

export function ActiveDeliveryCard({ assignment, onActionComplete }: ActiveDeliveryCardProps) {
  const [loading, setLoading] = useState<DeliveryAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const orderStatus = assignment.order.status;
  const config = ACTION_CONFIG[orderStatus];

  const executeAction = useCallback(async (endpoint: string, body?: Record<string, unknown>) => {
    setLoading(config?.action || 'start');
    setError(null);

    try {
      const response = await fetch(`/api/riders/deliveries/${assignment.order_id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }

      toast({ variant: 'success', title: 'Action completed' });
      onActionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
      toast({ variant: 'error', title: err instanceof Error ? err.message : 'Action failed' });
    } finally {
      setLoading(null);
    }
  }, [assignment.order_id, config?.action, onActionComplete, toast]);

  const handleAction = useCallback(async () => {
    if (!config) return;

    if (config.action === 'complete') {
      setShowCompleteForm(true);
      return;
    }

    await executeAction(config.action);
  }, [config, executeAction]);

  const handleComplete = useCallback(async () => {
    if (!recipientName.trim()) {
      setError('Recipient name is required');
      return;
    }

    await executeAction('complete', {
      proof_type: 'photo',
      recipient_name: recipientName.trim(),
      notes: notes.trim() || undefined,
    });
  }, [recipientName, notes, executeAction]);

  const handleCancel = useCallback(async () => {
    setShowCancelConfirm(false);
    await executeAction('cancel', { reason: 'Rider cancelled' });
  }, [executeAction]);

  return (
    <>
      <div className="bg-white shadow-embee-sm rounded-lg p-4 border-l-4 border-embee-blue">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-embee-charcoal">Active Delivery</h3>
          <StatusBadge status={orderStatus} />
        </div>

        {/* Progress steps */}
        <div className="mb-4">
          <DeliveryProgressSteps currentStatus={orderStatus} />
        </div>

        {/* Route info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm">
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-1.5" />
            <div>
              <span className="text-embee-slate text-xs">Pickup</span>
              <p className="text-embee-charcoal">{assignment.order.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5" />
            <div>
              <span className="text-embee-slate text-xs">Delivery</span>
              <p className="text-embee-charcoal">{assignment.order.delivery_address}</p>
            </div>
          </div>
        </div>

        {/* Customer info */}
        {assignment.order.customer_name && (
          <div className="text-sm text-embee-slate mb-3">
            Customer: {assignment.order.customer_name}
            {assignment.order.customer_phone && (
              <a href={`tel:${assignment.order.customer_phone}`} className="ml-2 text-embee-blue hover:text-embee-blue/80">
                Call
              </a>
            )}
          </div>
        )}

        {/* Amount */}
        <div className="text-lg font-semibold text-embee-charcoal mb-3">
          ₦{assignment.order.total_amount.toLocaleString()}
        </div>

        {error && (
          <p className="text-xs text-red-600 mb-2">{error}</p>
        )}

        {/* Complete delivery form */}
        {showCompleteForm && (
          <div className="border-t pt-3 mb-3">
            <h4 className="text-sm font-medium text-embee-charcoal mb-2">Complete Delivery</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Recipient name *"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2.5 border border-embee-slate/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue touch-target"
              />
              <textarea
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-embee-slate/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleComplete}
                  disabled={loading !== null || !recipientName.trim()}
                  className="flex-1 py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 touch-target"
                >
                  {loading === 'complete' ? 'Completing...' : 'Confirm Completion'}
                </button>
                <button
                  onClick={() => setShowCompleteForm(false)}
                  className="py-3 px-4 border border-embee-slate/20 text-sm font-medium rounded-lg text-embee-charcoal bg-white hover:bg-embee-white touch-target"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showCompleteForm && config && (
          <div className="flex gap-2">
            <button
              onClick={handleAction}
              disabled={loading !== null}
              className={`flex-1 py-3 px-4 border border-transparent text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 touch-target ${config.className}`}
            >
              {loading === config.action ? 'Processing...' : config.label}
            </button>
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading !== null}
              className="py-3 px-4 border border-embee-slate/20 text-sm font-medium rounded-lg text-red-600 bg-white hover:bg-red-50 disabled:opacity-50 touch-target"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <ConfirmationDialog
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel delivery?"
        description="Are you sure you want to cancel this delivery? This action cannot be undone."
        confirmLabel="Cancel Delivery"
        variant="danger"
        loading={loading === 'cancel'}
      />
    </>
  );
}
