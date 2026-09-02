import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'mark' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
  href?: string;
  className?: string;
}

/**
 * EMBEE NEXUS Logo Component
 *
 * Uses text wordmark with brand typography.
 * Brand assets available in CLAUDE_PREP/brand/assets/ for future SVG integration.
 */
export function Logo({
  variant = 'full',
  size = 'md',
  theme = 'dark',
  href = '/',
  className,
}: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  const markSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-lg',
  };

  const themeClasses = {
    light: 'text-embee-charcoal',
    dark: 'text-white',
  };

  const cyanTheme = {
    light: 'text-embee-blue',
    dark: 'text-embee-cyan',
  };

  if (variant === 'mark') {
    return (
      <Link href={href} className={cn('flex items-center', className)} aria-label="Embee Nexus home">
        <div
          className={cn(
            'flex items-center justify-center rounded-lg font-extrabold',
            markSizes[size],
            theme === 'dark' ? 'bg-embee-blue text-white' : 'bg-embee-navy text-white'
          )}
        >
          EN
        </div>
      </Link>
    );
  }

  if (variant === 'wordmark') {
    return (
      <Link href={href} className={cn('flex items-center gap-1', className)} aria-label="Embee Nexus home">
        <span className={cn('font-extrabold tracking-tight', sizeClasses[size], themeClasses[theme])}>
          EMBEE
        </span>
        <span className={cn('font-light tracking-widest', sizeClasses[size], cyanTheme[theme])}>
          NEXUS
        </span>
      </Link>
    );
  }

  // Full logo: mark + wordmark
  return (
    <Link href={href} className={cn('flex items-center gap-3', className)} aria-label="Embee Nexus home">
      <div
        className={cn(
          'flex items-center justify-center rounded-lg font-extrabold text-white',
          markSizes[size],
          'bg-embee-blue'
        )}
      >
        EN
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('font-extrabold tracking-tight', sizeClasses[size], themeClasses[theme])}>
          EMBEE
        </span>
        <span className={cn('font-light tracking-widest', sizeClasses[size], cyanTheme[theme])}>
          NEXUS
        </span>
      </div>
    </Link>
  );
}
