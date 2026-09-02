'use client';
import { logger } from '@/lib/logger';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookingForm } from '@/components/booking/booking-form';
import { QuoteDisplay } from '@/components/booking/quote-display';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useToast } from '@/components/ui/toast';
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
  const { toast } = useToast();

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
        logger.error('dashboard.data_load_failed', {}, error instanceof Error ? error : undefined);
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
      logger.error('dashboard.order_create_failed', {}, error instanceof Error ? error : undefined);
      toast({ variant: 'error', title: 'Failed to create order' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <EmptyState
        title="Welcome to Embee Nexus"
        description="To get started, please add at least one address."
        action={
          <Link
            href="/addresses"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-embee-blue text-white text-sm font-medium rounded-lg hover:bg-embee-blue/90 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Your First Address
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-embee-charcoal mb-6">New Delivery</h1>
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
            <div className="bg-white rounded-lg shadow-embee-sm p-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-xl bg-embee-blue/10">
                <svg className="h-6 w-6 text-embee-blue" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                </svg>
              </div>
              <p className="text-embee-slate text-sm">
                Fill in the delivery details to get a quote.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
