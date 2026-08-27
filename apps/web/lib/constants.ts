export const APP_NAME = 'Embee Nexus';
export const APP_DESCRIPTION = 'On-demand delivery platform';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Accurate route references based on actual existing page routes.
 * Use this instead of hardcoding route strings throughout the app.
 */
export const ROUTES = {
  customer: {
    dashboard: '/dashboard',
    addresses: '/addresses',
    orders: '/orders',
    orderDetail: (id: string) => `/orders/${id}`,
  },
  rider: {
    register: '/rider/register',
    onboarding: '/rider/onboarding',
    dashboard: '/rider/dashboard',
  },
  admin: {
    dashboard: '/admin/dashboard',
    riders: '/admin/riders',
    riderDetail: (id: string) => `/admin/riders/${id}`,
  },
  auth: {
    login: '/login',
    signup: '/signup',
    signout: '/auth/signout',
  },
} as const;
