interface RiderCardProps {
  riderName: string;
  riderRating: number;
  vehicleType: string;
  vehiclePlate?: string | null;
  etaMinutes?: number | null;
}

export function RiderCard({
  riderName,
  riderRating,
  vehicleType,
  vehiclePlate,
  etaMinutes,
}: RiderCardProps) {
  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-embee-blue/10 flex items-center justify-center">
          <span className="text-embee-blue font-medium text-sm">
            {riderName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-embee-charcoal truncate">{riderName}</p>
          <div className="flex items-center gap-2 text-xs text-embee-slate">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {riderRating.toFixed(1)}
            </span>
            <span>•</span>
            <span className="capitalize">{vehicleType}</span>
            {vehiclePlate && (
              <>
                <span>•</span>
                <span>{vehiclePlate}</span>
              </>
            )}
          </div>
        </div>
        {etaMinutes != null && etaMinutes > 0 && (
          <div className="text-right">
            <p className="text-lg font-semibold text-embee-blue">{etaMinutes}</p>
            <p className="text-xs text-embee-slate">min</p>
          </div>
        )}
      </div>
    </div>
  );
}
