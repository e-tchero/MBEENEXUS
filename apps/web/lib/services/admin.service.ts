import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

// =============================================
// Admin Verification Service
// =============================================

export interface ListRidersFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface RiderListItem {
  id: string;
  full_name: string | null;
  phone: string | null;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
  documents: Array<{
    document_type: string;
    status: string;
  }>;
}

export interface RiderDetail {
  id: string;
  full_name: string | null;
  phone: string | null;
  verification_status: string;
  verification_notes: string | null;
  created_at: string;
  profile: {
    role: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  documents: Array<{
    id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    mime_type: string;
    status: string;
    rejection_reason: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
  }>;
  vehicle: {
    vehicle_type: string;
    make: string | null;
    model: string | null;
    year: number | null;
    registration_number: string | null;
  } | null;
  verification_history: Array<{
    id: string;
    old_status: string | null;
    new_status: string;
    changed_by: string;
    changed_by_name: string | null;
    reason: string | null;
    created_at: string;
  }>;
}

export class AdminService {
  /**
   * Verify the requesting user is an admin.
   * Returns the user ID if authorized, throws if not.
   */
  private async verifyAdminAuth(userId: string): Promise<void> {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new Error('Profile not found');
    }

    if (!['admin', 'super_admin'].includes(profile.role)) {
      throw new Error('Unauthorized: admin role required');
    }
  }

  /**
   * List riders with filtering and pagination.
   */
  async listRiders(
    adminUserId: string,
    filters: ListRidersFilters = {}
  ): Promise<{
    data: RiderListItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    await this.verifyAdminAuth(adminUserId);

    const serviceRole = await createServiceRoleClient();
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 50);
    const offset = (page - 1) * limit;

    // Build query
    let query = serviceRole
      .from('rider_profiles')
      .select(`
        id,
        verification_status,
        verification_notes,
        created_at,
        profiles!inner(full_name, phone),
        rider_documents(document_type, status)
      `, { count: 'exact' });

    // Filter by status if provided
    if (filters.status) {
      query = query.eq('verification_status', filters.status);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to list riders:', error);
      throw new Error('Failed to list riders');
    }

    // Transform data
    const riders: RiderListItem[] = (data || []).map((rider: any) => ({
      id: rider.id,
      full_name: rider.profiles?.full_name || null,
      phone: rider.profiles?.phone || null,
      verification_status: rider.verification_status,
      verification_notes: rider.verification_notes,
      created_at: rider.created_at,
      documents: rider.rider_documents || [],
    }));

    const total = count || 0;
    const total_pages = Math.ceil(total / limit);

