interface VerificationHistoryProps {
  history: Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    changed_by: string;
    changed_by_name: string;
    reason: string | null;
    created_at: string;
  }>;
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function VerificationHistory({ history }: VerificationHistoryProps) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <h2 className="text-lg font-semibold text-embee-charcoal mb-4">
        Verification History
      </h2>

      {history.length === 0 ? (
        <p className="text-sm text-embee-slate">No verification history yet</p>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs text-embee-slate">
                    {entry.changed_by_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-embee-charcoal">
                    {entry.changed_by_name}
                  </span>
                  {entry.old_status && (
                    <>
                      <span className="text-xs text-embee-slate">changed from</span>
                      {getStatusBadge(entry.old_status)}
                    </>
                  )}
                  <span className="text-xs text-embee-slate">to</span>
                  {getStatusBadge(entry.new_status)}
                </div>
                {entry.reason && (
                  <p className="text-xs text-embee-slate mt-1">{entry.reason}</p>
                )}
                <p className="text-xs text-embee-slate mt-1">
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
