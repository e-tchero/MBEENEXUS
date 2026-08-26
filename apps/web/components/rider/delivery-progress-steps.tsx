'use client';

const STEPS = [
  { key: 'rider_assigned', label: 'Assigned', order: 0 },
  { key: 'rider_en_route_to_pickup', label: 'En Route', order: 1 },
  { key: 'arrived_at_pickup', label: 'At Pickup', order: 2 },
  { key: 'picked_up', label: 'Picked Up', order: 3 },
  { key: 'in_transit', label: 'In Transit', order: 4 },
  { key: 'arrived_at_destination', label: 'At Destination', order: 5 },
  { key: 'delivered', label: 'Delivered', order: 6 },
  { key: 'completed', label: 'Completed', order: 6 },
];

interface DeliveryProgressStepsProps {
  currentStatus: string;
}

export function DeliveryProgressSteps({ currentStatus }: DeliveryProgressStepsProps) {
  const currentStep = STEPS.find(s => s.key === currentStatus)?.order ?? 0;
  const isTerminal = currentStatus === 'delivered' || currentStatus === 'completed' || currentStatus === 'cancelled' || currentStatus === 'failed';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {STEPS.slice(0, 6).map((step, index) => {
          const isCompleted = index < currentStep || isTerminal;
          const isCurrent = index === currentStep && !isTerminal;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              {/* Step circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-embee-blue text-white ring-2 ring-embee-blue/20' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-embee-slate/20 text-embee-slate' : ''}
                `}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              {/* Label */}
              <span className={`text-xs mt-1 text-center ${isCurrent ? 'text-embee-blue font-medium' : 'text-embee-slate'}`}>
                {step.label}
              </span>
              {/* Connector line */}
              {index < 5 && (
                <div
                  className={`absolute h-0.5 w-full ${
                    isCompleted ? 'bg-green-500' : 'bg-embee-slate/20'
                  }`}
                  style={{ top: '16px', left: '50%', right: '-50%', zIndex: 0 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
