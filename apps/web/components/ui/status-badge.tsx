import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  // Order statuses — using accessible background + text combinations
  draft: { label: 'Draft', className: 'bg-embee-slate/10 text-embee-charcoal' },
  pending_payment: { label: 'Pending Payment', className: 'bg-status-warning text-status-warning-foreground' },
  paid: { label: 'Paid', className: 'bg-status-success text-status-success-foreground' },
  searching_rider: { label: 'Finding Rider', className: 'bg-status-info text-status-info-foreground' },
  rider_assigned: { label: 'Rider Assigned', className: 'bg-status-info text-status-info-foreground' },
  rider_en_route_to_pickup: { label: 'En Route to Pickup', className: 'bg-status-info text-status-info-foreground' },
  arrived_at_pickup: { label: 'Arrived at Pickup', className: 'bg-accent/20 text-accent-foreground' },
  picked_up: { label: 'Picked Up', className: 'bg-accent/20 text-accent-foreground' },
  in_transit: { label: 'In Transit', className: 'bg-status-info text-status-info-foreground' },
  arrived_at_destination: { label: 'Arrived at Destination', className: 'bg-status-success text-status-success-foreground' },
  delivered: { label: 'Delivered', className: 'bg-status-success text-status-success-foreground' },
  completed: { label: 'Completed', className: 'bg-status-success text-status-success-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-status-error text-status-error-foreground' },
  failed: { label: 'Failed', className: 'bg-status-error text-status-error-foreground' },
  expired: { label: 'Expired', className: 'bg-embee-slate/10 text-embee-charcoal' },
  disputed: { label: 'Disputed', className: 'bg-status-warning text-status-warning-foreground' },
  refunded: { label: 'Refunded', className: 'bg-status-warning text-status-warning-foreground' },
  // Rider assignment statuses
  offered: { label: 'Offered', className: 'bg-status-info text-status-info-foreground' },
  accepted: { label: 'Accepted', className: 'bg-status-success text-status-success-foreground' },
  rejected: { label: 'Rejected', className: 'bg-status-error text-status-error-foreground' },
  // Rider verification
  pending: { label: 'Pending', className: 'bg-status-warning text-status-warning-foreground' },
  under_review: { label: 'Under Review', className: 'bg-status-info text-status-info-foreground' },
  approved: { label: 'Approved', className: 'bg-status-success text-status-success-foreground' },
  // Refund statuses
  processing: { label: 'Processing', className: 'bg-status-info text-status-info-foreground' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status.replace(/_/g, ' '),
    className: 'bg-embee-slate/10 text-embee-charcoal',
  };

  return (
    <span
      role="status"
      aria-label={config.label}
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
