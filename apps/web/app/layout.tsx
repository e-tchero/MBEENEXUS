import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Embee Nexus — Delivery Platform',
  description: 'You want it delivered. Embee Nexus is the right platform for the job.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
