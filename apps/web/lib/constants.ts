export const APP_NAME = 'Embee Nexus';
export const APP_DESCRIPTION = 'On-demand delivery platform';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const NAVIGATION = {
  customer: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'New Delivery', href: '/deliveries/new' },
    { label: 'My Deliveries', href: '/deliveries' },
    { label: 'Profile', href: '/profile' },
  ],
  rider: [
    { label: 'Dashboard', href: '/rider/dashboard' },
    { label: 'Jobs', href: '/rider/jobs' },
    { label: 'Earnings', href: '/rider/earnings' },
    { label: 'Profile', href: '/rider/profile' },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard' },
    { label: 'Orders', href: '/admin/orders' },
    { label: 'Riders', href: '/admin/riders' },
    { label: 'Customers', href: '/admin/customers' },
    { label: 'Pricing', href: '/admin/pricing' },
    { label: 'Analytics', href: '/admin/analytics' },
  ],
} as const;
