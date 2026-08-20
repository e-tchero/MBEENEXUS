import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length < 7) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-4);
  return `${start}${'*'.repeat(phone.length - 7)}${end}`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: 'Awaiting Payment',
    paid: 'Payment Confirmed',
    searching_rider: 'Finding Rider',
    rider_assigned: 'Rider Assigned',
    rider_en_route_to_pickup: 'Rider Heading to Pickup',
    arrived_at_pickup: 'Rider at Pickup',
    picked_up: 'Package Picked Up',
    in_transit: 'In Transit',
    arrived_at_destination: 'Rider at Destination',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
    failed: 'Failed',
    expired: 'Expired',
    disputed: 'Disputed',
    refunded: 'Refunded',
  };
  return labels[status] || status;
}
