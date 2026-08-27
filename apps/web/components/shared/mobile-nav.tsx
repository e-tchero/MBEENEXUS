'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from './logo';

interface NavLink {
  label: string;
  href: string;
}

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  links: NavLink[];
  user?: { name: string };
  signOutAction?: string;
}

export function MobileNav({ open, onClose, links, user, signOutAction = '/auth/signout' }: MobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-embee-slate/20">
            <Logo variant="wordmark" size="sm" theme="light" href="/" />
            <button
              onClick={onClose}
              className="p-2 rounded-md text-embee-slate hover:text-embee-charcoal hover:bg-embee-slate/10"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  'block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href || pathname.startsWith(link.href + '/')
                    ? 'bg-embee-blue text-white'
                    : 'text-embee-charcoal hover:bg-embee-slate/10'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-embee-slate/20 p-4">
            {user && (
              <p className="text-sm text-embee-slate mb-2">{user.name}</p>
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
        </div>
      </div>
    </div>
  );
}
