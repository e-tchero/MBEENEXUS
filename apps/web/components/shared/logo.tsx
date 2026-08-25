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
 * INTERIM IMPLEMENTATION: Uses text wordmark fallback.
 * The final E/N monogram vector artwork is an external asset dependency.
 * When the approved SVG asset is supplied, update this component to use it.
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

  const themeClasses = {
    light: 'text-embee-charcoal',
    dark: 'text-white',
  };

  const cyanTheme = {
    light: 'text-embee-blue',
    dark: 'text-embee-cyan',
  };

  if (variant === 'mark') {
    // Compact E/N mark — text placeholder until monogram asset is available
    return (
      <Link href={href} className={cn('flex items-center', className)}>
        <div
          className={cn(
            'flex items-center justify-center rounded-lg font-extrabold',
            size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm',
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
      <Link href={href} className={cn('flex items-center gap-1', className)}>
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
    <Link href={href} className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-lg font-extrabold text-white',
          size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm',
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
