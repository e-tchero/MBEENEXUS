import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        embee: {
          navy: '#0B1220',
          blue: '#147BFF',
          'blue-accessible': '#0C5ED9',
          cyan: '#38BDF8',
          white: '#F5F7FA',
          charcoal: '#111827',
          slate: '#64748B',
          coral: '#EF4444',
        },
        // Accessible status colors (WCAG AA compliant backgrounds + text)
        'status-success': {
          DEFAULT: '#DCFCE7',
          foreground: '#052E16',
        },
        'status-warning': {
          DEFAULT: '#FEF3C7',
          foreground: '#451A03',
        },
        'status-error': {
          DEFAULT: '#FEE2E2',
          foreground: '#7F1D1D',
        },
        'status-info': {
          DEFAULT: '#DBEAFE',
          foreground: '#1E3A5F',
        },
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'none': 'none',
        'embee-sm': '0 1px 2px rgba(0,0,0,0.05)',
        'embee-md': '0 4px 6px rgba(0,0,0,0.07)',
        'embee-lg': '0 10px 15px rgba(0,0,0,0.1)',
        'embee-xl': '0 20px 25px rgba(0,0,0,0.15)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'skeleton-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'toast-in': {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'toast-out': {
          from: { transform: 'translateY(0)', opacity: '1' },
          to: { transform: 'translateY(100%)', opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'skeleton': 'skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'toast-in': 'toast-in 0.3s cubic-bezier(0, 0, 0.2, 1)',
        'toast-out': 'toast-out 0.2s cubic-bezier(0.4, 0, 1, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'embee': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'embee-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
