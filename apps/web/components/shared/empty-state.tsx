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
    <div className={cn('text-center py-12 px-4', className)}>
      {icon ? (
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-embee-blue/10 text-embee-blue">
          {icon}
        </div>
      ) : (
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-embee-slate/10">
          <svg className="w-8 h-8 text-embee-slate/40" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
      )}
      <h3 className="text-lg font-semibold text-embee-charcoal mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-embee-slate max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
