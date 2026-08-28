import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/orders/[id]/rating
 * Customer rates rider after delivery completion.
 *
 * Authentication: Required (customer session)
 * Authorization: auth.uid() must equal orders.customer_id
 * Validation: rating 1-5, order must be delivered/completed
 * Idempotency: UNIQUE(order_id, customer_id) prevents duplicates
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { rating, comment } = body;

    // Validate rating
    if (rating === undefined || rating === null) {
      return NextResponse.json({ error: 'Rating is required' }, { status: 400 });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5' }, { status: 400 });
    }

    // Validate comment length if provided
    if (comment !== undefined && comment !== null && typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json({ error: 'Comment must be 500 characters or less' }, { status: 400 });
    }

    const serviceRole = await createServiceRoleClient();

    // Verify order exists and belongs to customer
    const { data: order, error: orderError } = await serviceRole
      .from('orders')
      .select('id, customer_id, assigned_rider_id, status')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.customer_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify order is eligible for rating
    if (!['delivered', 'completed'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Order must be delivered or completed before rating' },
        { status: 400 }
      );
    }

    // Verify rider is assigned
    if (!order.assigned_rider_id) {
      return NextResponse.json(
        { error: 'No rider assigned to this order' },
        { status: 400 }
      );
    }

    // Check for existing rating (idempotency)
    const { data: existingRating } = await serviceRole
      .from('ratings')
      .select('id')
      .eq('order_id', id)
      .eq('customer_id', user.id)
      .single();

    if (existingRating) {
      return NextResponse.json(
        { error: 'You have already rated this order' },
        { status: 409 }
      );
    }

    // Insert rating (trigger handles rider_profiles.rating update)
    const { data: newRating, error: insertError } = await serviceRole
      .from('ratings')
      .insert({
        order_id: id,
        customer_id: user.id,
        rider_id: order.assigned_rider_id,
        rating: ratingNum,
        comment: comment || null,
      })
      .select('id')
      .single();

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already rated this order' },
          { status: 409 }
        );
      }
      logger.error('rating.insert_failed', {}, insertError instanceof Error ? insertError : undefined);
      return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        success: true,
        message: 'Rating submitted successfully',
        rating_id: newRating.id,
      },
    });
  } catch (error) {
    logger.error('[RATING] Error', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/orders/[id]/rating
 * Check if customer has already rated this order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceRole = await createServiceRoleClient();

    // Verify order belongs to customer
    const { data: order } = await serviceRole
      .from('orders')
      .select('id, customer_id')
      .eq('id', id)
      .single();

    if (!order || order.customer_id !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get existing rating
    const { data: rating } = await serviceRole
      .from('ratings')
      .select('id, rating, comment, created_at')
      .eq('order_id', id)
      .eq('customer_id', user.id)
      .single();

    if (!rating) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: rating });
  } catch (error) {
    logger.error('[RATING] Error fetching rating', {}, error instanceof Error ? error : undefined);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
