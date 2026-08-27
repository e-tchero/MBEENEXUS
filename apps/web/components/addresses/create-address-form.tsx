'use client';

import { useState } from 'react';

interface CreateAddressFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateAddressForm({ onSuccess, onCancel }: CreateAddressFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: '',
    street_address: '',
    city: 'Abuja',
    state: 'FCT',
    country: 'Nigeria',
    postal_code: '',
    latitude: 0,
    longitude: 0,
    is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          label: form.label || undefined,
          postal_code: form.postal_code || undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create address');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-lg font-medium text-embee-charcoal mb-4">Add New Address</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="label" className="block text-sm font-medium text-embee-charcoal">
            Label (optional)
          </label>
          <input
            type="text"
            id="label"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="e.g., Home, Office"
            className="mt-1 block w-full border border-embee-slate/20 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-embee-blue focus:border-embee-blue sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="street_address" className="block text-sm font-medium text-embee-charcoal">
            Street Address *
          </label>
          <input
            type="text"
            id="street_address"
            required
            value={form.street_address}
            onChange={(e) => setForm({ ...form, street_address: e.target.value })}
            className="mt-1 block w-full border border-embee-slate/20 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-embee-blue focus:border-embee-blue sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-embee-charcoal">
              City *
            </label>
            <input
              type="text"
              id="city"
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 block w-full border border-embee-slate/20 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-embee-blue focus:border-embee-blue sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-embee-charcoal">
              State *
            </label>
            <input
              type="text"
              id="state"
              required
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="mt-1 block w-full border border-embee-slate/20 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-embee-blue focus:border-embee-blue sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-embee-charcoal">
              Latitude *
            </label>
            <input
              type="number"
              id="latitude"
              required
              step="any"
              value={form.latitude || ''}
              onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full border border-embee-slate/20 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-embee-blue focus:border-embee-blue sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-embee-charcoal">
              Longitude *
            </label>
            <input
              type="number"
              id="longitude"
              required
              step="any"
              value={form.longitude || ''}
              onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
              className="mt-1 block w-full border border-embee-slate/20 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-embee-blue focus:border-embee-blue sm:text-sm"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="is_default"
            checked={form.is_default}
            onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            className="h-4 w-4 text-embee-blue focus:ring-embee-blue border-embee-slate/30 rounded"
          />
          <label htmlFor="is_default" className="ml-2 block text-sm text-embee-charcoal">
            Set as default address
          </label>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-white py-2 px-4 border border-embee-slate/20 rounded-md shadow-sm text-sm font-medium text-embee-charcoal hover:bg-embee-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-embee-blue"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-embee-blue py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-embee-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-embee-blue disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Address'}
        </button>
      </div>
    </form>
  );
}
