import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// =============================================
// Types
// =============================================

export interface RefundResult {
  success: boolean;
  message: string;
  refund_id?: string;
  paystack_refund_id?: string;
}

export interface RefundStatus {
  refund_id: string;
  order_id: string;
  amount: number;
  status: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

// =============================================
// Refund Service
// =============================================

export class RefundService {
  /**
   * Process a REFUND_PROCESS background job.
   * Calls the Paystack Refund API to execute the refund.
   *
   * Idempotent: checks refund status before processing.
   */
  async processRefundJob(payload: Record<string, unknown>): Promise<void> {
    const serviceRole = await createServiceRoleClient();

    const refundId = payload.refund_id as string;
    const orderId = payload.order_id as string;
    const paymentId = payload.payment_id as string;
    const amount = payload.amount as number;
    const paystackTransactionId = payload.paystack_transaction_id as string | null;
    const paystackReference = payload.paystack_reference as string | null;

    logger.info('refund.processing', { refund_id: refundId, order_id: orderId });

    // Lock the refund row and check status (idempotency)
    const { data: refund, error: refundError } = await serviceRole
      .from('refunds')
      .select('*')
      .eq('id', refundId)
      .single();

    if (refundError || !refund) {
      logger.error('refund.record_not_found', { refund_id: refundId });
      throw new Error(`Refund record not found: ${refundId}`);
    }

    // Idempotency: already processed
    if (refund.status === 'success') {
      logger.info('refund.already_succeeded', { refund_id: refundId });
      return;
    }

    // Idempotency: already failed permanently
    if (refund.status === 'failed') {
      logger.info('refund.already_failed', { refund_id: refundId });
      return;
    }

    // Mark as processing
    await serviceRole
      .from('refunds')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId)
      .eq('status', 'pending');

    // Determine what to use as the transaction identifier
    // Paystack accepts either a transaction ID (integer) or reference (string)
    const transactionIdentifier = paystackTransactionId || paystackReference;

    if (!transactionIdentifier) {
      logger.error('refund.no_transaction_id', { refund_id: refundId });
      await this.markRefundFailed(refundId, 'No Paystack transaction identifier available');
      return;
    }

    // Call Paystack Refund API
    try {
      const paystackResult = await this.callPaystackRefundAPI({
        transaction: transactionIdentifier,
        amount: Math.round(amount * 100), // Convert to kobo
        reason: refund.reason,
      });

      if (paystackResult.success) {
        // Refund accepted by Paystack (may be pending/processing on their end)
        await serviceRole
          .from('refunds')
          .update({
            status: 'success',
            paystack_refund_id: String(paystackResult.refund_id),
            metadata: {
              ...(refund.metadata || {}),
              paystack_response: paystackResult.data,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', refundId);

        // Update payment status
        await serviceRole
          .from('payments')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentId);

        // Update order status to refunded
        await serviceRole
          .from('orders')
          .update({
            status: 'refunded',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .in('status', ['cancelled']); // Only update if still cancelled

        // Record order event
        await serviceRole.from('order_events').insert({
          order_id: orderId,
          event_type: 'refund_completed',
          from_status: 'cancelled',
          to_status: 'refunded',
          actor_type: 'system',
          metadata: {
            refund_id: refundId,
            paystack_refund_id: String(paystackResult.refund_id),
            amount: amount,
          },
        });

        logger.info('refund.submitted_to_paystack', { refund_id: refundId });
      } else {
        // Paystack rejected the refund
        await this.markRefundFailed(refundId, paystackResult.message || 'Paystack refund failed');
        logger.error('refund.paystack_failed', { refund_id: refundId, message: paystackResult.message });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('refund.paystack_api_error', { refund_id: refundId }, error instanceof Error ? error : undefined);
      await this.markRefundFailed(refundId, `Paystack API error: ${errorMessage}`);
      throw error; // Re-throw to trigger job retry
    }
  }

  /**
   * Call the Paystack Refund API.
   */
  private async callPaystackRefundAPI(params: {
    transaction: string;
    amount: number;
    reason: string;
  }): Promise<{
    success: boolean;
    message?: string;
    refund_id?: number;
    data?: Record<string, unknown>;
  }> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return {
        success: false,
        message: 'PAYSTACK_SECRET_KEY not configured',
      };
    }

    // Determine if transaction is a numeric ID or a reference string
    const isNumericId = /^\d+$/.test(params.transaction);

    const body: Record<string, unknown> = {
      merchant_note: `Refund for order - ${params.reason}`,
    };

    if (isNumericId) {
      body.transaction = parseInt(params.transaction, 10);
    } else {
      body.transaction = params.transaction;
    }

    // Only include amount for partial refunds (omitting defaults to full refund)
    if (params.amount) {
      body.amount = params.amount;
    }

    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.status) {
      return {
        success: false,
        message: data.message || 'Paystack refund failed',
      };
    }

    return {
      success: true,
      refund_id: data.data?.id,
      data: data.data,
    };
  }

  /**
   * Mark a refund as failed.
   */
  private async markRefundFailed(refundId: string, errorMessage: string): Promise<void> {
    const serviceRole = await createServiceRoleClient();

    await serviceRole
      .from('refunds')
      .update({
        status: 'failed',
        metadata: {
          error: errorMessage,
          failed_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId);
  }

  /**
   * Get refund status for an order (customer-facing).
   */
  async getRefundByOrderId(orderId: string, customerId: string): Promise<RefundStatus | null> {
    const serviceRole = await createServiceRoleClient();

    // Verify order ownership
    const { data: order, error: orderError } = await serviceRole
      .from('orders')
      .select('id, customer_id')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .single();

    if (orderError || !order) {
      return null;
    }

    // Get refund
    const { data: refund, error: refundError } = await serviceRole
      .from('refunds')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (refundError || !refund) {
      return null;
    }

    return {
      refund_id: refund.id,
      order_id: refund.order_id,
      amount: parseFloat(refund.amount),
      status: refund.status,
      reason: refund.reason,
      created_at: refund.created_at,
      updated_at: refund.updated_at,
    };
  }
}

export const refundService = new RefundService();
