'use client';

import { useState } from 'react';

interface QuoteDisplayProps {
  quote: {
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
  };
  addresses: Array<{ id: string; label?: string | null; street_address: string; city: string }>;
  pickupAddressId: string;
  destinationAddressId: string;
  onConfirm: (paymentMethod: 'card' | 'bank_transfer' | 'ussd') => void;
}

export function QuoteDisplay({
  quote,
  addresses,
  pickupAddressId,
  destinationAddressId,
  onConfirm,
}: QuoteDisplayProps) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank_transfer' | 'ussd'>('card');

  const pickupAddress = addresses.find((a) => a.id === pickupAddressId);
  const destinationAddress = addresses.find((a) => a.id === destinationAddressId);

  const deliveryFare = quote.base_fee + quote.distance_fee + quote.weight_fee + quote.urgency_fee;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(paymentMethod);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Quote</h2>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-green-600 text-sm">A</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pickup</p>
            <p className="text-sm font-medium text-gray-900">
              {pickupAddress?.label ? `${pickupAddress.label}: ` : ''}
              {pickupAddress?.street_address}, {pickupAddress?.city}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-600 text-sm">B</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">Destination</p>
            <p className="text-sm font-medium text-gray-900">
              {destinationAddress?.label ? `${destinationAddress.label}: ` : ''}
              {destinationAddress?.street_address}, {destinationAddress?.city}
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>{quote.distance_km.toFixed(1)} km • {quote.estimated_duration_minutes} min estimated</p>
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Base fare</span>
          <span>₦{quote.base_fee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Distance ({quote.distance_km.toFixed(1)} km)</span>
          <span>₦{quote.distance_fee.toLocaleString()}</span>
        </div>
        {quote.weight_fee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Weight surcharge</span>
            <span>₦{quote.weight_fee.toLocaleString()}</span>
          </div>
        )}
        {quote.urgency_fee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Priority delivery</span>
            <span>₦{quote.urgency_fee.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t pt-2">
          <span className="text-gray-600">Delivery fare</span>
          <span className="font-medium">₦{deliveryFare.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">VAT (7.5%)</span>
          <span>₦{quote.tax_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold border-t pt-2">
          <span>Total</span>
          <span>₦{quote.total_amount.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['card', 'bank_transfer', 'ussd'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`py-2 px-4 border rounded-md text-sm font-medium ${
                paymentMethod === method
                  ? 'bg-primary-50 border-primary-500 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {method === 'card' ? 'Card' : method === 'bank_transfer' ? 'Bank Transfer' : 'USSD'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading}
        className="mt-6 w-full bg-primary-600 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Confirm & Pay'}
      </button>

      <p className="mt-2 text-xs text-center text-gray-500">
        Quote valid for 5 minutes
      </p>
    </div>
  );
}
