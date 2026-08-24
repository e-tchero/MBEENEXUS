'use client';

import { useState, useCallback } from 'react';
import { StatusBadge } from '@/components/shared/status-badge';
import { DeliveryProgressSteps } from './delivery-progress-steps';

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
  rider_assigned: { action: 'start', label: 'Start Delivery', className: 'bg-blue-600 hover:bg-blue-700 text-white' },
  rider_en_route_to_pickup: { action: 'arrive-pickup', label: 'Arrived at Pickup', className: 'bg-purple-600 hover:bg-purple-700 text-white' },
  arrived_at_pickup: { action: 'confirm-pickup', label: 'Confirm Pickup', className: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  picked_up: { action: 'start', label: 'Start Transit', className: 'bg-purple-600 hover:bg-purple-700 text-white' },
  in_transit: { action: 'arrive-destination', label: 'Arrived at Destination', className: 'bg-green-600 hover:bg-green-700 text-white' },
  arrived_at_destination: { action: 'complete', label: 'Complete Delivery', className: 'bg-green-600 hover:bg-green-700 text-white' },
};

export function ActiveDeliveryCard({ assignment, onActionComplete }: ActiveDeliveryCardProps) {
  const [loading, setLoading] = useState<DeliveryAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');

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

      onActionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(null);
    }
  }, [assignment.order_id, config?.action, onActionComplete]);

  const handleAction = useCallback(async () => {
    if (!config) return;

    if (config.action === 'complete') {
      setShowCompleteForm(true);
      return;
    }

    if (config.action === 'cancel') {
      await executeAction('cancel', { reason: 'Rider cancelled' });
      return;
    }

    if (config.action === 'fail') {
      await executeAction('fail', { failure_type: 'other', reason: 'Unable to complete delivery' });
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

  return (
    <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">Active Delivery</h3>
        <StatusBadge status={orderStatus} />
      </div>

      {/* Progress steps */}
      <div className="mb-4">
        <DeliveryProgressSteps currentStatus={orderStatus} />
      </div>

      {/* Pickup/Delivery info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-start text-sm">
          <span className="text-green-500 mr-2">●</span>
          <div>
            <span className="text-gray-500 text-xs">Pickup</span>
            <p className="text-gray-700">{assignment.order.pickup_address}</p>
          </div>
        </div>
        <div className="flex items-start text-sm">
          <span className="text-red-500 mr-2">●</span>
          <div>
            <span className="text-gray-500 text-xs">Delivery</span>
            <p className="text-gray-700">{assignment.order.delivery_address}</p>
          </div>
        </div>
      </div>

      {/* Customer info */}
      {assignment.order.customer_name && (
        <div className="text-sm text-gray-500 mb-3">
          Customer: {assignment.order.customer_name}
          {assignment.order.customer_phone && (
            <a href={`tel:${assignment.order.customer_phone}`} className="ml-2 text-blue-600">
              Call
            </a>
          )}
        </div>
      )}

      {/* Amount */}
      <div className="text-sm font-medium text-gray-900 mb-3">
        ₦{assignment.order.total_amount.toLocaleString()}
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {/* Complete delivery form */}
      {showCompleteForm && (
        <div className="border-t pt-3 mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Complete Delivery</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Recipient name *"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleComplete}
                disabled={loading !== null || !recipientName.trim()}
                className="flex-1 py-2 px-3 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {loading === 'complete' ? 'Completing...' : 'Confirm Completion'}
              </button>
              <button
                onClick={() => setShowCompleteForm(false)}
                className="py-2 px-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!showCompleteForm && config && (
        <div className="flex space-x-2">
          <button
            onClick={handleAction}
            disabled={loading !== null}
            className={`flex-1 py-2 px-3 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${config.className}`}
          >
            {loading === config.action ? 'Processing...' : config.label}
          </button>
          <button
            onClick={() => executeAction('cancel', { reason: 'Rider cancelled' })}
            disabled={loading !== null}
            className="py-2 px-3 border border-gray-300 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
