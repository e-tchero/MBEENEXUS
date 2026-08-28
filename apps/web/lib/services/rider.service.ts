import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { RiderProfile, Vehicle, VehicleType } from '@repo/shared/types';

// =============================================
// Rider Profile
// =============================================

export interface RegisterRiderInput {
  full_name: string;
  phone?: string;
  vehicle_type: VehicleType;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_registration_number?: string;
}

export class RiderService {
  /**
   * Register a rider after signup.
   * Creates rider profile and initial vehicle.
   */
  async register(userId: string, input: RegisterRiderInput): Promise<{
    rider_profile: RiderProfile;
    vehicle: Vehicle;
  }> {
    const serviceRole = await createServiceRoleClient();

    // 1. Update profile with rider role and phone
    const { error: profileError } = await serviceRole
      .from('profiles')
      .update({
        role: 'rider',
        full_name: input.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      logger.error('rider.profile_update_failed', { rider_id: userId }, profileError instanceof Error ? profileError : undefined);
      throw new Error('Failed to update profile');
    }

    // 2. Create rider profile
    const { data: riderProfile, error: riderError } = await serviceRole
      .from('rider_profiles')
      .upsert({
        id: userId,
        verification_status: 'pending',
        is_available: false,
      })
      .select()
      .single();

    if (riderError) {
      logger.error('rider.profile_create_failed', { rider_id: userId }, riderError instanceof Error ? riderError : undefined);
      throw new Error('Failed to create rider profile');
    }

    // 3. Create vehicle
    const { data: vehicle, error: vehicleError } = await serviceRole
      .from('vehicles')
      .insert({
        rider_id: userId,
        vehicle_type: input.vehicle_type,
        make: input.vehicle_make || null,
        model: input.vehicle_model || null,
        year: input.vehicle_year || null,
        registration_number: input.vehicle_registration_number || null,
      })
      .select()
      .single();

    if (vehicleError) {
      logger.error('rider.vehicle_create_failed', { rider_id: userId }, vehicleError instanceof Error ? vehicleError : undefined);
      throw new Error('Failed to create vehicle');
    }

    // 4. Record verification history
    await serviceRole.from('rider_verification_history').insert({
      rider_id: userId,
      old_status: null,
      new_status: 'pending',
      changed_by: userId,
      reason: 'Rider registration',
    });

    return {
      rider_profile: riderProfile,
      vehicle,
    };
  }

  /**
   * Get rider profile with profile data.
   */
  async getProfile(userId: string): Promise<RiderProfile | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rider_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Update rider profile.
   */
  async updateProfile(userId: string, input: { is_available?: boolean }): Promise<RiderProfile> {
    const serviceRole = await createServiceRoleClient();

    // Verify rider is approved before going online
    if (input.is_available === true) {
      const { data: profile } = await serviceRole
        .from('rider_profiles')
        .select('verification_status')
        .eq('id', userId)
        .single();

      if (profile?.verification_status !== 'approved') {
        throw new Error('Rider must be approved before going online');
      }
    }

    const { data, error } = await serviceRole
      .from('rider_profiles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('rider.profile_update_failed', { rider_id: userId }, error instanceof Error ? error : undefined);
      throw error;
    }
    return data;
  }

  // =============================================
  // Vehicles
  // =============================================

  async listVehicles(userId: string): Promise<Vehicle[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('rider_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createVehicle(userId: string, input: {
    vehicle_type: VehicleType;
    make?: string;
    model?: string;
    year?: number;
    registration_number?: string;
    insurance_expiry?: string;
  }): Promise<Vehicle> {
    const serviceRole = await createServiceRoleClient();

    const { data, error } = await serviceRole
      .from('vehicles')
      .insert({
        rider_id: userId,
        vehicle_type: input.vehicle_type,
        make: input.make || null,
        model: input.model || null,
        year: input.year || null,
        registration_number: input.registration_number || null,
        insurance_expiry: input.insurance_expiry || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('rider.vehicle_create_failed', { rider_id: userId }, error instanceof Error ? error : undefined);
      throw error;
    }
    return data;
  }

  async updateVehicle(userId: string, vehicleId: string, input: Partial<{
    vehicle_type: VehicleType;
    make: string;
    model: string;
    year: number;
    registration_number: string;
    insurance_expiry: string;
    is_active: boolean;
  }>): Promise<Vehicle> {
    const serviceRole = await createServiceRoleClient();

    const { data, error } = await serviceRole
      .from('vehicles')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId)
      .eq('rider_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('rider.vehicle_update_failed', { rider_id: userId, vehicle_id: vehicleId }, error instanceof Error ? error : undefined);
      throw error;
    }
    return data;
  }

  // =============================================
  // Documents
  // =============================================

  async listDocuments(userId: string): Promise<Array<{
    id: string;
    document_type: string;
    file_name: string;
    status: string;
    rejection_reason: string | null;
    reviewed_at: string | null;
    created_at: string;
  }>> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rider_documents')
      .select('id, document_type, file_name, status, rejection_reason, reviewed_at, created_at')
      .eq('rider_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async submitDocument(userId: string, input: {
    document_type: string;
    file_url: string;
    file_name: string;
    mime_type: string;
  }): Promise<{ id: string }> {
    const serviceRole = await createServiceRoleClient();

    // Check if this document type is already pending/approved
    const { data: existing } = await serviceRole
      .from('rider_documents')
      .select('id, status')
      .eq('rider_id', userId)
      .eq('document_type', input.document_type)
      .in('status', ['pending', 'approved'])
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error(`Document of type '${input.document_type}' already exists with status '${existing[0].status}'`);
    }

    const { data, error } = await serviceRole
      .from('rider_documents')
      .insert({
        rider_id: userId,
        document_type: input.document_type,
        file_url: input.file_url,
        file_name: input.file_name,
        mime_type: input.mime_type,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('rider.document_submit_failed', { rider_id: userId }, error instanceof Error ? error : undefined);
      throw error;
    }

    // Update rider verification status to under_review if currently pending or rejected
    await serviceRole
      .from('rider_profiles')
      .update({
        verification_status: 'under_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .in('verification_status', ['pending', 'rejected']);

    return data;
  }

  // =============================================
  // Verification Status
  // =============================================

  async getVerificationStatus(userId: string): Promise<{
    verification_status: string;
    verification_notes: string | null;
    documents: Array<{
      document_type: string;
      status: string;
      rejection_reason: string | null;
    }>;
  }> {
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from('rider_profiles')
      .select('verification_status, verification_notes')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const { data: documents } = await supabase
      .from('rider_documents')
      .select('document_type, status, rejection_reason')
      .eq('rider_id', userId);

    return {
      verification_status: profile.verification_status,
      verification_notes: profile.verification_notes,
      documents: documents || [],
    };
  }
}

export const riderService = new RiderService();
