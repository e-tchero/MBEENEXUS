'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Rider {
  id: string;
  full_name: string;
  phone: string | null;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
  documents: Array<{
    document_type: string;
    status: string;
  }>;
}

interface RiderQueueProps {
  riders: Rider[];
  currentFilter?: string;
  totalCount: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Riders' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const labels: Record<string, string> = {
    pending: 'Pending',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || 'bg-embee-slate/10 text-embee-charcoal'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function getDocumentSummary(documents: Array<{ document_type: string; status: string }>) {
  const total = documents.length;
  const approved = documents.filter((d) => d.status === 'approved').length;
  const pending = documents.filter((d) => d.status === 'pending').length;
  const rejected = documents.filter((d) => d.status === 'rejected').length;

  return { total, approved, pending, rejected };
}

export function RiderQueue({ riders, currentFilter, totalCount }: RiderQueueProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleFilterChange = (value: string) => {
    if (value) {
      router.push(`${pathname}?status=${value}`);
    } else {
      router.push(pathname);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFilterChange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentFilter === option.value || (!currentFilter && !option.value)
                  ? 'bg-embee-blue text-white'
                  : 'bg-white text-embee-charcoal border border-embee-slate/20 hover:border-embee-blue'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-embee-slate">
          {totalCount} rider{totalCount !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Rider List */}
      {riders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-embee-slate/20 text-center">
          <div className="text-4xl mb-4">🏍️</div>
          <h3 className="text-lg font-medium text-embee-charcoal mb-2">
            No riders found
          </h3>
          <p className="text-embee-slate">
            {currentFilter
              ? `No riders with status "${currentFilter}"`
              : 'No riders have registered yet'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-embee-slate/20 overflow-hidden">
          <table className="min-w-full divide-y divide-embee-slate/20">
            <thead className="bg-embee-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                  Rider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-embee-slate uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-embee-slate uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-embee-slate/20">
              {riders.map((rider) => {
                const docSummary = getDocumentSummary(rider.documents);
                return (
                  <tr
                    key={rider.id}
                    className="hover:bg-embee-white transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-embee-charcoal">
                          {rider.full_name}
                        </p>
                        {rider.phone && (
                          <p className="text-xs text-embee-slate mt-0.5">
                            {rider.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(rider.verification_status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-embee-slate">
                        <span className="text-green-600">{docSummary.approved} approved</span>
                        <span className="mx-1">·</span>
                        <span className="text-yellow-600">{docSummary.pending} pending</span>
                        {docSummary.rejected > 0 && (
                          <>
                            <span className="mx-1">·</span>
                            <span className="text-red-600">{docSummary.rejected} rejected</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-embee-slate">
                        {new Date(rider.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/riders/${rider.id}`}
                        className="inline-flex items-center px-3 py-1.5 bg-embee-blue text-white text-xs font-medium rounded-lg hover:bg-embee-blue/90 transition-colors"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