    return {
      data: riders,
      pagination: {
        page,
        limit,
        total,
        total_pages,
      },
    };
  }

  /**
   * Get full rider detail for verification review.
   */
  async getRiderDetail(
    adminUserId: string,
    riderId: string
  ): Promise<RiderDetail> {
    await this.verifyAdminAuth(adminUserId);

    const serviceRole = await createServiceRoleClient();

    // Get rider profile
    const { data: rider, error: riderError } = await serviceRole
      .from('rider_profiles')
      .select(`
        id,
        verification_status,
        verification_notes,
        created_at,
        profiles!inner(role, full_name, avatar_url, phone)
      `)
      .eq('id', riderId)
      .single();

    if (riderError || !rider) {
      throw new Error('Rider not found');
    }

    // Get documents
    const { data: documents } = await serviceRole
      .from('rider_documents')
      .select('*')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false });

    // Get vehicle
    const { data: vehicle } = await serviceRole
      .from('vehicles')
      .select('vehicle_type, make, model, year, registration_number')
      .eq('rider_id', riderId)
      .eq('is_active', true)
      .limit(1)
      .single();

    // Get verification history
    const { data: history } = await serviceRole
      .from('rider_verification_history')
      .select(`
        id,
        old_status,
        new_status,
        changed_by,
        reason,
        created_at
      `)
      .eq('rider_id', riderId)
      .order('created_at', { ascending: false });

    // Get actor names for history
    const actorIds = [...new Set((history || []).map((h: any) => h.changed_by))];
    let actorNames: Record<string, string> = {};

    if (actorIds.length > 0) {
      const { data: actors } = await serviceRole
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds);

      if (actors) {
        actorNames = Object.fromEntries(
          actors.map((a: any) => [a.id, a.full_name || 'Unknown'])
        );
      }
    }

    return {
      id: rider.id,
      full_name: (rider.profiles as any)?.full_name || null,
      phone: (rider.profiles as any)?.phone || null,
      verification_status: rider.verification_status,
      verification_notes: rider.verification_notes,
      created_at: rider.created_at,
      profile: {
        role: (rider.profiles as any)?.role || 'rider',
        full_name: (rider.profiles as any)?.full_name || null,
        avatar_url: (rider.profiles as any)?.avatar_url || null,
      },
      documents: documents || [],
      vehicle: vehicle || null,
      verification_history: (history || []).map((h: any) => ({
        ...h,
        changed_by_name: actorNames[h.changed_by] || 'Unknown',
      })),
    };
  }

  /**
   * Approve or reject a rider's verification.
   */
  async verifyRider(
    adminUserId: string,
    riderId: string,
    action: 'approve' | 'reject',
    reason?: string,
    notes?: string
  ): Promise<{
    id: string;
    verification_status: string;
    verification_notes: string | null;
  }> {
    await this.verifyAdminAuth(adminUserId);

    // Prevent self-approval
    if (riderId === adminUserId) {
      throw new Error('Cannot verify your own rider profile');
    }

    // Validate rejection requires reason
    if (action === 'reject' && (!reason || reason.trim().length === 0)) {
      throw new Error('Rejection reason is required');
    }

    const serviceRole = await createServiceRoleClient();

    // Get current status
    const { data: current, error: fetchError } = await serviceRole
      .from('rider_profiles')
      .select('verification_status')
      .eq('id', riderId)
      .single();

    if (fetchError || !current) {
      throw new Error('Rider not found');
    }

    const oldStatus = current.verification_status;
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update rider verification status
    const { error: updateError } = await serviceRole
      .from('rider_profiles')
      .update({
        verification_status: newStatus,
        verification_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', riderId);

    if (updateError) {
      console.error('Failed to update rider verification:', updateError);
      throw new Error('Failed to update verification status');
    }

    // Record audit trail
    const { error: auditError } = await serviceRole
      .from('rider_verification_history')
      .insert({
        rider_id: riderId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: adminUserId,
        reason: action === 'reject' ? reason : notes || `Verification ${action}d`,
        metadata: notes ? { notes } : null,
      });

    if (auditError) {
      console.error('Failed to record audit trail:', auditError);
      // Don't throw — the verification succeeded, audit is secondary
    }

    return {
      id: riderId,
      verification_status: newStatus,
      verification_notes: notes || null,
    };
  }

  /**
   * Approve or reject an individual document.
   */
  async verifyDocument(
    adminUserId: string,
    docId: string,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ): Promise<{
    id: string;
    status: string;
    rejection_reason: string | null;
    reviewed_by: string;
    reviewed_at: string;
  }> {
    await this.verifyAdminAuth(adminUserId);

    // Validate rejection requires reason
    if (action === 'reject' && (!rejectionReason || rejectionReason.trim().length === 0)) {
      throw new Error('Rejection reason is required');
    }

    const serviceRole = await createServiceRoleClient();

    // Get current document
    const { data: doc, error: fetchError } = await serviceRole
      .from('rider_documents')
      .select('id, status, rider_id')
      .eq('id', docId)
      .single();

    if (fetchError || !doc) {
      throw new Error('Document not found');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update document
    const { error: updateError } = await serviceRole
      .from('rider_documents')
      .update({
        status: newStatus,
        rejection_reason: action === 'reject' ? rejectionReason : null,
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId);

    if (updateError) {
      console.error('Failed to update document:', updateError);
      throw new Error('Failed to update document status');
    }

    return {
      id: docId,
      status: newStatus,
      rejection_reason: action === 'reject' ? (rejectionReason || null) : null,
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    };
  }
}

export const adminService = new AdminService();
