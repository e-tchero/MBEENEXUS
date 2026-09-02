'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SearchResult {
  address: string;
  latitude: number;
  longitude: number;
  formatted_address: string;
  components: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
}

interface AddressSearchProps {
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function AddressSearch({ onSelect, placeholder = 'Search for an address...', className }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/maps/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.data || []);
      setIsOpen(true);
    } catch {
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      // Debounce search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        searchAddresses(value);
      }, 300);
    },
    [searchAddresses]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setQuery(result.formatted_address);
      setIsOpen(false);
      onSelect(result);
    },
    [onSelect]
  );

  const handleCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `/api/maps/reverse-geocode?lat=${latitude}&lng=${longitude}`
          );
          if (!res.ok) throw new Error('Reverse geocoding failed');
          const data = await res.json();

          onSelect({
            address: data.data.formatted_address,
            latitude,
            longitude,
            formatted_address: data.data.formatted_address,
            components: data.data.components,
          });
        } catch {
          // Use coordinates even if reverse geocoding fails
          onSelect({
            address: `${latitude}, ${longitude}`,
            latitude,
            longitude,
            formatted_address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            components: {},
          });
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setError('Location access denied. Please search manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onSelect]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-embee-slate"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 border border-embee-slate/20 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-embee-blue placeholder-embee-slate/50"
          aria-label="Search address"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="address-search-results"
          role="combobox"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-5 w-5 animate-spin text-embee-slate" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Current location button */}
      <button
        type="button"
        onClick={handleCurrentLocation}
        disabled={locationLoading}
        className="mt-2 flex items-center gap-2 text-sm text-embee-blue hover:text-embee-blue/80 transition-colors disabled:opacity-50 touch-target"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
        {locationLoading ? 'Getting location...' : 'Use my current location'}
      </button>

      {/* Error */}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}

      {/* Search results */}
      {isOpen && results.length > 0 && (
        <ul
          id="address-search-results"
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-white border border-embee-slate/20 rounded-lg shadow-embee-lg max-h-60 overflow-y-auto"
        >
          {results.map((result, index) => (
            <li
              key={index}
              role="option"
              aria-selected={false}
              onClick={() => handleSelect(result)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-embee-slate/5 transition-colors border-b border-embee-slate/10 last:border-0"
            >
              <svg className="h-5 w-5 text-embee-slate flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-medium text-embee-charcoal truncate">
                  {result.formatted_address}
                </p>
                {result.components.city && result.components.state && (
                  <p className="text-xs text-embee-slate">
                    {result.components.city}, {result.components.state}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results */}
      {isOpen && !loading && query.length >= 2 && results.length === 0 && !error && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-embee-slate/20 rounded-lg shadow-embee-lg p-4 text-center">
          <p className="text-sm text-embee-slate">No addresses found. Try a different search.</p>
        </div>
      )}
    </div>
  );
}
