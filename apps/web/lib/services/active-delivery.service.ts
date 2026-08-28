import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// =============================================
// Types
// =============================================

export interface DeliveryDetails {
  id: string;
  order_id: string;
  rider_id: string;
  assignment_status: string;
  order_status: string;
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
  rider_assigned_at?: string;
  rider_arrived_at_pickup?: string;
  rider_picked_up_at?: string;
  rider_arrived_at_destination?: string;
  delivered_at?: string;
  completed_at?: string;
}

export interface TransitionResult {
  success: boolean;
  message: string;
  new_status?: string;
}

export interface CompleteDeliveryResult {
  success: boolean;
  message: string;
  proof_id?: string;
}

// =============================================
// Service
// =============================================

export class ActiveDeliveryService {
  /**
   * Get the rider's current active delivery details.
   */
  async getActiveDelivery(riderId: string): Promise<DeliveryDetails | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('rider_assignments')
      .select(`
        id,
        order_id,
        rider_id,
        status,
        orders!inner (
          id,
          status,
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
          urgency_level,
          rider_assigned_at,
          rider_arrived_at_pickup,
          rider_picked_up_at,
          rider_arrived_at_destination,
          delivered_at,
          completed_at
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
      assignment_status: data.status,
      order_status: order?.status,
      order_number: order?.order_number,
      pickup_latitude: order?.pickup_latitude,
      pickup_longitude: order?.pickup_longitude,
      pickup_contact_name: order?.pickup_contact_name,
      pickup_contact_phone: order?.pickup_contact_phone,
      pickup_instructions: order?.pickup_instructions,
      destination_latitude: order?.destination_latitude,
      destination_longitude: order?.destination_longitude,
      recipient_name: order?.recipient_name,
      recipient_phone: order?.recipient_phone,
      delivery_instructions: order?.delivery_instructions,
      distance_km: order?.distance_km,
      estimated_duration_minutes: order?.estimated_duration_minutes,
      package_description: order?.package_description,
      urgency_level: order?.urgency_level,
      rider_assigned_at: order?.rider_assigned_at,
      rider_arrived_at_pickup: order?.rider_arrived_at_pickup,
      rider_picked_up_at: order?.rider_picked_up_at,
      rider_arrived_at_destination: order?.rider_arrived_at_destination,
      delivered_at: order?.delivered_at,
      completed_at: order?.completed_at,
    };
  }

  /**
   * Transition order status through the authoritative transition function.
   */
  async transitionStatus(
    orderId: string,
    targetStatus: string,
    actorType: string = 'rider',
    cancellationReason?: string
  ): Promise<TransitionResult> {
    const serviceRole = await createServiceRoleClient();

    logger.info('delivery.transitioning', { order_id: orderId, target_status: targetStatus, actor_type: actorType });

    const { data, error } = await serviceRole.rpc('transition_order_status', {
      p_order_id: orderId,
      p_target_status: targetStatus,
      p_actor_type: actorType,
      p_cancellation_reason: cancellationReason || null,
    });

    if (error) {
      logger.error('delivery.transition_failed', { order_id: orderId, target_status: targetStatus }, error instanceof Error ? error : undefined);
      return { success: false, message: `Transition failed: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'No result from transition function' };
    }

    const result = data[0];
    logger.info('delivery.transition_result', { order_id: orderId, success: result.success, message: result.message });

    return {
      success: result.success,
      message: result.message,
      new_status: result.new_status,
    };
  }

  /**
   * Complete delivery with proof of delivery.
   */
  async completeDelivery(
    orderId: string,
    proofType: string,
    fileUrl?: string,
    recipientName?: string,
    notes?: string,
    proofLatitude?: number,
    proofLongitude?: number
  ): Promise<CompleteDeliveryResult> {
    const serviceRole = await createServiceRoleClient();

    logger.info('delivery.completing', { order_id: orderId });

    const { data, error } = await serviceRole.rpc('complete_delivery', {
      p_order_id: orderId,
      p_proof_type: proofType,
      p_file_url: fileUrl || null,
      p_recipient_name: recipientName || null,
      p_notes: notes || null,
      p_proof_latitude: proofLatitude || null,
      p_proof_longitude: proofLongitude || null,
    });

    if (error) {
      logger.error('delivery.complete_failed', { order_id: orderId }, error instanceof Error ? error : undefined);
      return { success: false, message: `Complete delivery failed: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'No result from complete_delivery function' };
    }

    const result = data[0];
    logger.info('delivery.complete_result', { order_id: orderId, success: result.success });

    return {
      success: result.success,
      message: result.message,
      proof_id: result.proof_id,
    };
  }

  /**
   * Cancel an order.
   */
  async cancelOrder(
    orderId: string,
    actorType: string,
    reason?: string
  ): Promise<TransitionResult> {
    const serviceRole = await createServiceRoleClient();

    logger.info('delivery.cancelling', { order_id: orderId, actor_type: actorType });

    const { data, error } = await serviceRole.rpc('cancel_order', {
      p_order_id: orderId,
      p_actor_type: actorType,
      p_reason: reason || null,
    });

    if (error) {
      logger.error('delivery.cancel_failed', { order_id: orderId }, error instanceof Error ? error : undefined);
      return { success: false, message: `Cancel failed: ${error.message}` };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'No result from cancel_order function' };
    }

    const result = data[0];
    logger.info('delivery.cancel_result', { order_id: orderId, success: result.success });

    return {
      success: result.success,
      message: result.message,
    };
  }
}

export const activeDeliveryService = new ActiveDeliveryService();
