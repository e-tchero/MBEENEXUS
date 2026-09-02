'use client';

import { useState } from 'react';
import { AddressCreateFlow } from './address-create-flow';

export function CreateAddressButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-embee-blue text-white text-sm font-medium rounded-lg hover:bg-embee-blue/90 transition-colors shadow-sm touch-target"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Address
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <div className="relative transform overflow-hidden rounded-xl bg-white px-6 py-6 text-left shadow-embee-xl transition-all sm:my-8 sm:w-full sm:max-w-lg animate-slide-up">
              <AddressCreateFlow
                onSuccess={() => {
                  setIsOpen(false);
                  window.location.reload();
                }}
                onCancel={() => setIsOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
