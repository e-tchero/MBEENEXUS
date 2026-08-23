import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// =============================================
// Types
// =============================================

export interface RiderOffer {
  id: string;
  order_id: string;
  rider_id: string;
  status: string;
  offered_at: string;
  expires_at: string;
  // Order details
  order_number?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name?: string;
  pickup_instructions?: string;
  destination_latitude?: number;
  destination_longitude?: number;
  recipient_name?: string;
  recipient_phone?: string;
  delivery_instructions?: string;
  distance_km?: number;
  estimated_duration_minutes?: number;
  total_amount?: number;
  currency?: string;
  package_description?: string;
  package_weight_kg?: number;
  category_id?: string;
  urgency_level?: string;
}

export interface ActiveAssignment {
  id: string;
  order_id: string;
  rider_id: string;
  status: string;
  offered_at: string;
  responded_at: string | null;
  // Order details for navigation
  order_number?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  pickup_contact_name?: string;
  pickup_contact_phone?: string;
  pickup_instructions?: string;
  destination_latitude?: number;
  destination_longitude?: number;
  recipient_name?: string;
  recipient_phone?: string;
  delivery_instructions?: string;
  distance_km?: number;
  estimated_duration_minutes?: number;
  package_description?: string;
  urgency_level?: string;
}

// =============================================
// Service
// =============================================

export class RiderOfferService {
  /**
   * Get pending offers for a rider.
   * Returns offers with order details for the rider to decide.
   */
  async getPendingOffers(riderId: string): Promise<RiderOffer[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rider_assignments')
      .select(`
        id,
        order_id,
        rider_id,
        status,
        offered_at,
        expires_at,
        orders!inner (
          order_number,
          pickup_latitude,
          pickup_longitude,
          pickup_contact_name,
          pickup_instructions,
          destination_latitude,
          destination_longitude,
          recipient_name,
          recipient_phone,
          delivery_instructions,
          distance_km,
          estimated_duration_minutes,
          total_amount,
          currency,
          package_description,
          package_weight_kg,
          category_id,
          urgency_level
        )
      `)
      .eq('rider_id', riderId)
      .eq('status', 'offered')
      .gt('expires_at', new Date().toISOString())
      .order('offered_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch offers:', error);
      throw error;
    }

