'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { MobileNav } from './mobile-nav';

interface NavLink {
  label: string;
  href: string;
}

interface AppNavProps {
  brand?: 'customer' | 'rider';
  links: NavLink[];
  user?: { name: string };
  signOutAction?: string;
}

export function AppNav({ brand = 'customer', links, user, signOutAction = '/auth/signout' }: AppNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="bg-white border-b border-embee-slate/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left: Logo + links */}
            <div className="flex items-center gap-8">
              <Logo
                variant="wordmark"
                size="sm"
                theme="light"
                href={brand === 'rider' ? '/rider/dashboard' : '/dashboard'}
              />

              {/* Desktop links */}
              <div className="hidden sm:flex sm:items-center sm:gap-6">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'text-sm font-medium transition-colors px-1 py-1 border-b-2',
                      pathname === link.href || pathname.startsWith(link.href + '/')
                        ? 'border-embee-blue text-embee-blue'
                        : 'border-transparent text-embee-slate hover:text-embee-charcoal hover:border-embee-slate/30'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: User + sign out */}
            <div className="hidden sm:flex sm:items-center sm:gap-4">
              {user && (
                <span className="text-sm text-embee-slate">{user.name}</span>
              )}
              <form action={signOutAction} method="post">
                <button
                  type="submit"
                  className="text-sm font-medium text-embee-slate hover:text-embee-charcoal transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>

            {/* Mobile hamburger */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-embee-slate hover:text-embee-charcoal hover:bg-embee-slate/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-embee-blue"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={links}
        user={user}
        signOutAction={signOutAction}
      />
    </>
  );
}
