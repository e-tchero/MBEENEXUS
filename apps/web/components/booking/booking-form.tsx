'use client';

import { useState } from 'react';
import type { Address, DeliveryCategory } from '@repo/shared/types';

interface BookingFormProps {
  addresses: Address[];
  categories: DeliveryCategory[];
  onQuoteGenerated: (quote: QuoteData) => void;
}

interface QuoteData {
  id: string;
  total_amount: number;
  distance_km: number;
  estimated_duration_minutes: number;
  base_fee: number;
  distance_fee: number;
  weight_fee: number;
  urgency_fee: number;
  tax_amount: number;
  currency: string;
}

export function BookingForm({ addresses, categories, onQuoteGenerated }: BookingFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    pickup_address_id: '',
    destination_address_id: '',
    category_id: '',
    weight_kg: '',
    quantity: '1',
    urgency_level: 'standard' as 'standard' | 'express' | 'urgent',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const pickupAddress = addresses.find((a) => a.id === form.pickup_address_id);
      const destinationAddress = addresses.find((a) => a.id === form.destination_address_id);

      if (!pickupAddress || !destinationAddress) {
        throw new Error('Please select both pickup and destination addresses');
      }

      const response = await fetch('/api/orders/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_latitude: pickupAddress.latitude,
          pickup_longitude: pickupAddress.longitude,
          pickup_address_text: `${pickupAddress.street_address}, ${pickupAddress.city}, ${pickupAddress.state}`,
          destination_latitude: destinationAddress.latitude,
          destination_longitude: destinationAddress.longitude,
          destination_address_text: `${destinationAddress.street_address}, ${destinationAddress.city}, ${destinationAddress.state}`,
          category_id: form.category_id,
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
          quantity: parseInt(form.quantity),
          urgency_level: form.urgency_level,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onQuoteGenerated(data.data);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to generate quote');
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Create Delivery</h2>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pickup Address *
        </label>
        <select
          required
          value={form.pickup_address_id}
          onChange={(e) => setForm({ ...form, pickup_address_id: e.target.value })}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="">Select pickup address</option>
          {addresses.map((addr) => (
            <option key={addr.id} value={addr.id}>
              {addr.label ? `${addr.label}: ` : ''}
              {addr.street_address}, {addr.city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Destination Address *
        </label>
        <select
          required
          value={form.destination_address_id}
          onChange={(e) => setForm({ ...form, destination_address_id: e.target.value })}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="">Select destination address</option>
          {addresses.map((addr) => (
            <option key={addr.id} value={addr.id}>
              {addr.label ? `${addr.label}: ` : ''}
              {addr.street_address}, {addr.city}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Package Category *
        </label>
        <select
          required
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            placeholder="Optional"
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Urgency
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['standard', 'express', 'urgent'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm({ ...form, urgency_level: level })}
              className={`py-2 px-4 border rounded-md text-sm font-medium ${
                form.urgency_level === level
                  ? 'bg-primary-50 border-primary-500 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary-600 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {loading ? 'Calculating...' : 'Get Quote'}
      </button>
    </form>
  );
}
