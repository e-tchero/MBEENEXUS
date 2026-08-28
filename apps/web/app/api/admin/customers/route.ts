import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/customers
 * Admin customer list with pagination.
 *
 * Authentication: Required (admin session)
 * Authorization: Server-side admin role check
 * Returns: Paginated list of customers with order stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-side admin authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const search = url.searchParams.get('search')?.trim() || '';
    const offset = (page - 1) * limit;

    const serviceRole = await createServiceRoleClient();

    // Build query for customer profiles
    let query = serviceRole
      .from('profiles')
      .select('id, email, full_name, created_at', { count: 'exact' })
      .eq('role', 'customer');

    // Search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: customers, error: customerError, count } = await query;

    if (customerError) {
      logger.error('admin.customers.query_failed', {}, customerError instanceof Error ? customerError : undefined);
      return NextResponse.json(
        { error: 'Failed to fetch customers' },
        { status: 500 }
      );
    }

    // Get order counts and total spent for each customer
    const customerIds = (customers || []).map((c) => c.id);
    const orderStats: Record<string, { order_count: number; total_spent: number }> = {};

    if (customerIds.length > 0) {
      const { data: stats } = await serviceRole
        .from('orders')
        .select('customer_id')
        .in('customer_id', customerIds);

      // Calculate stats in application (Supabase doesn't support GROUP BY aggregations cleanly)
      if (stats) {
        for (const stat of stats) {
          if (!orderStats[stat.customer_id]) {
            orderStats[stat.customer_id] = { order_count: 0, total_spent: 0 };
          }
          orderStats[stat.customer_id].order_count++;
        }

        // Get total amounts
        const { data: amounts } = await serviceRole
          .from('orders')
          .select('customer_id, total_amount')
          .in('customer_id', customerIds)
          .eq('status', 'completed');

        if (amounts) {
          for (const amount of amounts) {
            if (orderStats[amount.customer_id]) {
              orderStats[amount.customer_id].total_spent += amount.total_amount || 0;
            }
          }
        }
      }
    }

    // Merge stats into customer data
    const enrichedCustomers = (customers || []).map((customer) => ({
      id: customer.id,
      email: customer.email,
      full_name: customer.full_name,
      created_at: customer.created_at,
      order_count: orderStats[customer.id]?.order_count || 0,
      total_spent: orderStats[customer.id]?.total_spent || 0,
    }));

    return NextResponse.json({
      data: enrichedCustomers,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error('admin.customers.error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
