interface TimelineEvent {
  id?: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const STATUS_ORDER = [
  'draft', 'pending_payment', 'paid', 'searching_rider', 'rider_assigned',
  'rider_en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'in_transit',
  'arrived_at_destination', 'delivered', 'completed',
];

const EVENT_LABELS: Record<string, string> = {
  order_created: 'Order placed',
  payment_confirmed: 'Payment confirmed',
  rider_assigned: 'Rider assigned',
  rider_accepted: 'Rider accepted',
  rider_rejected: 'Rider rejected',
  delivery_started: 'Heading to pickup',
  rider_arrived_pickup: 'Arrived at pickup',
  pickup_confirmed: 'Package picked up',
  in_transit: 'In transit',
  rider_arrived_destination: 'Arrived at destination',
  delivery_completed: 'Delivered',
  order_completed: 'Completed',
  order_cancelled: 'Cancelled',
  delivery_failed: 'Delivery failed',
  refund_initiated: 'Refund initiated',
  refund_completed: 'Refund completed',
};

function getEventLabel(event: TimelineEvent): string {
  if (EVENT_LABELS[event.event_type]) {
    return EVENT_LABELS[event.event_type];
  }
  return event.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isEventCompleted(event: TimelineEvent, currentStatus: string): boolean {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const eventStatusIdx = event.to_status ? STATUS_ORDER.indexOf(event.to_status) : -1;

  if (event.event_type.includes('cancel') || event.event_type.includes('fail')) {
    return true;
  }

  if (eventStatusIdx === -1) return true;
  return eventStatusIdx <= currentIdx;
}

export function OrderTimeline({ events, currentStatus }: OrderTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Timeline</h3>
        <p className="text-sm text-gray-500">No events recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Timeline</h3>
      <div className="space-y-3">
        {events.map((event, idx) => {
          const completed = isEventCompleted(event, currentStatus);
          const isLast = idx === events.length - 1;

          return (
            <div key={event.id || idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1 ${
                    completed
                      ? 'bg-indigo-500'
                      : 'bg-gray-300'
                  }`}
                />
                {!isLast && (
                  <div className={`w-0.5 flex-1 ${completed ? 'bg-indigo-200' : 'bg-gray-200'}`} />
                )}
              </div>
              <div className="pb-3 min-w-0">
                <p className={`text-sm font-medium ${completed ? 'text-gray-900' : 'text-gray-400'}`}>
                  {getEventLabel(event)}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(event.created_at).toLocaleString('en-NG', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
