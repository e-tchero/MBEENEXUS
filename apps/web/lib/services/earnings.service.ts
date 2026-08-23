import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// =============================================
// Types
// =============================================

export interface EarningsEntry {
  id: string;
  order_id: string;
  order_number?: string;
  credit: number;
  debit: number;
  balance_after: number;
  description: string;
  reference_type: string;
  reference_id: string | null;
  created_at: string;
}

export interface EarningsHistoryResponse {
  earnings: EarningsEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface EarningsSummaryResponse {
  total_earnings: number;
  total_deliveries: number;
  pending_payout: number;
  paid_out: number;
  currency: string;
}

// =============================================
// Service
// =============================================

export class EarningsService {
  /**
   * Get rider's earnings history with pagination.
   */
  async getEarningsHistory(
    riderId: string,
    page: number = 1,
    limit: number = 20,
    referenceType?: string
  ): Promise<EarningsHistoryResponse> {
    const supabase = await createClient();

    // Validate limits
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;

    // Build query
    let query = supabase
      .from('earnings_ledger')
      .select(`
        id,
        order_id,
        credit,
        debit,
        balance_after,
        description,
        reference_type,
        reference_id,
        created_at,
        orders!inner (
          order_number
        )
      `)
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false })
      .range(offset, offset + safeLimit - 1);

    // Apply filter if specified
    if (referenceType) {
      query = query.eq('reference_type', referenceType);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch earnings: ${error.message}`);
    }

    // Get total count for pagination
    let totalCount = count;
    if (totalCount === null) {
      const { count: total } = await supabase
        .from('earnings_ledger')
        .select('*', { count: 'exact', head: true })
        .eq('rider_id', riderId)
        .eq('reference_type', referenceType || 'delivery');

      totalCount = total || 0;
    }

    // Transform data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const earnings: EarningsEntry[] = (data || []).map((entry: any) => ({
      id: entry.id,
      order_id: entry.order_id,
      order_number: entry.orders?.order_number,
      credit: parseFloat(entry.credit),
      debit: parseFloat(entry.debit),
      balance_after: parseFloat(entry.balance_after),
      description: entry.description,
      reference_type: entry.reference_type,
      reference_id: entry.reference_id,
      created_at: entry.created_at,
    }));

    return {
      earnings,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / safeLimit),
      },
    };
  }

  /**
   * Get rider's earnings summary.
   */
  async getEarningsSummary(riderId: string): Promise<EarningsSummaryResponse> {
    const supabase = await createClient();

    // Get aggregated earnings
    const { data, error } = await supabase
      .from('earnings_ledger')
      .select('credit, debit, reference_type')
      .eq('rider_id', riderId);

    if (error) {
      throw new Error(`Failed to fetch earnings summary: ${error.message}`);
    }

    // Calculate totals
    let totalCredits = 0;
    let totalDebits = 0;
    let totalDeliveries = 0;

    for (const entry of data || []) {
      totalCredits += parseFloat(entry.credit);
      totalDebits += parseFloat(entry.debit);
      if (entry.reference_type === 'delivery') {
        totalDeliveries++;
      }
    }

    const totalEarnings = totalCredits - totalDebits;

    return {
      total_earnings: totalEarnings,
      total_deliveries: totalDeliveries,
      pending_payout: totalEarnings,
      paid_out: 0,
      currency: 'NGN',
    };
  }
}

export const earningsService = new EarningsService();
