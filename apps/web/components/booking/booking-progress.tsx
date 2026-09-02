import { cn } from '@/lib/utils';

interface BookingProgressProps {
  currentStep: number;
  steps: string[];
  className?: string;
}

export function BookingProgress({ currentStep, steps, className }: BookingProgressProps) {
  return (
    <nav aria-label="Booking progress" className={cn('mb-6', className)}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li key={step} className={cn('flex items-center', index < steps.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors flex-shrink-0',
                    isComplete
                      ? 'bg-embee-blue text-white'
                      : isCurrent
                      ? 'bg-embee-blue/10 text-embee-blue ring-2 ring-embee-blue'
                      : 'bg-embee-slate/10 text-embee-slate'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium hidden sm:inline',
                    isCurrent ? 'text-embee-charcoal' : isComplete ? 'text-embee-blue' : 'text-embee-slate'
                  )}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-3',
                    isComplete ? 'bg-embee-blue' : 'bg-embee-slate/20'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
