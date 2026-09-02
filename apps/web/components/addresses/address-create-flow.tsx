'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { AddressSearch } from './address-search';
import { LocationPicker } from './location-picker';
import { useToast } from '@/components/ui/toast';

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

interface AddressCreateFlowProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 'search' | 'confirm' | 'details';

const STEPS = [
  { key: 'search', label: 'Find Location' },
  { key: 'confirm', label: 'Confirm on Map' },
  { key: 'details', label: 'Address Details' },
];

export function AddressCreateFlow({ onSuccess, onCancel }: AddressCreateFlowProps) {
  const [step, setStep] = useState<Step>('search');
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [latitude, setLatitude] = useState(9.0579); // Default: Abuja
  const [longitude, setLongitude] = useState(7.4951);
  const [form, setForm] = useState({
    label: '',
    street_address: '',
    city: '',
    state: '',
    landmark: '',
    delivery_instructions: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearchSelect = useCallback((result: SearchResult) => {
    setSelectedLocation(result);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setForm({
      label: '',
      street_address: result.components.street || result.formatted_address,
      city: result.components.city || '',
      state: result.components.state || '',
      landmark: '',
      delivery_instructions: '',
    });
    setStep('confirm');
  }, []);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  }, []);

  const handleConfirmLocation = useCallback(() => {
    setStep('details');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.street_address.trim()) {
      setError('Street address is required');
      return;
    }
    if (!form.city.trim()) {
      setError('City is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: form.label || undefined,
          street_address: form.street_address,
          city: form.city,
          state: form.state,
          country: 'Nigeria',
          latitude,
          longitude,
          landmark: form.landmark || undefined,
          delivery_instructions: form.delivery_instructions || undefined,
        }),
      });

      if (response.ok) {
        toast({ variant: 'success', title: 'Address saved successfully' });
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save address');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, latitude, longitude, onSuccess, toast]);

  return (
    <div className="max-w-lg mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {STEPS.map((s, index) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                step === s.key
                  ? 'bg-embee-blue text-white'
                  : STEPS.findIndex((x) => x.key === step) > index
                  ? 'bg-embee-blue/20 text-embee-blue'
                  : 'bg-embee-slate/10 text-embee-slate'
              )}
              aria-current={step === s.key ? 'step' : undefined}
            >
              {STEPS.findIndex((x) => x.key === step) > index ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className={cn(
              'text-xs font-medium hidden sm:inline',
              step === s.key ? 'text-embee-charcoal' : 'text-embee-slate'
            )}>
              {s.label}
            </span>
            {index < STEPS.length - 1 && (
              <div className={cn(
                'w-8 h-0.5 mx-1',
                STEPS.findIndex((x) => x.key === step) > index
                  ? 'bg-embee-blue/20'
                  : 'bg-embee-slate/10'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Search */}
      {step === 'search' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-embee-charcoal mb-1">Find your location</h3>
            <p className="text-sm text-embee-slate">Search for an address or use your current location.</p>
          </div>
          <AddressSearch
            onSelect={handleSearchSelect}
            placeholder="Search for an address (e.g., Shoprite Wuse 2, Abuja)"
          />
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-sm text-embee-slate hover:text-embee-charcoal transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Step 2: Confirm on map */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-embee-charcoal mb-1">Confirm location</h3>
            <p className="text-sm text-embee-slate">Drag the pin or tap the map to adjust.</p>
          </div>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
          />
          {selectedLocation && (
            <p className="text-sm text-embee-slate text-center">
              {selectedLocation.formatted_address}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('search')}
              className="flex-1 py-2 px-4 border border-embee-slate/20 rounded-lg text-sm font-medium text-embee-charcoal hover:bg-embee-white transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="flex-1 py-2 px-4 bg-embee-blue text-white rounded-lg text-sm font-medium hover:bg-embee-blue/90 transition-colors"
            >
              Confirm Location
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Address details */}
      {step === 'details' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-embee-charcoal mb-1">Address details</h3>
            <p className="text-sm text-embee-slate">Add useful delivery information.</p>
          </div>

          {/* Label */}
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-embee-charcoal mb-1">
              Label
            </label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setForm({ ...form, label: l })}
                  className={cn(
                    'px-4 py-2 border rounded-lg text-sm font-medium transition-colors',
                    form.label === l
                      ? 'bg-embee-blue/10 border-embee-blue text-embee-blue'
                      : 'bg-white border-embee-slate/20 text-embee-charcoal hover:bg-embee-white'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Street address */}
          <div>
            <label htmlFor="street_address" className="block text-sm font-medium text-embee-charcoal mb-1">
              Street Address *
            </label>
            <input
              type="text"
              id="street_address"
              required
              value={form.street_address}
              onChange={(e) => setForm({ ...form, street_address: e.target.value })}
              className="w-full px-3 py-2 border border-embee-slate/20 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-embee-blue"
            />
          </div>

          {/* City & State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-embee-charcoal mb-1">
                City *
              </label>
              <input
                type="text"
                id="city"
                required
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-embee-slate/20 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-embee-blue"
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-embee-charcoal mb-1">
                State
              </label>
              <input
                type="text"
                id="state"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-embee-slate/20 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-embee-blue"
              />
            </div>
          </div>

          {/* Landmark */}
          <div>
            <label htmlFor="landmark" className="block text-sm font-medium text-embee-charcoal mb-1">
              Landmark <span className="text-embee-slate">(optional)</span>
            </label>
            <input
              type="text"
              id="landmark"
              value={form.landmark}
              onChange={(e) => setForm({ ...form, landmark: e.target.value })}
              placeholder="e.g., Near Shoprite, Opposite mosque"
              className="w-full px-3 py-2 border border-embee-slate/20 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-embee-blue placeholder-embee-slate/50"
            />
          </div>

          {/* Delivery instructions */}
          <div>
            <label htmlFor="delivery_instructions" className="block text-sm font-medium text-embee-charcoal mb-1">
              Delivery Instructions <span className="text-embee-slate">(optional)</span>
            </label>
            <textarea
              id="delivery_instructions"
              rows={2}
              value={form.delivery_instructions}
              onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })}
              placeholder="e.g., Call when at the gate, 3rd floor"
              className="w-full px-3 py-2 border border-embee-slate/20 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-embee-blue focus:border-embee-blue placeholder-embee-slate/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep('confirm')}
              className="flex-1 py-2 px-4 border border-embee-slate/20 rounded-lg text-sm font-medium text-embee-charcoal hover:bg-embee-white transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2 px-4 bg-embee-blue text-white rounded-lg text-sm font-medium hover:bg-embee-blue/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
