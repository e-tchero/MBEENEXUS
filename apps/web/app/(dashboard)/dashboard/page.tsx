'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookingForm } from '@/components/booking/booking-form';
import { QuoteDisplay } from '@/components/booking/quote-display';
import type { Address, DeliveryCategory } from '@repo/shared/types';

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

export default function DashboardPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [categories, setCategories] = useState<DeliveryCategory[]>([]);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [selectedPickup] = useState('');
  const [selectedDestination] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [addrRes, catRes] = await Promise.all([
          fetch('/api/addresses'),
          fetch('/api/categories'),
        ]);

        if (addrRes.ok) {
          const addrData = await addrRes.json();
          setAddresses(addrData.data || []);
        }

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.data || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleQuoteGenerated = (newQuote: QuoteData) => {
    setQuote(newQuote);
  };

  const handleConfirmOrder = async (paymentMethod: 'card' | 'bank_transfer' | 'ussd') => {
    if (!quote) return;

    try {
      // Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quote.id,
          pickup_address_id: selectedPickup,
          pickup_contact_name: 'Customer',
          pickup_contact_phone: '08012345678',
          destination_address_id: selectedDestination,
          recipient_name: 'Recipient',
          recipient_phone: '08087654321',
          payment_method: paymentMethod,
        }),
      });

      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        const orderId = orderData.data.order.id;

        // Initialize payment
        const paymentResponse = await fetch('/api/payments/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: orderId,
            payment_method: paymentMethod,
          }),
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          // Redirect to Paystack
          window.location.href = paymentData.data.authorization_url;
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to MBEENEXUS</h2>
        <p className="text-gray-600 mb-4">
          To get started, please add at least one address.
        </p>
        <Link
          href="/addresses"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          Add Your First Address
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <BookingForm
          addresses={addresses}
          categories={categories}
          onQuoteGenerated={handleQuoteGenerated}
        />
      </div>
      <div>
        {quote ? (
          <QuoteDisplay
            quote={quote}
            addresses={addresses}
            pickupAddressId={selectedPickup}
            destinationAddressId={selectedDestination}
            onConfirm={handleConfirmOrder}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500">
              Fill in the delivery details to get a quote.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