    return (data || []).map((row: Record<string, unknown>) => {
      const order = row.orders as Record<string, unknown> | null;
      return {
        id: row.id as string,
        order_id: row.order_id as string,
        rider_id: row.rider_id as string,
        status: row.status as string,
        offered_at: row.offered_at as string,
        expires_at: row.expires_at as string,
        order_number: order?.order_number as string,
        pickup_latitude: order?.pickup_latitude as number,
        pickup_longitude: order?.pickup_longitude as number,
        pickup_contact_name: order?.pickup_contact_name as string,
        pickup_instructions: order?.pickup_instructions as string,
        destination_latitude: order?.destination_latitude as number,
        destination_longitude: order?.destination_longitude as number,
        recipient_name: order?.recipient_name as string,
        recipient_phone: order?.recipient_phone as string,
        delivery_instructions: order?.delivery_instructions as string,
        distance_km: order?.distance_km as number,
        estimated_duration_minutes: order?.estimated_duration_minutes as number,
        total_amount: order?.total_amount as number,
        currency: order?.currency as string,
        package_description: order?.package_description as string,
        package_weight_kg: order?.package_weight_kg as number,
        category_id: order?.category_id as string,
        urgency_level: order?.urgency_level as string,
      };
    });
  }

  /**
   * Get offer details for a specific offer.
   */
  async getOfferDetails(assignmentId: string, riderId: string): Promise<RiderOffer | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rider_assignments')
      .select(`
        id,
        order_id,
        rider_id,
        status,
        offered_at,
        expires_at,
        orders!inner (
          order_number,
          pickup_latitude,
          pickup_longitude,
          pickup_contact_name,
          pickup_instructions,
          destination_latitude,
          destination_longitude,
          recipient_name,
          recipient_phone,
          delivery_instructions,
          distance_km,
          estimated_duration_minutes,
          total_amount,
          currency,
          package_description,
          package_weight_kg,
          category_id,
          urgency_level
        )
      `)
      .eq('id', assignmentId)
      .eq('rider_id', riderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = data.orders as any;
    return {
      id: data.id,
      order_id: data.order_id,
      rider_id: data.rider_id,
      status: data.status,
      offered_at: data.offered_at,
      expires_at: data.expires_at,
      order_number: order?.order_number as string,
      pickup_latitude: order?.pickup_latitude as number,
      pickup_longitude: order?.pickup_longitude as number,
      pickup_contact_name: order?.pickup_contact_name as string,
      pickup_instructions: order?.pickup_instructions as string,
      destination_latitude: order?.destination_latitude as number,
      destination_longitude: order?.destination_longitude as number,
      recipient_name: order?.recipient_name as string,
      recipient_phone: order?.recipient_phone as string,
      delivery_instructions: order?.delivery_instructions as string,
      distance_km: order?.distance_km as number,
      estimated_duration_minutes: order?.estimated_duration_minutes as number,
      total_amount: order?.total_amount as number,
      currency: order?.currency as string,
      package_description: order?.package_description as string,
      package_weight_kg: order?.package_weight_kg as number,
      category_id: order?.category_id as string,
      urgency_level: order?.urgency_level as string,
    };
  }

  /**
   * Accept a rider offer.
   * Invokes the existing accept_rider_offer() PostgreSQL function.
   */
  async acceptOffer(assignmentId: string, riderId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const serviceRole = await createServiceRoleClient();

    console.log(`[OFFER] Rider ${riderId} accepting offer ${assignmentId}`);

    const { data, error } = await serviceRole.rpc('accept_rider_offer', {
      p_assignment_id: assignmentId,
      p_rider_id: riderId,
    });

    if (error) {
      console.error(`[OFFER] Error accepting offer:`, error);
      return { success: false, message: `Failed to accept offer: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'No result from accept function' };
    }

    const result = data[0];

    if (result.success) {
      console.log(`[OFFER] Rider ${riderId} accepted offer ${assignmentId}`);

      // Record order event
      await serviceRole.from('order_events').insert({
        order_id: (await this.getAssignmentOrderId(assignmentId)) || '',
        event_type: 'rider_accepted',
        from_status: 'searching_rider',
        to_status: 'rider_assigned',
        actor_id: riderId,
        actor_type: 'rider',
        metadata: { assignment_id: assignmentId },
      });
    } else {
      console.log(`[OFFER] Rider ${riderId} failed to accept: ${result.message}`);
    }

    return { success: result.success, message: result.message };
  }

  /**
   * Reject a rider offer.
   * Invokes the existing reject_rider_offer() PostgreSQL function.
   */
  async rejectOffer(
    assignmentId: string,
    riderId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const serviceRole = await createServiceRoleClient();

    console.log(`[OFFER] Rider ${riderId} rejecting offer ${assignmentId}`);

    const { data, error } = await serviceRole.rpc('reject_rider_offer', {
      p_assignment_id: assignmentId,
      p_rider_id: riderId,
      p_reason: reason || null,
    });

    if (error) {
      console.error(`[OFFER] Error rejecting offer:`, error);
      return { success: false, message: `Failed to reject offer: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'No result from reject function' };
    }

    const result = data[0];

    if (result.success) {
      console.log(`[OFFER] Rider ${riderId} rejected offer ${assignmentId}`);

      // Record order event
      const orderId = await this.getAssignmentOrderId(assignmentId);
      if (orderId) {
        await serviceRole.from('order_events').insert({
          order_id: orderId,
          event_type: 'rider_rejected',
          from_status: 'searching_rider',
          to_status: 'searching_rider',
          actor_id: riderId,
          actor_type: 'rider',
          metadata: { assignment_id: assignmentId, reason },
        });
      }
    }

    return { success: result.success, message: result.message };
  }

  /**
   * Get the rider's current active assignment.
   */
  async getActiveAssignment(riderId: string): Promise<ActiveAssignment | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rider_assignments')
      .select(`
        id,
        order_id,
        rider_id,
        status,
        offered_at,
        responded_at,
        orders!inner (
          order_number,
          pickup_latitude,
          pickup_longitude,
          pickup_contact_name,
          pickup_contact_phone,
          pickup_instructions,
          destination_latitude,
          destination_longitude,
          recipient_name,
          recipient_phone,
          delivery_instructions,
          distance_km,
          estimated_duration_minutes,
          package_description,
          urgency_level
        )
      `)
      .eq('rider_id', riderId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = data.orders as any;
    return {
      id: data.id,
      order_id: data.order_id,
      rider_id: data.rider_id,
      status: data.status,
      offered_at: data.offered_at,
      responded_at: data.responded_at,
      order_number: order?.order_number as string,
      pickup_latitude: order?.pickup_latitude as number,
      pickup_longitude: order?.pickup_longitude as number,
      pickup_contact_name: order?.pickup_contact_name as string,
      pickup_contact_phone: order?.pickup_contact_phone as string,
      pickup_instructions: order?.pickup_instructions as string,
      destination_latitude: order?.destination_latitude as number,
      destination_longitude: order?.destination_longitude as number,
      recipient_name: order?.recipient_name as string,
      recipient_phone: order?.recipient_phone as string,
      delivery_instructions: order?.delivery_instructions as string,
      distance_km: order?.distance_km as number,
      estimated_duration_minutes: order?.estimated_duration_minutes as number,
      package_description: order?.package_description as string,
      urgency_level: order?.urgency_level as string,
    };
  }

  /**
   * Helper to get order_id from an assignment.
   */
  private async getAssignmentOrderId(assignmentId: string): Promise<string | null> {
    const serviceRole = await createServiceRoleClient();
    const { data } = await serviceRole
      .from('rider_assignments')
      .select('order_id')
      .eq('id', assignmentId)
      .single();

    return data?.order_id || null;
  }
}

export const riderOfferService = new RiderOfferService();
