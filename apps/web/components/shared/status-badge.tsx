const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
  pending_payment: { label: 'Pending Payment', className: 'bg-yellow-100 text-yellow-800' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
  searching_rider: { label: 'Finding Rider', className: 'bg-blue-100 text-blue-800' },
  rider_assigned: { label: 'Rider Assigned', className: 'bg-indigo-100 text-indigo-800' },
  rider_en_route_to_pickup: { label: 'En Route to Pickup', className: 'bg-indigo-100 text-indigo-800' },
  arrived_at_pickup: { label: 'Arrived at Pickup', className: 'bg-purple-100 text-purple-800' },
  picked_up: { label: 'Picked Up', className: 'bg-purple-100 text-purple-800' },
  in_transit: { label: 'In Transit', className: 'bg-purple-100 text-purple-800' },
  arrived_at_destination: { label: 'Arrived at Destination', className: 'bg-green-100 text-green-800' },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-800' },
  disputed: { label: 'Disputed', className: 'bg-orange-100 text-orange-800' },
  refunded: { label: 'Refunded', className: 'bg-yellow-100 text-yellow-800' },
  // Rider assignment statuses
  offered: { label: 'Offered', className: 'bg-blue-100 text-blue-800' },
  accepted: { label: 'Accepted', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
  // Rider verification
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  under_review: { label: 'Under Review', className: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status.replace(/_/g, ' '), className: 'bg-gray-100 text-gray-800' };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
