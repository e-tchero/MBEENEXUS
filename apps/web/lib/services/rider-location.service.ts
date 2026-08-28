import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// =============================================
// Configuration (loaded from platform_settings)
// =============================================

interface LocationConfig {
  minIntervalSeconds: number;
  minDistanceMeters: number;
  staleThresholdSeconds: number;
  maxSpeedKmh: number;
  maxAgeSeconds: number;
}

let cachedConfig: LocationConfig | null = null;
let configCacheTime = 0;
const CONFIG_CACHE_TTL = 60_000; // 1 minute

async function getLocationConfig(): Promise<LocationConfig> {
  const now = Date.now();
  if (cachedConfig && now - configCacheTime < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }

  const serviceRole = await createServiceRoleClient();
  const { data } = await serviceRole
    .from('platform_settings')
    .select('key, value')
    .eq('category', 'location');

  const settings: Record<string, unknown> = {};
  for (const row of data || []) {
    settings[row.key] = row.value;
  }

  cachedConfig = {
    minIntervalSeconds: (settings.location_update_min_interval_seconds as { seconds: number })?.seconds ?? 5,
    minDistanceMeters: (settings.location_update_min_distance_meters as { meters: number })?.meters ?? 10,
    staleThresholdSeconds: (settings.location_stale_threshold_seconds as { seconds: number })?.seconds ?? 60,
    maxSpeedKmh: (settings.location_max_speed_kmh as { kmh: number })?.kmh ?? 200,
    maxAgeSeconds: (settings.location_max_age_seconds as { seconds: number })?.seconds ?? 300,
  };
  configCacheTime = now;
  return cachedConfig;
}

// =============================================
// Validation
// =============================================

export interface LocationUpdateInput {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  recorded_at?: string;
}

export interface LocationUpdateResult {
  accepted: boolean;
  reason?: string;
  wroteHistorical: boolean;
  broadcast: boolean;
}

function haversineDistanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =============================================
// Main Service
// =============================================

export class RiderLocationService {
  /**
   * Process a GPS update from an authenticated rider.
   * Validates, throttles, persists, and broadcasts.
   */
  async updateLocation(
    riderId: string,
    input: LocationUpdateInput
  ): Promise<LocationUpdateResult> {
    const config = await getLocationConfig();
    const now = new Date();

    // 1. Validate timestamp
    const recordedAt = input.recorded_at ? new Date(input.recorded_at) : now;
    const ageSeconds = (now.getTime() - recordedAt.getTime()) / 1000;

    if (ageSeconds < 0) {
      return { accepted: false, reason: 'Future timestamp rejected', wroteHistorical: false, broadcast: false };
    }

    if (ageSeconds > config.maxAgeSeconds) {
      return { accepted: false, reason: `Update too old (${Math.round(ageSeconds)}s > ${config.maxAgeSeconds}s)`, wroteHistorical: false, broadcast: false };
    }

    // 2. Validate speed if provided
    if (input.speed !== undefined && input.speed > config.maxSpeedKmh) {
      return { accepted: false, reason: `Speed ${input.speed} km/h exceeds maximum ${config.maxSpeedKmh} km/h`, wroteHistorical: false, broadcast: false };
    }

    const serviceRole = await createServiceRoleClient();

    // 3. Get current location for throttle/distance checks
    const { data: currentLocation } = await serviceRole
      .from('rider_current_locations')
      .select('latitude, longitude, updated_at')
      .eq('rider_id', riderId)
      .single();

    // 4. Throttle check: skip if too recent
    if (currentLocation?.updated_at) {
      const lastUpdate = new Date(currentLocation.updated_at);
      const secondsSinceUpdate = (now.getTime() - lastUpdate.getTime()) / 1000;
      if (secondsSinceUpdate < config.minIntervalSeconds) {
        return { accepted: true, reason: 'Throttled (interval)', wroteHistorical: false, broadcast: false };
      }
    }

    // 5. Distance check: skip if movement too small
    if (currentLocation?.latitude != null && currentLocation?.longitude != null) {
      const distanceMeters = haversineDistanceMeters(
        currentLocation.latitude, currentLocation.longitude,
        input.latitude, input.longitude
      );
      if (distanceMeters < config.minDistanceMeters) {
        return { accepted: true, reason: 'Throttled (distance)', wroteHistorical: false, broadcast: false };
      }
    }

    // 6. Insert into rider_locations (trigger will upsert rider_current_locations)
    const { error: insertError } = await serviceRole
      .from('rider_locations')
      .insert({
        rider_id: riderId,
        latitude: input.latitude,
        longitude: input.longitude,
        location: `POINT(${input.longitude} ${input.latitude})`,
        heading: input.heading ?? null,
        speed: input.speed ?? null,
        accuracy: input.accuracy ?? null,
        recorded_at: recordedAt.toISOString(),
      });

    if (insertError) {
      logger.error('rider.location_insert_failed', { rider_id: riderId }, insertError instanceof Error ? insertError : undefined);
      return { accepted: false, reason: 'Database write failed', wroteHistorical: false, broadcast: false };
    }

    // 7. Update rider_profiles.last_location_update
    await serviceRole
      .from('rider_profiles')
      .update({ last_location_update: now.toISOString() })
      .eq('id', riderId);

    // 8. Check if rider has an active order and broadcast
    let broadcast = false;
    const { data: activeAssignment } = await serviceRole
      .from('rider_assignments')
      .select('order_id')
      .eq('rider_id', riderId)
      .in('status', ['accepted'])
      .limit(1)
      .single();

    if (activeAssignment?.order_id) {
      // Verify order is in an active tracking state
      const { data: order } = await serviceRole
        .from('orders')
        .select('status, customer_id')
        .eq('id', activeAssignment.order_id)
        .single();

      const trackingStates = [
        'rider_assigned', 'rider_en_route_to_pickup', 'arrived_at_pickup',
        'picked_up', 'in_transit', 'arrived_at_destination',
      ];

      if (order && trackingStates.includes(order.status)) {
        // Broadcast to delivery channel
        const channel = serviceRole.channel(`delivery:${activeAssignment.order_id}`);
        await channel.send({
          type: 'broadcast',
          event: 'rider-location',
          payload: {
            rider_id: riderId,
            latitude: input.latitude,
            longitude: input.longitude,
            heading: input.heading ?? null,
            speed: input.speed ?? null,
            accuracy: input.accuracy ?? null,
            recorded_at: recordedAt.toISOString(),
          },
        });
        broadcast = true;
      }
    }

    return { accepted: true, wroteHistorical: true, broadcast };
  }

  /**
   * Get a rider's current location.
   */
  async getCurrentLocation(riderId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rider_current_locations')
      .select('rider_id, latitude, longitude, heading, speed, accuracy, is_available, updated_at')
      .eq('rider_id', riderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  /**
   * Get location configuration.
   */
  async getConfig(): Promise<LocationConfig> {
    return getLocationConfig();
  }
}

export const riderLocationService = new RiderLocationService();
