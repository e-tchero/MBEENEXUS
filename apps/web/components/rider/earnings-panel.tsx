'use client';

import { useState, useEffect } from 'react';

interface EarningsSummary {
  total_earnings: number;
  total_deliveries: number;
  pending_earnings: number;
  paid_earnings: number;
}

interface EarningsEntry {
  id: string;
  amount: number;
  balance_after: number;
  description: string;
  reference_type: string;
  created_at: string;
}

interface EarningsPanelProps {
  initialSummary?: EarningsSummary;
}

export function EarningsPanel({ initialSummary }: EarningsPanelProps) {
  const [summary, setSummary] = useState<EarningsSummary | null>(initialSummary || null);
  const [history, setHistory] = useState<EarningsEntry[]>([]);
  const [loading, setLoading] = useState(!initialSummary);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/riders/earnings/summary');
        if (response.ok) {
          const data = await response.json();
          setSummary(data.data || data);
        }
      } catch {
        setError('Failed to load earnings summary');
      } finally {
        setLoading(false);
      }
    };

    if (!initialSummary) {
      fetchSummary();
    }
  }, [initialSummary]);

  const fetchHistory = async (pageNum: number) => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/riders/earnings?page=${pageNum}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        const entries = data.data?.earnings || data.data || [];
        if (pageNum === 1) {
          setHistory(entries);
        } else {
          setHistory(prev => [...prev, ...entries]);
        }
        setHasMore(entries.length === 10);
      }
    } catch {
      setError('Failed to load earnings history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Earnings</h3>

      {error && (
        <p className="text-xs text-red-600 mb-3">{error}</p>
      )}

      {/* Summary */}
      {loading ? (
        <div className="text-sm text-gray-500 mb-4">Loading...</div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Total Earned</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.total_earnings)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Deliveries</p>
            <p className="text-lg font-semibold text-gray-900">{summary.total_deliveries}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <p className="text-xs text-yellow-600">Pending</p>
            <p className="text-lg font-semibold text-yellow-700">{formatCurrency(summary.pending_earnings)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-600">Paid</p>
            <p className="text-lg font-semibold text-green-700">{formatCurrency(summary.paid_earnings)}</p>
          </div>
        </div>
      ) : null}

      {/* History */}
      <div className="border-t pt-4">
        <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Recent Earnings</h4>
        {historyLoading && history.length === 0 ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-sm text-gray-500">No earnings yet</div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm text-gray-700">{entry.description || 'Delivery earnings'}</p>
                  <p className="text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">+{formatCurrency(entry.amount)}</p>
                  <p className="text-xs text-gray-500">Bal: {formatCurrency(entry.balance_after)}</p>
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={historyLoading}
                className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                {historyLoading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
