import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && (
        <div className="text-embee-slate/40 text-4xl mb-4">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-embee-charcoal mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-embee-slate max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
