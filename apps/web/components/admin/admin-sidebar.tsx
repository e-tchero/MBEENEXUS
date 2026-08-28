'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  userName: string;
  userRole: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Riders', href: '/admin/riders' },
];

export function AdminSidebar({ userName, userRole }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-embee-navy lg:block hidden">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-white/10">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-embee-blue rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">EN</span>
          </div>
          <div>
            <span className="text-white font-semibold text-lg tracking-tight">
              EMBEE
            </span>
            <span className="text-embee-cyan font-light text-lg tracking-widest ml-1">
              NEXUS
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-embee-blue text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-embee-blue/20 rounded-full flex items-center justify-center">
            <span className="text-embee-blue font-semibold text-sm">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {userName}
            </p>
            <p className="text-white/50 text-xs capitalize">
              {userRole.replace('_', ' ')}
            </p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="w-full text-left text-white/50 hover:text-white text-xs transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
