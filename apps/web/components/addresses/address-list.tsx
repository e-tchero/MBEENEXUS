'use client';
import { logger } from '@/lib/logger';

import { useState, useCallback } from 'react';
import type { Address } from '@repo/shared/types';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { useToast } from '@/components/ui/toast';

interface AddressListProps {
  addresses: Address[];
}

export function AddressList({ addresses }: AddressListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { toast } = useToast();

  const handleSetDefault = useCallback(async (addressId: string) => {
    setLoading(addressId);
    try {
      await fetch(`/api/addresses/${addressId}/default`, {
        method: 'PATCH',
      });
      window.location.reload();
    } catch (error) {
      logger.error('address.set_default_failed', {}, error instanceof Error ? error : undefined);
      toast({ variant: 'error', title: 'Failed to set default address' });
    } finally {
      setLoading(null);
    }
  }, [toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/addresses/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ variant: 'success', title: 'Address deleted' });
        setDeleteTarget(null);
        window.location.reload();
      } else {
        const data = await response.json();
        toast({ variant: 'error', title: data.error || 'Failed to delete address' });
      }
    } catch (error) {
      logger.error('address.delete_failed', {}, error instanceof Error ? error : undefined);
      toast({ variant: 'error', title: 'Failed to delete address' });
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, toast]);

  if (addresses.length === 0) {
    return (
      <EmptyState
        title="No saved addresses"
        description="Add your first address to get started with deliveries."
        action={
          <a
            href="/addresses"
            className="inline-flex items-center px-4 py-2 bg-embee-blue text-white text-sm font-medium rounded-lg hover:bg-embee-blue/90 transition-colors"
          >
            Add Address
          </a>
        }
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {addresses.map((address) => (
          <div
            key={address.id}
            className="bg-white shadow-embee-sm rounded-lg p-4 flex justify-between items-start hover:shadow-embee-md transition-shadow"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-embee-charcoal">
                  {address.label || 'Address'}
                </h3>
                {address.is_default && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-embee-blue/10 text-embee-blue">
                    Default
                  </span>
                )}
              </div>
              <p className="text-sm text-embee-slate mt-1">{address.street_address}</p>
              <p className="text-sm text-embee-slate">
                {address.city}, {address.state}, {address.country}
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              {!address.is_default && (
                <button
                  onClick={() => handleSetDefault(address.id)}
                  disabled={loading === address.id}
                  className="text-sm text-embee-blue hover:text-embee-blue/80 transition-colors disabled:opacity-50 touch-target"
                >
                  Set default
                </button>
              )}
              <button
                onClick={() => setDeleteTarget(address)}
                disabled={loading === address.id}
                className="text-sm text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 touch-target"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete address?"
        description={`Are you sure you want to delete ${deleteTarget?.label || 'this address'}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </>
  );
}
