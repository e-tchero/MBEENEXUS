import { createClient } from '@/lib/supabase/server';
import type { Address } from '@repo/shared/types';

export interface CreateAddressInput {
  label?: string;
  street_address: string;
  city: string;
  state: string;
  country?: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  is_default?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export class AddressService {
  async list(userId: string): Promise<Address[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getById(addressId: string, userId: string): Promise<Address | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async create(userId: string, input: CreateAddressInput): Promise<Address> {
    const supabase = await createClient();

    // If setting as default, clear other defaults first
    if (input.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({
        user_id: userId,
        label: input.label || null,
        street_address: input.street_address,
        city: input.city,
        state: input.state,
        country: input.country || 'Nigeria',
        postal_code: input.postal_code || null,
        latitude: input.latitude,
        longitude: input.longitude,
        is_default: input.is_default || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(
    addressId: string,
    userId: string,
    input: UpdateAddressInput
  ): Promise<Address> {
    const supabase = await createClient();

    // If setting as default, clear other defaults first
    if (input.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true)
        .neq('id', addressId);
    }

    const { data, error } = await supabase
      .from('addresses')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', addressId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(addressId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    // Check if address is referenced by any orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .or(
        `pickup_address_id.eq.${addressId},destination_address_id.eq.${addressId}`
      )
      .limit(1);

    if (orders && orders.length > 0) {
      throw new Error('Cannot delete address that is referenced by existing orders');
    }

    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async setDefault(addressId: string, userId: string): Promise<Address> {
    const supabase = await createClient();

    // Clear all defaults for this user
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('is_default', true);

    // Set new default
    const { data, error } = await supabase
      .from('addresses')
      .update({ is_default: true, updated_at: new Date().toISOString() })
      .eq('id', addressId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getDefault(userId: string): Promise<Address | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}

export const addressService = new AddressService();
