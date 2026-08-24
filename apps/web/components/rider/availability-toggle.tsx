'use client';

import { useState, useCallback } from 'react';

interface AvailabilityToggleProps {
  initialAvailable: boolean;
  onStatusChange?: (available: boolean) => void;
}

export function AvailabilityToggle({ initialAvailable, onStatusChange }: AvailabilityToggleProps) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/riders/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !isAvailable }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update availability');
      }

      setIsAvailable(!isAvailable);
      onStatusChange?.(!isAvailable);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  }, [isAvailable, onStatusChange]);

  return (
    <div className="flex items-center space-x-3">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        role="switch"
        aria-checked={isAvailable}
        aria-label="Toggle availability"
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${isAvailable ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
      <span className="text-sm font-medium text-gray-700">
        {isAvailable ? 'Online' : 'Offline'}
      </span>
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  );
}
