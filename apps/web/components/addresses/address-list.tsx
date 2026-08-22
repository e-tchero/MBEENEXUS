'use client';

import { useState } from 'react';
import type { Address } from '@repo/shared/types';

interface AddressListProps {
  addresses: Address[];
}

export function AddressList({ addresses }: AddressListProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSetDefault = async (addressId: string) => {
    setLoading(addressId);
    try {
      await fetch(`/api/addresses/${addressId}/default`, {
        method: 'PATCH',
      });
      window.location.reload();
    } catch (error) {
      console.error('Error setting default:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    setLoading(addressId);
    try {
      const response = await fetch(`/api/addresses/${addressId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete address');
      }
    } catch (error) {
      console.error('Error deleting address:', error);
    } finally {
      setLoading(null);
    }
  };

  if (addresses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No addresses saved yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Add your first address to get started with deliveries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <div
          key={address.id}
          className="bg-white shadow rounded-lg p-4 flex justify-between items-start"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">
                {address.label || 'Address'}
              </h3>
              {address.is_default && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{address.street_address}</p>
            <p className="text-sm text-gray-500">
              {address.city}, {address.state}, {address.country}
            </p>
            {address.postal_code && (
              <p className="text-sm text-gray-500">Postal Code: {address.postal_code}</p>
            )}
          </div>
          <div className="flex gap-2">
            {!address.is_default && (
              <button
                onClick={() => handleSetDefault(address.id)}
                disabled={loading === address.id}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Set as default
              </button>
            )}
            <button
              onClick={() => handleDelete(address.id)}
              disabled={loading === address.id}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
